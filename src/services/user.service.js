import prisma from '../../prisma/client.js';
import {
  BadRequestError,
  UserNotFoundError,
  InvalidNicknameError,
  PreferenceSaveError,
  InvalidPreferredAreaError,
  QRCodeError,
  InvalidExitRoleError,
  PreferenceNotFoundError,
} from '../errors/customErrors.js';
import QRCode from 'qrcode';

// 탈퇴(사용자 휴면 계정으로 전환)
export const deactivateUserService = async (userId) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'inactive',
      inactivedAt: new Date(),
    },
  });

  return {
    id: updatedUser.id.toString(),
    status: updatedUser.status,
    inactivedAt: updatedUser.inactivedAt,
  };
};

// 사장 탈퇴(바로 탈퇴 처리)
export const deleteMyAccountService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      roles: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  const hasOwnerRole = user.roles.some((r) => r.role === 'OWNER');

  if (!hasOwnerRole) {
    throw new InvalidExitRoleError('OWNER');
  }

  const deletedUser = await prisma.user.delete({
    where: { id: userId },
  });

  return {
    id: deletedUser.id.toString(),
    email: deletedUser.email,
  };
};
 
// 휴면 계정 활성화 
export const reactivateUserService = async (userId) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'active',
      inactivedAt: null,
    },
  });

  return {
    id: updatedUser.id.toString(),
    status: updatedUser.status,
    inactivedAt: updatedUser.inactivedAt,
  };
};
 
// 사용자 정보 조회 
export const getMyInfoService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phoneNumber: true,
      nickname: true,
      status: true,
      allowKakaoAlert: true,
      fcmToken: true,
      createdAt: true,
      updatedAt: true,
      inactivedAt: true,
    },
  });

  if (!user) throw new UserNotFoundError(userId);
  return { ...user, id: user.id };
};

// 닉네임 수정 
export const updateNicknameService = async (userId, nickname) => {
  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    throw new InvalidNicknameError(nickname);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { nickname: nickname.trim() },
    select: {
      id: true,
      nickname: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedUser.id.toString(),
    nickname: updatedUser.nickname,
    updatedAt: updatedUser.updatedAt,
  };
};

// 선호 키워드 설정 
export const updateUserPreferencesService = async (userId, preferredKeywords = []) => {
  const STORE_KEYWORDS = ['노트북', '1인석', '단체석', '주차 가능', '예약 가능', '와이파이 제공', '애견 동반', '24시간 운영'];
  const TAKEOUT_KEYWORDS = ['텀블러 할인', '포장 할인'];
  const MENU_KEYWORDS = ['비건', '저당/무가당', '글루텐프리', '디카페인'];

  // 유효 키워드만 필터링
  const allValidKeywords = [...STORE_KEYWORDS, ...TAKEOUT_KEYWORDS, ...MENU_KEYWORDS];
  const sanitized = preferredKeywords.filter((k) => allValidKeywords.includes(k));

  // Map 구조로 변환
  const preferredStore = Object.fromEntries(STORE_KEYWORDS.map((k) => [k, sanitized.includes(k)]));
  const preferredTakeout = Object.fromEntries(TAKEOUT_KEYWORDS.map((k) => [k, sanitized.includes(k)]));
  const preferredMenu = Object.fromEntries(MENU_KEYWORDS.map((k) => [k, sanitized.includes(k)]));

  try {
    const updated = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        preferredStore,
        preferredTakeout,
        preferredMenu,
      },
      create: {
        userId,
        preferredStore,
        preferredTakeout,
        preferredMenu,
      },
    });

    
    return {
      preferredStore: updated.preferredStore,
      preferredTakeout: updated.preferredTakeout,
      preferredMenu: updated.preferredMenu,
    };
  } catch (err) {
    throw new PreferenceSaveError('선호 키워드 저장 오류', err);
  }
};

// 선호 장소 저장 
export const updatePreferredAreaService = async (userId, preferredArea) => {
  if (!preferredArea || typeof preferredArea !== 'string' || preferredArea.trim() === '') {
    throw new InvalidPreferredAreaError(preferredArea);
  }

  const updated = await prisma.userPreference.upsert({
    where: { userId },
    update: { preferredArea: preferredArea.trim() },
    create: { userId, preferredArea: preferredArea.trim() },
  });

  return updated.preferredArea;
};

export const updateKakaoAlertService = async (userId, allowKakaoAlert) => {
  if (typeof allowKakaoAlert !== 'boolean') {
    throw new BadRequestError('allowKakaoAlert 값은 true 또는 false여야 합니다.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { allowKakaoAlert },
    select: {
      id: true,
      nickname: true,
      allowKakaoAlert: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedUser.id.toString(),
    nickname: updatedUser.nickname,
    allowKakaoAlert: updatedUser.allowKakaoAlert,
    updatedAt: updatedUser.updatedAt,
  };
};
 
// 사용자 fcmToken 저장 
export const updateFcmTokenService = async (userId, fcmToken) => {
  if (!fcmToken || typeof fcmToken !== 'string') {
    throw new BadRequestError('유효한 fcmToken이 필요합니다.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
  });
};

// 전화번호 인증 토큰 확인 후 저장 
export const savePhoneNumberAfterVerificationService = async (userId, phoneNumber) => {
  if (!userId || !phoneNumber) {
    throw new BadRequestError();
  }

  const parsedUserId = Number(userId);

   // 전화번호가 이미 있는지 확인
  const existing = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  //  다른 사용자면 에러
  if (existing && existing.id !== parsedUserId) {
    throw new DuplicateUserError({ phoneNumber });
  }

  // 동일한 사용자라면 가능하게
  const updatedUser = await prisma.user.update({
    where: { id: parsedUserId },
    data: { phoneNumber },
  });

  return {
    message: '전화번호 등록 완료',
    userId: updatedUser.id.toString(),
    phoneNumber: updatedUser.phoneNumber,
  };
};

// 약관 동의 상태 저장 
export const saveUserAgreementsService = async (userId, agreementData) => {
  const {
    termsAgreed,
    privacyPolicyAgreed,
    marketingAgreed,
    locationPermission,
  } = agreementData;

  if (
    typeof termsAgreed !== 'boolean' ||
    typeof privacyPolicyAgreed !== 'boolean' ||
    typeof marketingAgreed !== 'boolean' ||
    typeof locationPermission !== 'boolean'
  ) {
    throw new BadRequestError('모든 동의 항목은 boolean 타입이어야 합니다.');
  }

  const updated = await prisma.userAgreement.upsert({
    where: { userId: Number(userId) },
    update: {
      termsAgreed,
      privacyPolicyAgreed,
      marketingAgreed,
      locationPermission,
      agreedAt: new Date(),
    },
    create: {
      userId: Number(userId),
      termsAgreed,
      privacyPolicyAgreed,
      marketingAgreed,
      locationPermission,
      agreedAt: new Date(),
    },
  });

  return {
    message: '약관 동의 저장 완료',
    agreement: {
      ...updated,
      userId: updated.userId.toString(),
    },
  };
};

export const generateQRCode = async (userId) => {
  const qrData = `https://loopy://user/${userId}`;

  try {
    const based64Image = await QRCode.toDataURL(qrData, {
      type: 'image/png',
      margin: 2,
      width: 200,
    });

    return based64Image;
  } catch (err) {
    throw new QRCodeError('QR 코드 생성 실패: ');
  }
};

export const getUserPreferencesService = async (userId) => {
  try {
    const preferences = await prisma.userPreference.findUnique({
      where: { userId },
      select: {
        preferredStore: true,
        preferredTakeout: true,
        preferredMenu: true
      }
    });

    if (!preferences) {
      throw new PreferenceNotFoundError('사용자의 선호 키워드가 없습니다.');
    }

    return {
      preferredStore: preferences.preferredStore || {},
      preferredTakeout: preferences.preferredTakeout || {},
      preferredMenu: preferences.preferredMenu || {}
    };
  } catch (err) {
    throw err;
  }
};