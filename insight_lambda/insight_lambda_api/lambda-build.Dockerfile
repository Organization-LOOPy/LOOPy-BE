# Amazon Linux 2 + Python 3.10 
FROM public.ecr.aws/lambda/python:3.10

# 작업 디렉토리
WORKDIR /opt/app

# 필요한 파일 복사
COPY requirements.txt .

# pip 최신화 + 패키지 설치 
RUN pip install --upgrade pip \
    && pip install --upgrade wheel \
    && pip install -r requirements.txt --target .

# ZIP 압축 준비
CMD zip -r9 /opt/app/lambda_package.zip .
