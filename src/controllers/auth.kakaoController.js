import {
  handleKakaoRedirectService,
  handleKakaoLinkCallbackService,
} from '../services/auth.kakao.service.js';

export const handleKakaoRedirect = async (req, res, next) => {
  try {
    const { code, token, role } = req.query;
    const result = await handleKakaoRedirectService(code, token, role);
    return res.redirect(result.redirectUrl);
  } catch (err) {
    next(err);
  }
};

export const handleKakaoLinkCallback = async (req, res, next) => {
  try {
    const result = await handleKakaoLinkCallbackService(req.query, req.user?.id);
    return res.redirect(result.redirectUrl);
  } catch (err) {
    next(err);
  }
};