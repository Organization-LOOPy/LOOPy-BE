# LOOPy-BE (Back-End)

고객의 루틴에 나의 커피를 더하다

## 🫂 1. 팀원 정보
| 이름 | 역할 |
|------|------|
| **장현서** | 고객: 챌린지 & 스탬프 / 사장: 고객 조회, 스탬프 적립, 혜택 사용 |
| **김건희** | 고객: 카페 & 탐색  |
| **궁유진** | 고객: 챌린지 & 스탬프 / 사장: 고객 조회, 스탬프 적립, 혜택 사용 |
| **이나경** | 고객: 챌린지 & 스탬프 / 사장: 고객 조회, 스탬프 적립, 혜택 사용 |

## 📌 2. 기술 스택 (Tech Stack)

- **언어**: Node.js, python
- **프레임워크**: Express.js
- **DB ORM**: Prisma
- **데이터베이스**: MySQL, Qdrant
- **인증**: JWT, Kakao OAuth
- **기타**: 환경 변수 관리 (`dotenv`, `cross-env`), openAI

---

## 📂 3. 프로젝트 구조

```
LOOPY-BE/
├── 📁 .github/              # GitHub 설정 파일
├── 📁 docs/                 # 프로젝트 문서
├── 📁 logs/                 # 로그 파일
├── 📁 node_modules/         # npm 의존성 패키지
├── 📁 prisma/               # Prisma ORM 설정 및 스키마
├── 📁 scripts/              # 빌드/배포 스크립트
├── 📁 src/                  # 소스 코드 메인 디렉토리
│   ├── 📁 config/           # 설정 파일
│   ├── 📁 controllers/      # API 컨트롤러
│   ├── 📁 credentials/      # 인증 관련 파일
│   ├── 📁 errors/           # 에러 처리
│   ├── 📁 middlewares/      # Express 미들웨어
│   ├── 📁 repositories/     # 데이터 액세스 레이어
│   ├── 📁 routes/           # API 라우트 정의
│   ├── 📁 services/         # 비즈니스 로직
│   ├── 📁 utils/            # 유틸리티 함수
│   └── 📄 app.js           # Express 앱 설정
├── 📄 .dockerignore        # Docker 빌드 시 제외 파일
├── 📄 .env                 # 환경 변수 (개발용)
├── 📄 .gitignore           # Git 추적 제외 파일
├── 📄 docker-compose.yml   # Docker Compose 설정
├── 📄 Dockerfile           # Docker 이미지 빌드 설정
├── 📄 nodemon.json         # Nodemon 개발 서버 설정
├── 📄 package.json         # npm 패키지 정보 및 스크립트
├── 📄 pnpm-lock.yaml       # PNPM 잠금 파일
├── 📄 README.md            # 프로젝트 설명서
├── 📄 requirements.txt     # Python 의존성 (필요시)
└── 📄 server.js            # 서버 진입점
```

## 📚 4. 프로젝트 아키텍처

---

# 🚀 프로젝트 세팅 가이드

## 의존성 설치

프로젝트를 시작하기 전에 필요한 패키지들을 설치

```bash
# 패키지 의존성 설치
pnpm install

# 새로운 패키지 추가
pnpm add 패키지명

# 패키지 제거
pnpm remove 패키지명
```

## 개발 서버 실행

```bash
# 개발환경 실행 (자동 재시작 Nodemon)
pnpm dev

# 배포환경 실행
pnpm prod
```

## 환경변수 세팅

루트 디렉토리에 환경변수 파일을 생성

> 환경변수 파일 내용은 노션 server에서 확인 가능합니다.

```
.env    # 전체 환경 변수 (공통된 환경 변수 설정)
```

## Prisma 세팅

데이터베이스 설정을 위한 Prisma 초기 설정

```bash
# Prisma를 사용하기 위한 초기 설정 생성
npx prisma init

# schema.prisma 파일의 설정을 실제 데이터베이스에 반영
# (데이터베이스 구조 변경 또는 새로운 테이블 생성)
npx prisma db push

# Prisma Client를 생성하거나 업데이트
# schema.prisma 파일 변경 시 실행하여 최신 상태로 유지
npx prisma generate
```

---

- 스키마 파일을 수정한 후에는 반드시 `pnpm prisma generate`를 실행하세요.
- 개발 중에는 `pnpm dev` 명령어를 사용하면 파일 변경 시 자동으로 서버가 재시작됩니다.
- 환경변수 파일은 `.gitignore`에 포함되어 있으니 개별적으로 생성해야 합니다.

---

## 커밋 규칙:

    - **feat** - 새로운 기능 추가
    - **fix** - 버그 수정
    - **refactor** - 코드 리팩토링 (기능 변경 없이 구조 개선)
    - **style** - 코드 포맷팅, 세미콜론 누락 등 (비즈니스 로직에 영향이 없는 변경)
    - **test** - 테스트 추가 또는 수정
    - **docs** - 문서 추가 및 수정
    - **chore** - 빌드 작업, 패키지 관리 등
    - PR 올리면 디스코드에 노티하기 (봇 생기면 봇으로 노티 확인)

---

## 📌 logger사용법

console.log 대신 사용, 개발/배포 환경마다 다르게 로그를 관리하기 위해 사용

배포(prod)환경에서는 로그레벨 info로 /logs폴더에 파일형태로 저장됨

개발(dev)환경에서는 로그레벨 debug로 콘솔에 로그남김, morgan으로 api요청 로그 기록

```
  logger.info('This is an info message');  // info 로그
  logger.debug('This is a debug message');  // debug 로그
  logger.error('This is an error message');  // error 로그
  logger.warn('This is a warning message');  // warn 로그
```

**morganMiddleware** - HTTP요청 로그 기록
info: GET /user 304 - - 1.382 ms 이런 형식으로 로그 기록

---

### 서버 관리 명령어

```bash
# EC2 SSH 접속 후
cd /opt/loopy-be

# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs loopy-app -f

# 수동 재시작 
docker restart loopy-app

# 수동 배포 
git pull origin main
docker stop loopy-app
docker rm loopy-app
docker build -t loopy-app
docker run -d -p 3000:3000 --name loopy-app --env-file .env your-app

```

### 모니터링

```bash
# 실시간 로그 모니터링
docker logs -f loopy-app

# 시스템 리소스 확인
docker stats loopy-app

# 헬스체크
curl http://localhost:3000/health

