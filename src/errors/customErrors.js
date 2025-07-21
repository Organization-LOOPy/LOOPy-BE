export class CustomError extends Error {
  constructor(reason, errorCode = "UNKNOWN", data = null) {
    super(reason);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.data = data;
  }
}

export class BadRequestError extends CustomError {
  constructor(message = '잘못된 요청입니다.', data = null) {
    super(message, 'BAD_REQUEST', data);
  }
}

export class DuplicateEmailError extends CustomError {
  constructor(data) {
    super("이미 존재하는 이메일입니다.", "U001", data);
  }
}

export class MissingFieldsError extends CustomError {
  constructor(missingFields = []) {
    super('필수 입력 항목이 누락되었습니다.', 'MISSING_FIELDS', { missingFields });
  }
}

export class UserNotFoundError extends CustomError {
  constructor(email) {
    super('등록되지 않은 이메일입니다.', 'USER_NOT_FOUND', { email });
  }
}

export class InvalidPasswordError extends CustomError {
  constructor() {
    super('비밀번호가 일치하지 않습니다.', 'INVALID_PASSWORD');
  }
}

export class KakaoLoginError extends CustomError {
  constructor(message = '카카오 로그인에 실패했습니다.', data = null) {
    super(message, 'KAKAO_LOGIN_FAILED', data);
  }
}

export class KakaoAlreadyLinkedError extends CustomError {
  constructor() {
    super('이미 다른 계정에 연결된 카카오 계정입니다.', 'KAKAO_ALREADY_LINKED');
  }
}

export class KakaoCodeMissingError extends CustomError {
  constructor() {
    super('카카오 인증 코드가 누락되었습니다.', 'KAKAO_CODE_MISSING');
  }
}

export class InvalidNicknameError extends CustomError {
  constructor(nickname) {
    super('유효한 닉네임을 입력해주세요.', 'INVALID_NICKNAME', { nickname });
  }
}

export class PreferenceSaveError extends CustomError {
  constructor(reason = '선호 키워드 저장 실패', data = null) {
    super(reason, 'PREFERENCE_SAVE_FAILED', data);
  }
}

export class InternalServerError extends CustomError {
  constructor(message = '서버 오류', data = null) {
    super(message, 'INTERNAL_ERROR', data);
  }
}

export class InvalidPreferredAreaError extends CustomError {
  constructor(value) {
    super('유효한 동네명을 입력해주세요.', 'INVALID_PREFERRED_AREA', { value });
  }
}

export class BookmarkAlreadyExistsError extends CustomError {
  constructor(data) {
    super('이미 북마크한 카페입니다.', 'BM001', data);
  }
}

export class BookmarkNotFoundError extends CustomError {
  constructor(data) {
    super('해당 북마크를 찾을 수 없습니다.', 'BM002', data);
  }
}

export class CafeNotFoundError extends CustomError {
  constructor(data) {
    super('존재하지 않는 카페입니다.', 'BM003', data);
  }
}

export default CustomError;
