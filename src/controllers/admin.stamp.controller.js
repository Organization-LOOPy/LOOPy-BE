import { uploadStampImagesService } from '../services/admin.stamp.service.js';
import { createStampPolicy } from '../services/admin.stamp.service.js';
export const uploadStampImages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: '이미지 파일이 없습니다.' });
    }

    const imageUrls = await uploadStampImagesService(userId, files);

    res.status(201).json({
      message: '스탬프 이미지 업로드 성공',
      data: imageUrls,
    });
  } catch (err) {
    next(err);
  }
};

export const postStampPolicy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const policyData = req.body;

    const created = await createStampPolicy(userId, policyData);

    res.status(201).json({
      message: '스탬프 정책이 등록되었습니다.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};