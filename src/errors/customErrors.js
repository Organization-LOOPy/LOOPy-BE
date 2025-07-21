export class CustomError extends Error {
  constructor(reason, errorCode = "UNKNOWN", statusCode = 400, data = null) {
    super(reason);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
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
    super("카페 ID가 누락되었습니다.", "C001", 400);
  }
}

export class AlreadyIssuedCouponError extends CustomError {
  constructor(couponTemplateId, userId) {
    super(
      `이미 발급받은 쿠폰입니다. 쿠폰 템플릿 ID: ${couponTemplateId}, 사용자 ID: ${userId}`,
      "C002",
      409,
      { couponTemplateId, userId }
    );
  }
}

export class NotAuthenticatedError extends CustomError {
  constructor() {
    super("인증되지 않은 사용자입니다. 로그인이 필요합니다.", "C004", 401);
  }
}

export class CafePhotosNotFoundError extends CustomError {
  constructor(cafeId) {
    super(`카페 ID: ${cafeId}에 대한 사진이 없습니다.`, "C005", 404, {
      cafeId,
    });
  }
}

export class MenuNotFoundError extends CustomError {
  constructor(cafeId) {
    super(`카페 ID: ${cafeId}에 대한 메뉴가 없습니다.`, "C006", 404, {
      cafeId,
    });
  }
}

export class FailedIssuingCouponError extends CustomError {
  constructor(couponTemplateId, userId) {
    super(
      `카페 ID: ${couponTemplateId}의 쿠폰을 유저 ID: ${userId}에게 발급하는 데 실패했습니다.`,
      "C007",
      500,
      { couponTemplateId, userId }
    );
  }
}

export class InvalidParameterError extends CustomError {
  constructor(message) {
    super(message || "잘못된 파라미터입니다.", "C008", 400);
  }
}

export class DuplicateCouponError extends CustomError {
  constructor(message) {
    super(message || "이미 발급받은 쿠폰입니다.", "C009", 409);
  }
}
//url 앞자리로 에러코드 쓰기, error파일 안에 다 올리기(도메인 별로)
export default CustomError;
