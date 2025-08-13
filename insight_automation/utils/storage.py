import boto3
import os
import json
from botocore.exceptions import ClientError

# S3 클라이언트 생성
def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def save_report_to_s3(cafe_id: int, period: str, payload: dict, overwrite: bool = False):
    """
    보고서 데이터를 JSON 형태로 S3에 업로드합니다.
    :param cafe_id: 카페 ID
    :param period: 보고서 기간
    :param payload: 업로드할 데이터 (dict)
    :param overwrite: 파일 덮어쓰기 여부
    """
    s3 = get_s3_client()
    bucket = os.getenv("INSIGHT_BUCKET", "my-insight-bucket")
    key = f"insights/{cafe_id}/{period}.json"

    if not overwrite:
        try:
            s3.head_object(Bucket=bucket, Key=key)
            print(f"❌ File already exists: s3://{bucket}/{key}")
            return
        except ClientError:
            pass

    try:
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(payload, ensure_ascii=False),
            ContentType="application/json"
        )
        print(f"✅ Uploaded report to s3://{bucket}/{key}")
    except ClientError as e:
        print(f"❌ Failed to upload report to S3: {e}")
        raise

def download_file_from_s3(bucket: str, key: str, download_path: str):
    """
    S3에서 파일을 다운로드합니다.
    :param bucket: S3 버킷명
    :param key: S3 객체 키
    :param download_path: 저장할 로컬 경로
    """
    s3 = get_s3_client()
    try:
        s3.download_file(bucket, key, download_path)
        print(f"✅ Downloaded s3://{bucket}/{key} to {download_path}")
    except ClientError as e:
        print(f"❌ Failed to download from S3: {e}")
        raise

def delete_file_from_s3(bucket: str, key: str):
    """
    S3에서 파일을 삭제합니다.
    :param bucket: S3 버킷명
    :param key: S3 객체 키
    """
    s3 = get_s3_client()
    try:
        s3.delete_object(Bucket=bucket, Key=key)
        print(f"🗑 Deleted s3://{bucket}/{key}")
    except ClientError as e:
        print(f"❌ Failed to delete from S3: {e}")
        raise
