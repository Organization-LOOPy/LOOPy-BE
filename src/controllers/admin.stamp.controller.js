import { uploadStampImagesService } from '../services/admin.stamp.service.js';
import { 
  createStampPolicy,
  updateStampPolicy,  
  getMyStampPolicy, 
} from '../services/admin.stamp.service.js';

export const uploadStampImages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const imageUrls = await uploadStampImagesService(userId, req.files);

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

export const patchStampPolicy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await updateStampPolicy(userId, req.body);

    res.status(200).json({
      message: '스탬프 정책이 수정되었습니다.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const getStampPolicy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const policy = await getMyStampPolicy(userId);

    res.status(200).json({
      message: '스탬프 정책 조회 성공',
      data: policy,
    });
  } catch (err) {
    next(err);
  }
};