import {
  handleKakaoRedirectService,
  handleKakaoLinkCallbackService,
} from '../services/auth.kakao.service.js';

export const handleKakaoRedirect = async (req, res, next) => {
  try {
    const redirectUrl = await handleKakaoRedirectService(req.query);
    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
};

export const handleKakaoLinkCallback = async (req, res, next) => {
  try {
    const redirectUrl = await handleKakaoLinkCallbackService(req.query, req.user?.id);
    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
};