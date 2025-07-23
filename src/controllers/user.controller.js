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
  saveUserAgreementsService
} from '../services/user.service.js';

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await deactivateUserService(req.user.id);
    return res.success({ message: '계정이 휴면 상태로 전환되었습니다.', user });
  } catch (err) {
    next(err);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await reactivateUserService(req.user.id);
    return res.success({ message: '계정이 다시 활성화되었습니다.', user });
  } catch (err) {
    next(err);
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
      message: '닉네임이 성공적으로 변경되었습니다.',
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserPreferences = async (req, res, next) => {
  try {
    const result = await updateUserPreferencesService(req.user.id, req.body.preferredKeywords);
    return res.success({
      message: '선호 키워드가 저장되었습니다.',
      preferredKeywords: result,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePreferredArea = async (req, res, next) => {
  try {
    const result = await updatePreferredAreaService(req.user.id, req.body.preferredArea);
    return res.success({
      message: '자주 가는 동네가 저장되었습니다.',
      preferredArea: result,
    });
  } catch (err) {
    next(err);
  }
};

export const updateKakaoAlert = async (req, res, next) => {
  try {
    const user = await updateKakaoAlertService(req.user.id, req.body.allowKakaoAlert);
    return res.success({
      message: '카카오 알림 수신 설정이 변경되었습니다.',
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateFcmToken = async (req, res, next) => {
  try {
    await updateFcmTokenService(req.user.id, req.body.fcmToken);
    return res.success({ message: 'fcmToken이 저장되었습니다.' });
  } catch (err) {
    next(err);
  }
};

export const savePhoneNumberAfterVerification = async (req, res, next) => {
  try {
    const result = await savePhoneNumberAfterVerificationService(req.user.id, req.body.idToken);
    return res.success(result);
  } catch (err) {
    next(err);
  }
};

export const saveUserAgreements = async (req, res, next) => {
  try {
    const result = await saveUserAgreementsService(req.user.id, req.body);
    return res.success(result);
  } catch (err) {
    next(err);
  }
};
