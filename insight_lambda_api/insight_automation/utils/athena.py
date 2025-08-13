from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone, date
from pyathena import connect
import os

KST = timezone(timedelta(hours=9))
ATHENA_DB = os.getenv("ATHENA_DB", "cafe_analytics")
def _conn():
    return connect(
        s3_staging_dir=os.getenv("ATHENA_STAGING_DIR"),
        region_name=os.getenv("AWS_REGION"),
        work_group=os.getenv("ATHENA_WORKGROUP", "primary"),
    )

def prev_month_range(ref_dt: Optional[datetime] = None) -> Tuple[date, date]:
    ref_dt = ref_dt or datetime.now(KST)
    y, m = ref_dt.year, ref_dt.month
    y, m = (y-1, 12) if m == 1 else (y, m-1)
    start = datetime(y, m, 1, tzinfo=KST).date()
    end = (datetime(y if m < 12 else y, m+1 if m < 12 else 1, 1, tzinfo=KST).date()
           - timedelta(days=1))
    return start, end

def fetch_monthly_metrics(cafe_id: int, ref_dt: Optional[datetime] = None) -> Dict[str, Any]:
    start, end = prev_month_range(ref_dt) 
    start_dt = start.strftime("%Y-%m-%d")
    end_dt = end.strftime("%Y-%m-%d")
    cafe_id = int(cafe_id)

    q = f"""
    WITH visits AS (
      SELECT user_id, DATE(visited_at) AS v_date
      FROM {ATHENA_DB}.visits_table
      WHERE cafe_id = {cafe_id}
        AND dt BETWEEN '{start_dt}' AND '{end_dt}'     
    ),
    first_visit AS (
      SELECT user_id, MIN(DATE(visited_at)) AS first_date
      FROM {ATHENA_DB}.visits_table
      WHERE cafe_id = {cafe_id}
      GROUP BY user_id
    ),
    month_users AS (
      SELECT DISTINCT user_id FROM visits
    ),
    new_users AS (
      SELECT mu.user_id
      FROM month_users mu
      JOIN first_visit fv ON mu.user_id = fv.user_id
      WHERE fv.first_date BETWEEN DATE '{start_dt}' AND DATE '{end_dt}'
    ),
    user_counts AS (
      SELECT user_id, COUNT(*) AS c FROM visits GROUP BY user_id
    ),
    returning_users AS (
      SELECT user_id FROM user_counts WHERE c >= 2
    ),
    coupon_use AS (
      SELECT COUNT(*) AS used
      FROM  {ATHENA_DB}.coupons
      WHERE cafe_id = {cafe_id}
        AND dt BETWEEN '{start_dt}' AND '{end_dt}'   
        AND used_at IS NOT NULL
    ),
    coupon_issued AS (
      SELECT COUNT(*) AS issued
      FROM  {ATHENA_DB}.coupons
      WHERE cafe_id = {cafe_id}
        AND dt BETWEEN '{start_dt}' AND '{end_dt}'   
    ),
    chg AS (
      SELECT COUNT(*) AS joined
      FROM  {ATHENA_DB}.challenge_participants
      WHERE cafe_id = {cafe_id}
        AND dt BETWEEN '{start_dt}' AND '{end_dt}' 
    )
    SELECT
      (SELECT COUNT(*) FROM visits) AS visits,
      (SELECT COUNT(*) FROM new_users) AS new_customers,
      (
        SELECT CAST(COUNT(*) AS DOUBLE)
               / NULLIF((SELECT COUNT(*) FROM month_users), 0)
        FROM returning_users
      ) AS revisit_rate,                             
      (
        SELECT CAST(cu.used AS DOUBLE) / NULLIF(ci.issued, 0)
        FROM coupon_use cu CROSS JOIN coupon_issued ci
      ) AS coupon_use_rate,
      (SELECT joined FROM chg) AS challenge_join;
    """

    with _conn().cursor() as cur:
        cur.execute(q)
        row = cur.fetchone()

    return {
        "month": f"{start.year}-{start.month:02d}",
        "kpis": {
            "visits": int(row[0] or 0),
            "newCustomers": int(row[1] or 0),
            "revisitRate": float(row[2] or 0.0),
            "couponUseRate": float(row[3] or 0.0),
            "challengeJoin": int(row[4] or 0),
        },
    }