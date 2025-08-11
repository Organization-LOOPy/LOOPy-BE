import { 
  createStampPolicy,
  updateStampPolicy,  
  getMyStampPolicy, 
  uploadStampImagesService,
  deleteStampImageService,
  getMyStampImagesService 
} from '../services/admin.stamp.service.js';

export const uploadStampImages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: '이미지 파일이 필요합니다.' });
    }

    const result = await uploadStampImagesService(userId, files);

    return res.status(201).json({
      message: '스탬프 이미지 업로드 성공',
      data: result,
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

export const deleteStampImage = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const imageId = Number(req.params.imageId);

    if (!Number.isInteger(imageId)) {
      return res.status(400).json({ message: '유효하지 않은 imageId' });
    }

    const ok = await deleteStampImageService(userId, imageId);
    return res.status(200).json({
      message: '스탬프 이미지 삭제 성공',
      success: ok,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyStampImages = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const images = await getMyStampImagesService(userId);
    return res.status(200).json({
      message: '스탬프 이미지 조회 성공',
      data: images,
    });
  } catch (err) {
    next(err);
  }
};