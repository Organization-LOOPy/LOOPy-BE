import express from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

import {
  deactivateUser,
  reactivateUser,
  getMyInfo,
  updateNickname,
  updateUserPreferences,
  updatePreferredArea,
  updateKakaoAlert,
  updateFcmToken,
  savePhoneNumberAfterVerification,
  saveUserAgreements
} from '../controllers/user.controller.js';

import {
  addBookmark,
  getBookmarkedCafes,
  removeBookmark,
} from '../controllers/user.bookmark.controller.js';


const router = express.Router();

router.use(authenticateJWT);

// 사용자 계정
router.patch('/me/inactive', deactivateUser);
router.patch('/me/activate', reactivateUser);
router.get('/me', getMyInfo);
router.patch('/me/nickname', updateNickname);

// 사용자 설정
router.patch('/me/preferences', updateUserPreferences);
router.patch('/me/preferred-area', updatePreferredArea);
router.patch('/me/kakao-alert', updateKakaoAlert);
router.patch('/me/fcm-token', updateFcmToken);

// 전화번호 저장
router.post('/me/verify-phone', savePhoneNumberAfterVerification);

// 약관 동의
router.post('/me/agreements', saveUserAgreements);

// 북마크
router.get('/me/bookmarks', getBookmarkedCafes);
router.post('/me/bookmarks', addBookmark);
router.delete('/me/bookmarks/:cafeId', removeBookmark);

export default router;