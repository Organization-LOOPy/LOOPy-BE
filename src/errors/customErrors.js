export class CustomError extends Error {
  constructor(reason, errorCode = "UNKNOWN", statusCode = 400, data = null) {
    super(reason);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.data = data;
  }
}

// 일반 (공통 에러)
export class BadRequestError extends CustomError {
  constructor(message = "잘못된 요청입니다.", data = null) {
    super(message, "BAD_REQUEST", 400, data);
  }
}

export class MissingFieldsError extends CustomError {
  constructor(missingFields = []) {
    super("필수 입력 항목이 누락되었습니다.", "MISSING_FIELDS", 400, {
      missingFields,
    });
  }
}

export class InternalServerError extends CustomError {
  constructor(message = "서버 오류", data = null) {
    super(message, "INTERNAL_ERROR", 500, data);
  }
}

// 사용자 인증 관련
export class KakaoAccessTokenMissingError extends CustomError {
  constructor() {
    super('카카오 access_token 응답 누락', 'KAKAO_ACCESS_TOKEN_MISSING', 500);
  }
}

export class KakaoUserIdMissingError extends CustomError {
  constructor() {
    super('카카오 사용자 정보에 ID가 없습니다', 'KAKAO_USER_ID_MISSING', 500);
  }
}

export class TokenMissingError extends CustomError {
  constructor() {
    super("인증 토큰이 누락되었습니다.", "TOKEN_MISSING", 401);
  }
}

export class DuplicateEmailError extends CustomError {
  constructor(data) {
    super("이미 존재하는 이메일입니다.", "U001", 409, data);
  }
}

export class EmailNotFoundError extends CustomError {
  constructor(email) {
    super("등록되지 않은 이메일입니다.", "USER_NOT_FOUND", 404, { email });
  }
}

export class UserNotFoundError extends CustomError {
  constructor(userId) {
    super("등록되지 않은 사용자입니다.", "USER_NOT_FOUND", 404, { userid });
  }
}


export class InvalidPasswordError extends CustomError {
  constructor() {
    super("비밀번호가 일치하지 않습니다.", "INVALID_PASSWORD", 401);
  }
}

export class KakaoLoginError extends CustomError {
  constructor(message = "카카오 로그인에 실패했습니다.", data = null) {
    super(message, "KAKAO_LOGIN_FAILED", 500, data);
  }
}

export class KakaoAlreadyLinkedError extends CustomError {
  constructor() {
    super(
      "이미 다른 계정에 연결된 카카오 계정입니다.",
      "KAKAO_ALREADY_LINKED",
      409
    );
  }
}

export class MissingRoleError extends CustomError {
  constructor() {
    super('역할 정보가 누락되었습니다.', 'ROLE_MISSING', 400);
  }
}

export class KakaoCodeMissingError extends CustomError {
  constructor() {
    super("카카오 인증 코드가 누락되었습니다.", "KAKAO_CODE_MISSING", 400);
  }
}

export class InvalidRoleError extends CustomError {
  constructor(role) {
    super(`잘못된 역할 요청입니다: ${role}`, "INVALID_ROLE", 400, { role });
  }
}

export class RoleNotGrantedError extends CustomError {
  constructor(role) {
    super(`해당 사용자는 ${role} 역할이 등록되어 있지 않습니다.`, "ROLE_NOT_GRANTED", 403, { role });
  }
}


// 마이페이지
export class InvalidNicknameError extends CustomError {
  constructor(nickname) {
    super("유효한 닉네임을 입력해주세요.", "INVALID_NICKNAME", 400, {
      nickname,
    });
  }
}

export class InvalidPreferredAreaError extends CustomError {
  constructor(value) {
    super("유효한 동네명을 입력해주세요.", "INVALID_PREFERRED_AREA", 400, {
      value,
    });
  }
}

export class PreferenceSaveError extends CustomError {
  constructor(reason = "선호 키워드 저장 실패", data = null) {
    super(reason, "PREFERENCE_SAVE_FAILED", 500, data);
  }
}

// 북마크
export class BookmarkAlreadyExistsError extends CustomError {
  constructor(data) {
    super("이미 북마크한 카페입니다.", "BM001", 409, data);
  }
}

export class BookmarkNotFoundError extends CustomError {
  constructor(data) {
    super("해당 북마크를 찾을 수 없습니다.", "BM002", 404, data);
  }
}

export class CafeNotFoundError extends CustomError {
  constructor(data) {
    super("존재하지 않는 카페입니다.", "BM003", 404, data);
  }
}

// 포인트
export class PointTransactionNotFoundError extends CustomError {
  constructor(data = null) {
    super("포인트 내역이 존재하지 않습니다.", "POINT_TX_NOT_FOUND", 404, data);
  }
}

export class InvalidPointAmountError extends CustomError {
  constructor(point) {
    super("잘못된 포인트 값입니다.", "INVALID_POINT_AMOUNT", 400, { point });
  }
}

export class NotEnoughPointError extends CustomError {
  constructor(currentPoint, requiredPoint) {
    super("포인트가 부족합니다.", "NOT_ENOUGH_POINT", 400, {
      currentPoint,
      requiredPoint,
    });
  }
}

//카페 조회
export class MissingSearchQuery extends Error {
  constructor(message = "검색어가 비어 있습니다.") {
    super(message);
    this.name = "MissingSearchQuery";
    this.statusCode = 400;
  }
}

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

//검색 라우터
export class MissingUserCoordinate extends CustomError {
  constructor(message) {
    super(message || "사용자 주소가 누락되었습니다", "S001", 400);
  }
}
//챌린지
export class ChallengeNotFoundError extends CustomError {
  constructor(challengeId) {
    super(
      `챌린지 ID ${challengeId}에 해당하는 챌린지를 찾을 수 없습니다.`,
      "CH001",
      404,
      { challengeId }
    );
  }
}
//
export class StampbookNotFoundError extends CustomError {
  constructor(message = "Not Found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

// 리뷰 관련

export class InvalidReviewTitleError extends CustomError {
  constructor(title) {
    super("제목은 최소 20자 이상이어야 합니다.", "R001", 400, { title });
  }
}

export class InvalidReviewContentError extends CustomError {
  constructor(content) {
    super("본문은 최소 500자 이상이어야 합니다.", "R002", 400, { content });
  }
}

export class ReviewNotFoundError extends CustomError {
  constructor(reviewId) {
    super(`ID ${reviewId}에 해당하는 리뷰가 존재하지 않습니다.`, "R003", 404, {
      reviewId,
    });
  }
}

export class ForbiddenReviewAccessError extends CustomError {
  constructor(userId, reviewOwnerId) {
    super("본인의 리뷰만 수정/삭제할 수 있습니다.", "R004", 403, {
      userId,
      reviewOwnerId,
    });
  }
}

export class MissingReviewFieldsError extends CustomError {
  constructor(missingFields = []) {
    super("제목과 본문을 모두 입력해주세요.", "R005", 400, { missingFields });
  }
}

export class InvalidImageTypeError extends CustomError {
  constructor(mimetype) {
    super(
      `이미지 파일 형식만 업로드할 수 있습니다. (받은 타입: ${mimetype})`,
      400,
      "R006"
    );
  }
}

export class TooManyImagesError extends CustomError {
  constructor(count) {
  super(
      `이미지는 최대 5개까지만 업로드할 수 있습니다. (받은 수량: ${count}개)`,
      400,
      "R007"
    );
  }
}

export class NoActiveStampError extends CustomError {
  constructor(userId, cafeId) {
    super(
    "스탬프 적립을 시작하고 리뷰를 작성해보세요!",
      "R008",
      403,
      { userId, cafeId } // ← 이 부분
    );
  }
}

// 스탬프북 관련
export class StampNotEligibleError extends CustomError {
  constructor(userId, cafeId) {
    super(
      `스탬프 목표를 아직 달성하지 않았거나 이미 완료된 상태입니다. userId: ${userId}, cafeId: ${cafeId}`,
      "ST001",
      400,
      { userId, cafeId }
    );
  }
}

// 알림 관련
export class NotificationNotFoundError extends CustomError {
  constructor(notificationId) {
    super(
      `해당 알림을 찾을 수 없습니다. notificationId: ${notificationId}`,
      "N001",
      404,
      { notificationId }
    );
  }
}


// 사장용 api 커스텀 에러

// 카페 관리
// 1. 기본 정보 등록 
export class CafeNotExistError extends CustomError {
  constructor(cafeId) {
    super(`ID ${cafeId}에 해당하는 카페를 찾을 수 없습니다.`, "CAFE_NOT_FOUND", 404, { cafeId });
  }
}

export class UnauthCafeAccessError extends CustomError {
  constructor(userId, cafeId, photoId = null) {
    const reason = photoId
      ? `사용자(userId: ${userId})는 카페 ID ${cafeId}의 이미지(photoId: ${photoId})에 대한 접근 권한이 없습니다.`
      : `사용자(userId: ${userId})는 카페 ID ${cafeId}에 대한 접근 권한이 없습니다.`;

    super(reason, "CAFE_UNAUTHORIZED", 403, { userId, cafeId, photoId });
  }
}

export class CafeAlreadyExistError extends CustomError {
  constructor(userId) {
    super(`이미 카페를 등록한 사용자입니다. (userId: ${userId})`, "CAFE_ALREADY_EXIST", 400, { userId });
  }
}

export class InvalidCafeBasicInfoError extends CustomError {
  constructor(missingFields = []) {
    super(
      `카페 기본 정보에 누락된 필드가 있습니다: ${missingFields.join(', ')}`,
      "CAFE_BASIC_INFO_INVALID",
      400,
      { missingFields }
    );
  }
}

// 2. 운영 정보 등록
export class InvalidBusinessHoursError extends CustomError {
  constructor(detail) {
    super(
      `운영시간 정보가 잘못되었습니다: ${detail}`,
      "BUSINESS_HOURS_INVALID",
      400,
      { detail }
    );
  }
}

// 3. 메뉴 등록
export class DuplicateMenuNameError extends CustomError {
  constructor(duplicateNames) {
    super(
      `중복된 메뉴 이름이 존재합니다: ${duplicateNames.join(', ')}`,
      "MENU_NAME_DUPLICATE",
      409,
      { duplicateNames }
    );
  }
}

export class InvalidMenuDataError extends CustomError {
  constructor(detail) {
    super(
      `메뉴 정보가 잘못되었습니다: ${detail}`,
      "MENU_INVALID",
      400,
      { detail }
    );
  }
}

export class RepresentativeLimitExceededError extends CustomError {
  constructor() {
    super(
      '대표 메뉴는 최대 2개까지만 등록할 수 있습니다.',
      'REPRESENTATIVE_LIMIT_EXCEEDED',
      400
    );
  }
}

// 사진 등록
export class InvalidPhotoUrlsError extends CustomError {
  constructor(reason) {
    super(
      `유효하지 않은 사진 URL 목록입니다: ${reason}`,
      "PHOTO_URLS_INVALID",
      400,
      { reason }
    );
  }
}

// 4. 등록 완료
export class CafeAlreadyCompletedError extends CustomError {
  constructor(cafeId) {
    super(
      `카페 ID ${cafeId}는 이미 등록이 완료된 상태입니다.`,
      "CAFE_ALREADY_COMPLETED",
      400,
      { cafeId }
    );
  }
}

export class CafePhotoNotFoundError extends CustomError {
  constructor(photoId) {
    super(
      `해당 ID의 카페 이미지를 찾을 수 없습니다. (photoId: ${photoId})`,
      "CAFE_PHOTO_NOT_FOUND",
      404,
      { photoId }
    );
  }
}

export class UnauthorizedPhotoDeleteError extends CustomError {
  constructor(userId, cafeId) {
    super(
      `사용자(userId: ${userId})는 해당 카페(cafeId: ${cafeId})의 이미지를 삭제할 권한이 없습니다.`,
      "UNAUTHORIZED_PHOTO_DELETE",
      403,
      { userId, cafeId }
    );
  }
}

export class QRCodeError extends CustomError {
  constructor(reason){
    super(
      `QR 코드 생성 실패`,
      "QR_CODE_NOT_COMPLETED",
      400,
      { reason },
    );
  }
}

export class QRNotFoundError extends CustomError {
  constructor(reason){
    super(
      `QR 코드가 존재하지 않습니다.`,
      "QR_CODE_NOT_FOUND",
      404,
      { reason },
    );
  }
}

//url 앞자리로 에러코드 쓰기, error파일 안에 다 올리기(도메인 별로)
export default CustomError;
