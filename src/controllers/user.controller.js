import {
  deactivateUserService,
  reactivateUserService,
  getMyInfoService,
  updateNicknameService,
  updateUserPreferencesService,
  updatePreferredAreaService,
  updateKakaoAlertService,
  updateFcmTokenService,
  savePhoneNumberAfterVerificationService,
  makeOwnerCafe,
  deleteMyAccountService,
  getUserPreferencesService,
  getPreferredAreaService 
} from "../services/user.service.js";
import { QRNotFoundError, NotFoundPhoneError } from "../errors/customErrors.js";
import { verifyPhoneNumber } from "../services/firebase.service.js";
import { userPreferenceEmbedding } from "../services/nlp.search.js";

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await deactivateUserService(req.user.id);
    return res.success({ message: "계정이 휴면 상태로 전환되었습니다.", user });
  } catch (err) {
    next(err);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await reactivateUserService(req.user.id);
    return res.success({ message: "계정이 다시 활성화되었습니다.", user });
  } catch (err) {
    next(err);
  }
};

export const deleteMyAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await deleteMyAccountService(userId);

    return res.status(200).json({
      resultType: "SUCCESS",
      message: "회원 탈퇴가 완료되었습니다.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyInfo = async (req, res, next) => {
  try {
    const user = await getMyInfoService(req.user.id);
    return res.success({ user });
  } catch (err) {
    next(err);
  }
};

export const updateNickname = async (req, res, next) => {
  try {
    const user = await updateNicknameService(req.user.id, req.body.nickname);
    return res.success({
      message: "닉네임이 성공적으로 변경되었습니다.",
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserPreferences = async (req, res, next) => {
  try {
    const result = await updateUserPreferencesService(
      req.user.id,
      req.body.preferredKeywords
    );
    const userId = req.user.id;
    await userPreferenceEmbedding({
      preferredStore: result.preferredStore,
      preferredTakeout: result.preferredTakeout,
      preferredMenu: result.preferredMenu,
      userId: req.user.id,
    });

    return res.success({
      message: "선호 키워드가 저장되었습니다.",
      storeFilters: result.preferredStore,
      takeOutFilters: result.preferredTakeout,
      menuFilters: result.preferredMenu,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePreferredArea = async (req, res, next) => {
  try {
    const result = await updatePreferredAreaService(
      req.user.id,
      req.body.preferredArea
    );
    return res.success({
      message: "자주 가는 동네가 저장되었습니다.",
      preferredArea: result,
    });
  } catch (err) {
    next(err);
  }
};

export const updateKakaoAlert = async (req, res, next) => {
  try {
    const user = await updateKakaoAlertService(
      req.user.id,
      req.body.allowKakaoAlert
    );
    return res.success({
      message: "카카오 알림 수신 설정이 변경되었습니다.",
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateFcmToken = async (req, res, next) => {
  try {
    await updateFcmTokenService(req.user.id, req.body.fcmToken);
    return res.success({ message: "fcmToken이 저장되었습니다." });
  } catch (err) {
    next(err);
  }
};

export const savePhoneNumberAfterVerification = async (req, res, next) => {
  try {
    const { idToken, userId } = req.body;

    if (!idToken || !userId) {
      throw new BadRequestError("idToken 또는 userId가 필요합니다.");
    }

    const phoneNumber = await verifyPhoneNumber(idToken);

    const result = await savePhoneNumberAfterVerificationService(
      userId,
      phoneNumber
    );

    return res.success(result);
  } catch (err) {
    next(err);
  }
};

export const notifyPhoneVerification = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new NotFoundPhoneError();
    }

    return res.success({
      message: "전화번호 인증 확인됨",
      phoneNumber,
    });
  } catch (err) {
    next(err);
  }
};

export const saveUserAgreements = async (req, res, next) => {
  try {
console.log("🔥 req.user:", req.user);

    const result = await makeOwnerCafe(req.user.id, req.body, req.user.role);
    return res.success(result);
  } catch (err) {
    next(err);
  }
};

export const getUserQrCode = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        qrCode: true,
      },
    });

    if (!user?.qrCode) {
      throw new QRNotFoundError();
    }

    res.status(200).json({
      resultType: "SUCCESS",
      success: {
        userId: user.id,
        qrCodeImage: user.qrCode,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const preferences = await getUserPreferencesService(userId);

    res.status(200).json({
      message: '선호 키워드 조회 성공',
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

export const getPreferredAreaController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const preferredArea = await getPreferredAreaService(userId);

    res.status(200).json({
      message: "선호 지역 조회 성공",
      data: { preferredArea },
    });
  } catch (error) {
    next(error);
  }
};