export class CustomError extends Error {
  constructor(reason, errorCode = "UNKNOWN", data = null) {
    super(reason);
    this.errorCode = errorCode;
    this.data = data;
  }
}

export class DuplicateEmailError extends CustomError {
  constructor(data) {
    super("이미 존재하는 이메일입니다.", "U001", data);
  }
}

//카페 조회
export class MissingCafeIdError extends CustomError {
  constructor() {
    super("카페 ID가 누락되었습니다.", "C001");
  }
}

export class CafeNotFoundError extends CustomError {
  constructor(cafeId) {
    super(`카페 ID: ${cafeId}를 찾을 수 없습니다.`, "C002", { cafeId });
  }
}

export class CouponNotFoundError extends CustomError {
  constructor(cafeId, userId) {
    super(
      `카페 ID: ${cafeId}와 유저 ID: ${userId}에 해당하는 쿠폰을 찾을 수 없습니다.`,
      "C003",
      { cafeId, userId }
    );
  }
}

export class MissingUserObjectError extends CustomError {
  constructor() {
    super("유저 객체가 누락되었습니다.", "C004");
  }
}
//url 앞자리로 에러코드 쓰기, error파일 안에 다 올리기(도메인 별로)
export default CustomError;
