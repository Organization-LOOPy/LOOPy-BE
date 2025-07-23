import express from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { reactivateUser, updateUserPreferences, updatePreferredArea,
    deactivateUser, getMyInfo, updateNickname, updateKakaoAlert,
    updateFcmToken  
 } from '../controllers/user.controller.js';
import {getBookmarkedCafes, addBookmark, removeBookmark } from '../controllers/user.bookmark.controller.js'
import { getMyChallengeList } from '../controllers/challenge.controller.js';

const router = express.Router();

router.patch('/me/inactive', authenticateJWT, deactivateUser);
router.patch('/me/activate', authenticateJWT, reactivateUser);
router.get('/me', authenticateJWT, getMyInfo);
router.patch('/me/nickname', authenticateJWT, updateNickname);
router.patch('/me/preferences', authenticateJWT, updateUserPreferences);
router.patch('/me/preferred-area', authenticateJWT, updatePreferredArea);
router.get('/me/bookmarks', authenticateJWT, getBookmarkedCafes);
router.post('/me/bookmarks', authenticateJWT, addBookmark);
router.delete('/me/bookmarks/:cafeId', authenticateJWT, removeBookmark);
router.patch('/me/kakao-alert', authenticateJWT, updateKakaoAlert);
router.patch('/me/fcm-token', authenticateJWT, updateFcmToken);

router.get('/me/challenges', authenticateJWT, getMyChallengeList);

export default router;
