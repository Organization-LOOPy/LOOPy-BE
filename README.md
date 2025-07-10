# LOOPy-BE (Back-End)
고객의 루틴에 나의 커피를 더하다


---
## 커밋 규칙:
    - **feat** - 새로운 기능 추가
    - **fix** - 버그 수정
    - **refactor** - 코드 리팩토링 (기능 변경 없이 구조 개선)
    - **style** - 코드 포맷팅, 세미콜론 누락 등 (비즈니스 로직에 영향이 없는 변경)
    - **test** - 테스트 추가 또는 수정
    - **docs** - 문서 추가 및 수정
    - **chore** - 빌드 작업, 패키지 관리 등
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

  info: GET /user 304 - - 1.382 ms   이런 형식으로 로그 기록
  ## 📌 기술 스택 (Tech Stack)
- **언어**: Node.js
- **프레임워크**: Express.js
- **DB ORM**: Prisma 
- **데이터베이스**: MySQL
- **인증**: JWT, Kakao OAuth
- **기타**: 환경 변수 관리 (`dotenv`, `cross-env`)


---
## 📂 프로젝트 구조 (간략화)

```
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
```


---
## 자동 포맷 (Prettier 기본 설정)

팀원 모두 VSCode에 Prettier 확장 설치

→ 저장 시 자동 포맷 되도록 설정

.prettierrc (루트에 생성)

```
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2 
}
```
