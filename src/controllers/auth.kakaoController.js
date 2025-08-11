import {
  handleKakaoRedirectService,
  handleKakaoLinkCallbackService,
} from '../services/auth.kakao.service.js';

export const handleKakaoRedirect = async (req, res, next) => {
  try {
    const { code, token } = req.query;
    const result = await handleKakaoRedirectService(code, token);
    return res.redirect(result.redirectUrl);
  } catch (err) {
    next(err);
  }
};

export const handleKakaoLinkCallback = async (req, res, next) => {
  try {
    const result = await handleKakaoLinkCallbackService(req.query.code, req.user?.id);
    return res.redirect(result.redirectUrl);
  } catch (err) {
    next(err);
  }
};