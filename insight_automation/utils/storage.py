import boto3
import os
from botocore.exceptions import ClientError

# S3 클라이언트 생성
def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

def save_report_to_s3(file_path: str, bucket: str, key: str):
    """
    로컬 파일을 S3 버킷에 업로드합니다.
    :param file_path: 로컬 파일 경로
    :param bucket: S3 버킷명
    :param key: S3 객체 키 (저장될 경로/파일명)
    """
    s3 = get_s3_client()
    try:
        s3.upload_file(file_path, bucket, key)
        print(f"✅ Uploaded {file_path} to s3://{bucket}/{key}")
    except ClientError as e:
        print(f"❌ Failed to upload {file_path} to S3: {e}")
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
