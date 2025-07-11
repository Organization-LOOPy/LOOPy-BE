# LOOPy-BE (Back-End)

고객의 루틴에 나의 커피를 더하다

🚀 프로젝트 세팅 가이드

## 의존성 설치

프로젝트를 시작하기 전에 필요한 패키지들을 설치

# 패키지 의존성 설치
pnpm install

# 새로운 패키지 추가
pnpm add 패키지명

# 패키지 제거
pnpm remove 패키지명
개발 서버 실행

# 개발환경 실행 (자동 재시작 Nodemon)
pnpm dev

# 배포환경 실행
pnpm prod
환경변수 세팅

루트 디렉토리에 환경변수 파일을 생성

환경변수 파일 내용은 노션 server에서 확인 가능합니다.
.env    # 전체 환경 변수 (공통된 환경 변수 설정)
Prisma 세팅

데이터베이스 설정을 위한 Prisma 초기 설정

# Prisma를 사용하기 위한 초기 설정 생성
pnpm prisma init

# schema.prisma 파일의 설정을 실제 데이터베이스에 반영
pnpm prisma db push

# Prisma Client를 생성하거나 업데이트
pnpm prisma generate
스키마 파일을 수정한 후에는 반드시 pnpm prisma generate를 실행하세요.
개발 중에는 pnpm dev 명령어를 사용하면 파일 변경 시 자동으로 서버가 재시작됩니다.
환경변수 파일은 .gitignore에 포함되어 있으니 개별적으로 생성해야 합니다.
커밋 규칙

feat – 새로운 기능 추가
fix – 버그 수정
refactor – 코드 리팩토링 (기능 변경 없이 구조 개선)
style – 코드 포맷팅, 세미콜론 누락 등 (비즈니스 로직에 영향이 없는 변경)
test – 테스트 추가 또는 수정
docs – 문서 추가 및 수정
chore – 빌드 작업, 패키지 관리 등
PR 올리면 디스코드에 노티하기 (봇 생기면 봇으로 노티 확인)
📌 logger 사용법

console.log 대신 사용하며, 개발/배포 환경에 따라 다르게 로그를 관리합니다.

배포 (prod): 로그 레벨 info, /logs 폴더에 파일 형태로 저장
개발 (dev): 로그 레벨 debug, 콘솔 출력 + morgan으로 API 요청 로그 기록
예시:

logger.info('This is an info message');
logger.debug('This is a debug message');
logger.error('This is an error message');
logger.warn('This is a warning message');
morganMiddleware - HTTP 요청 로그 예시:

info: GET /user 304 - - 1.382 ms
📌 기술 스택 (Tech Stack)

언어: Node.js
프레임워크: Express.js
DB ORM: Prisma
데이터베이스: MySQL
인증: JWT, Kakao OAuth
기타: 환경 변수 관리 (dotenv, cross-env)
📂 프로젝트 구조 (간략화)

📦 src/
┣ 📂controllers/         # 요청 처리 (req/res)
┣ 📂services/            # 비즈니스 로직
┣ 📂models/              # DB 모델 정의 (Mongoose/Sequelize 등)
┣ 📂routes/              # 라우터 정의 (REST API endpoint 분기)
┣ 📂middlewares/         # 인증, 에러 핸들링, 로깅 등
┣ 📂utils/               # 공통 함수, 헬퍼
┣ 📂config/              # 환경 설정 (DB, dotenv 등)
┣ 📂loaders/             # 서버, DB 등 초기 설정 (선택)
┗ 📜app.js               # 앱 초기화 (Express 세팅)
자동 포맷 (Prettier 기본 설정)

팀원 모두 VSCode에 Prettier 확장 설치
→ 저장 시 자동 포맷 되도록 설정

.prettierrc (루트에 생성):

{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2
}