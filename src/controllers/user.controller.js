import prisma from '../../prisma/client.js';
import {
  UserNotFoundError,
  InvalidNicknameError,
  PreferenceSaveError,
  InternalServerError,
  InvalidPreferredAreaError, 
  BadRequestError 
} from '../errors/customErrors.js';

// 휴면 전환
export const deactivateUser = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        status: 'inactive',
        inactivedAt: new Date(),
      },
    });

    return res.success({
      message: '계정이 휴면 상태로 전환되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        status: updatedUser.status,
        inactivedAt: updatedUser.inactivedAt,
      },
    });
  } catch (err) {
    return next(new InternalServerError('휴면 전환 오류', err));
  }
};

// 휴면 해제
export const reactivateUser = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        status: 'active',
        inactivedAt: null,
      },
    });

    return res.success({
      message: '계정이 다시 활성화되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        status: updatedUser.status,
        inactivedAt: updatedUser.inactivedAt,
      },
    });
  } catch (err) {
    return next(new InternalServerError('계정 복구 오류', err));
  }
};

// 내 정보 조회
export const getMyInfo = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        nickname: true,
        role: true,
        status: true,
        allowKakaoAlert: true,
        profileImageUrl: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true,
        inactivedAt: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError(req.user.id);
    }

    return res.success({
      user: {
        ...user,
        id: user.id.toString(),
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 닉네임 수정
export const updateNickname = async (req, res, next) => {
  const userId = req.user.id;
  const { nickname } = req.body;

  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return next(new InvalidNicknameError(nickname));
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { nickname: nickname.trim() },
      select: {
        id: true,
        nickname: true,
        updatedAt: true,
      },
    });

    return res.success({
      message: '닉네임이 성공적으로 변경되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        nickname: updatedUser.nickname,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (err) {
    return next(new InternalServerError('닉네임 수정 오류', err));
  }
};

// 선호 키워드 저장
export const updateUserPreferences = async (req, res, next) => {
  const userId = req.user.id;
  const { preferredKeywords } = req.body;

  const VALID_KEYWORDS = [
    "노트북", "1인석", "단체석", "주차 가능", "예약 가능",
    "와이파이 제공", "애견 동반", "24시간 운영", "텀블러 할인",
    "포장 할인", "비건", "저당/무가당", "글루텐프리", "디카페인"
  ];

  const sanitized = (preferredKeywords || []).filter(k =>
    VALID_KEYWORDS.includes(k)
  );

  try {
    const updated = await prisma.userPreference.upsert({
      where: { userId },
      update: { preferredKeywords: sanitized },
      create: { userId, preferredKeywords: sanitized },
    });

    return res.success({
      message: '선호 키워드가 저장되었습니다.',
      preferredKeywords: updated.preferredKeywords,
    });
  } catch (err) {
    return next(new PreferenceSaveError('키워드 저장 오류', err));
  }
};

// 자주 가는 동네 저장
export const updatePreferredArea = async (req, res, next) => {
  const userId = req.user.id;
  const { preferredArea } = req.body;

  if (!preferredArea || typeof preferredArea !== 'string' || preferredArea.trim() === '') {
    return next(new InvalidPreferredAreaError(preferredArea));
  }

  try {
    const updated = await prisma.userPreference.upsert({
      where: { userId },
      update: { preferredArea: preferredArea.trim() },
      create: { userId, preferredArea: preferredArea.trim() },
    });

    return res.success({
      message: '자주 가는 동네가 저장되었습니다.',
      preferredArea: updated.preferredArea,
    });
  } catch (err) {
    return next(new InternalServerError('preferredArea 저장 실패', err));
  }
};

// 카카오 알림설정 수정
export const updateKakaoAlert = async (req, res, next) => {
  const userId = req.user.id;
  const { allowKakaoAlert } = req.body;

  if (typeof allowKakaoAlert !== 'boolean') {
    return next(new BadRequestError('allowKakaoAlert 값은 true 또는 false여야 합니다.'));
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { allowKakaoAlert },
      select: {
        id: true,
        nickname: true,
        allowKakaoAlert: true,
        updatedAt: true,
      },
    });

    return res.success({
      message: '카카오 알림 수신 설정이 변경되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        nickname: updatedUser.nickname,
        allowKakaoAlert: updatedUser.allowKakaoAlert,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (err) {
    return next(new InternalServerError('카카오 알림 설정 변경 실패', err));
  }
};

// fcmToken 저장
export const updateFcmToken = async (req, res, next) => {
  const userId = req.user.id;
  const { fcmToken } = req.body;

  if (!fcmToken || typeof fcmToken !== 'string') {
    return next(new BadRequestError('유효한 fcmToken이 필요합니다.'));
  }

  try {
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { fcmToken },
    });

    return res.success({ message: 'fcmToken이 저장되었습니다.' });
  } catch (err) {
    return next(new InternalServerError('fcmToken 저장 실패', err));
  }
};