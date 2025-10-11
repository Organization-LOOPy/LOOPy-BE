import 'dotenv/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import mysql from 'mysql2/promise';
import { Parser } from '@json2csv/plainjs';
import zlib from 'zlib';

// ===== 필수 ENV 체크 =====
const requiredEnv = [
  'AWS_REGION',
  'ANALYTICS_BUCKET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

for (const key of requiredEnv) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    console.error(`[ENV] Missing ${key}. Check your .env`);
    process.exit(1);
  }
}

const region = process.env.AWS_REGION;
const analyticsBucket = process.env.ANALYTICS_BUCKET;
const exportWindowMin = Number(process.env.EXPORT_WINDOW_MIN || 60);   // 기본 60분
const exportOverlapMin = Number(process.env.EXPORT_OVERLAP_MIN || 5);  // 기본 5분(간극 방지)
const useGzip = String(process.env.USE_GZIP || 'true').toLowerCase() === 'true';
const stateS3Key = process.env.STATE_S3_KEY || 'analytics/_state/export_state.json';

const s3 = new S3Client({ region });

const toKstDateKey = (d = new Date()) => {
  // KST(UTC+9) 기준 YYYY-MM-DD
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

// S3 state helpers
async function getState() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: analyticsBucket, Key: stateS3Key }));
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch {
    return { tables: {} };
  }
}
async function putState(state) {
  await s3.send(new PutObjectCommand({
    Bucket: analyticsBucket,
    Key: stateS3Key,
    Body: JSON.stringify(state),
    ContentType: 'application/json'
  }));
}

// 업로드 공통(필요 시 gzip)
async function putCsvToS3(key, rows) {
  if (!rows?.length) {
    console.log(`[SKIP] ${key} (no rows)`);
    return false;
  }
  const csv = new Parser().parse(rows);
  if (useGzip) {
    const gz = zlib.gzipSync(csv);
    await s3.send(new PutObjectCommand({
      Bucket: analyticsBucket,
      Key: key + '.gz',
      Body: gz,
      ContentEncoding: 'gzip',
      ContentType: 'text/csv'
    }));
    console.log(`[PUT] s3://${analyticsBucket}/${key}.gz (${rows.length} rows, gzip)`);
  } else {
    await s3.send(new PutObjectCommand({
      Bucket: analyticsBucket,
      Key: key,
      Body: csv,
      ContentType: 'text/csv'
    }));
    console.log(`[PUT] s3://${analyticsBucket}/${key} (${rows.length} rows)`);
  }
  return true;
}

// 증분 범위 계산(워터마크 + 오버랩)
function getWindowStartIso(lastWatermarkIso, now = new Date()) {
  if (lastWatermarkIso) {
    const last = new Date(lastWatermarkIso);
    const start = new Date(last.getTime() - exportOverlapMin * 60 * 1000);
    return start.toISOString().slice(0, 19).replace('T', ' ');
  }
  // 초기엔 최근 exportWindowMin만
  const start = new Date(now.getTime() - exportWindowMin * 60 * 1000);
  return start.toISOString().slice(0, 19).replace('T', ' ');
}

const safeGetTime = (value) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const normalizeExpiresAt = (value) => {
  if (!value || value === 'null' || value === 'undefined') {
    return '만료일 없음';
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? value : '만료일 없음';
};

// 각 테이블 증분 + 업로드
export async function exportTable(conn, cfg, state) {
  const tableState = state.tables[cfg.name] || {};
  const windowStart = getWindowStartIso(tableState.lastWatermark);

  // 증분 윈도우 조건
  const where = `
    WHERE (${cfg.createdAt} >= ? OR ${cfg.updatedAt} >= ?)
  `;

  const sql = `
    SELECT
      ${cfg.select}
    FROM ${cfg.from}
    ${cfg.join || ''}
    ${where}
    ORDER BY ${cfg.orderBy || `${cfg.updatedAt} ASC`}
  `;
  const params = [windowStart, windowStart];

  const [rows] = await conn.execute(sql, params);
  if (!rows.length) {
    console.log(`[SKIP] ${cfg.name} (no new rows since ${windowStart})`);
    return false;
  }

    // 쿠폰 테이블이라면 expires_at 컬럼만 변환
  if (
    cfg.name === 'coupon_templates' ||
    cfg.s3Prefix === 'coupon_templates' ||
    cfg.name === 'user_coupons' ||
    cfg.s3Prefix === 'user_coupons'
  ) {
    for (const row of rows) {
      if ('expiresAt' in row) {
        row.expiresAt = normalizeExpiresAt(row.expiresAt);
      }
    }
  }

  // dt는 KST 기준 일자 파티션
  const dt = toKstDateKey();
  const now = Date.now();
  const key = `analytics/${cfg.s3Prefix}/dt=${dt}/${cfg.s3Prefix}_${now}.csv`;

  // 변환된 rows로 업로드
  const uploaded = await putCsvToS3(key, rows);

  // 워터마크 계산
  if (uploaded) {
    let maxIso = tableState.lastWatermark || '1970-01-01 00:00:00';

    for (const r of rows) {
      const ca = safeGetTime(r[cfg.createdAtAlias]);
      const ua = safeGetTime(r[cfg.updatedAtAlias]);
      const m = Math.max(
        ca ?? Number.NEGATIVE_INFINITY,
        ua ?? Number.NEGATIVE_INFINITY
      );

      if (Number.isFinite(m) && m > new Date(maxIso).getTime()) {
        maxIso = new Date(m).toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    state.tables[cfg.name] = { lastWatermark: maxIso };
  }

  return uploaded;
}

export async function exportIncremental() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z'
  });

  const state = await getState();
  let changed = false;

  try {
    // === 테이블 구성(지표에 필요한 최소 컬럼만) ===
    const tables = [
      {
        name: 'orders',
        from: 'orders',
        join: '',
        // 필요한 컬럼만 추출(지표: 신규/재방문/매출)
        select: [
          'id',
          'user_id AS userId',
          'cafe_id AS cafeId',
          'amount',
          'status',
          'created_at AS createdAt',
          'updated_at AS updatedAt'
        ].join(', '),
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        createdAtAlias: 'createdAt',
        updatedAtAlias: 'updatedAt',
        s3Prefix: 'orders'
      },
      {
        name: 'stamps',
        from: 'stamps',
        join: '',
        // 지표에 필요한 최소 필드
        select: [
          'id',
          'user_id AS userId',
          'cafe_id AS cafeId',
          'action AS action',
          'count AS countValue',
          'created_at AS createdAt',
          'updated_at AS updatedAt'
        ].join(', '),
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        createdAtAlias: 'createdAt',
        updatedAtAlias: 'updatedAt',
        s3Prefix: 'stamps'
      },
      {
        name: 'user_coupons',
        from: 'user_coupons uc',
        join: 'JOIN coupon_templates ct ON ct.id = uc.template_id',
        select: [
          'uc.id AS userCouponId',
          'uc.template_id AS templateId',
          'ct.cafe_id AS cafeId',
          'ct.expires_at AS expiresAt',
          'uc.issued_at AS issuedAt',
          'uc.redeemed_at AS redeemedAt',
          // 워터마크 계산용(열 이름 alias 고정)
          'uc.created_at AS createdAt',
          'uc.updated_at AS updatedAt'
        ].join(', '),
        createdAt: 'uc.created_at',
        updatedAt: 'uc.updated_at',
        createdAtAlias: 'createdAt',
        updatedAtAlias: 'updatedAt',
        s3Prefix: 'user_coupons'
      },
      {
        name: 'challenge_participants',
        from: 'challenge_participants cp',
        join: 'JOIN challenges ch ON ch.id = cp.challenge_id',
        select: [
          'cp.challenge_id AS challengeId',
          'cp.user_id AS userId',
          'ch.cafe_id AS cafeId',
          'cp.joined_at AS joinedAt',
          'cp.completed_at AS completedAt',
          // 워터마크 계산용
          'cp.created_at AS createdAt',
          'cp.updated_at AS updatedAt'
        ].join(', '),
        createdAt: 'cp.created_at',
        updatedAt: 'cp.updated_at',
        createdAtAlias: 'createdAt',
        updatedAtAlias: 'updatedAt',
        s3Prefix: 'challenge_participants'
      }
    ];

    for (const cfg of tables) {
      const uploaded = await exportTable(conn, cfg, state);
      changed = changed || uploaded;
    }

    if (changed) {
      await putState(state);
      console.log(`[STATE] Updated: s3://${analyticsBucket}/${stateS3Key}`);
    } else {
      console.log('[STATE] No change. State not updated.');
    }

    console.log('[DONE] Export finished');
  } catch (err) {
    console.error('[ERROR] Export failed:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

// 단독 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  exportIncremental().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}
