import { S3Client, PutObjectCommand,DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from 'crypto';
import path from 'path';

const region = process.env.AWS_REGION || 'ap-northeast-2';
const bucket = process.env.AWS_S3_BUCKET;
const cloudFrontUrl = process.env.CLOUDFRONT_URL?.replace(/\/+$/, '') || null;

const s3 = new S3Client({
  region
});

// 간단 MIME 화이트리스트
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const buildS3Url = (key) => `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
const buildPublicUrl = (key) => (cloudFrontUrl ? `${cloudFrontUrl}/${key}` : buildS3Url(key));

const getS3KeyFromUrl = (fileUrl) => {
  const s3Base = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (fileUrl.startsWith(s3Base)) {
    return decodeURIComponent(fileUrl.slice(s3Base.length));
  }
  if (cloudFrontUrl && fileUrl.startsWith(`${cloudFrontUrl}/`)) {
    return decodeURIComponent(fileUrl.slice(cloudFrontUrl.length + 1));
  }
  try {
    const u = new URL(fileUrl);
    const base = `${u.origin}${u.pathname}`;
    if (base.startsWith(s3Base)) return decodeURIComponent(base.slice(s3Base.length));
    if (cloudFrontUrl && base.startsWith(`${cloudFrontUrl}/`)) {
      return decodeURIComponent(base.slice(cloudFrontUrl.length + 1));
    }
  } catch (_) {}
  throw new Error('Unsupported URL format for deletion');
};

// 원하는 폴더명 지정 가능 (stamps/, menus/, reviews/...)
/**
 * @param {Express.Multer.File} file - multer로 받은 단일 파일 객체
 * @param {string} folder - S3에 저장할 폴더명 (예: 'stamps', 'reviews')
 * @returns {string}
 */
export const uploadToS3 = async (file, folder) => {
  if (!file) throw new Error('File is required');
  if (!folder) throw new Error('Folder is required');

  if (!allowedMime.has(file.mimetype)) {
    throw new Error(`Unsupported content type: ${file.mimetype}`);
  }

  const orig = file.originalname || 'upload.bin';
  const ext = (path.extname(orig) || '').toLowerCase() || '.bin';
  const safeName = `${crypto.randomUUID()}${ext}`;
  const key = `${folder.replace(/\/+$/, '')}/${safeName}`;

  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(put);
  return buildPublicUrl(key);
};

export const deleteFromS3 = async (fileUrl) => {
  if (!fileUrl) return;
  const key = getS3KeyFromUrl(fileUrl); 
  // const cloudFrontBaseUrl = process.env.CLOUDFRONT_URL;
  // const location = `${cloudFrontBaseUrl}/${fileKey}`;
  const del = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3.send(del);
};