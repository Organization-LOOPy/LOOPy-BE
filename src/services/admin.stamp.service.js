import prisma from '../../prisma/client.js';
import { uploadToS3 } from '../utils/s3.js';
import { 
  CafeNotFoundError, 
  InvalidStampPolicyError,
  StampImageLimitExceededError, 
  NoStampImageError,
  StampPolicyNotFoundError,
} from '../errors/customErrors.js';

// 스탬프 사진 등록
export const uploadStampImagesService = async (userId, files) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });

  if (!cafe) throw new CafeNotFoundError();

  const existing = await prisma.stampImage.count({ where: { cafeId: cafe.id } });
  if (existing + files.length > 2) {
    throw new StampImageLimitExceededError();
  }

  if (!files || files.length === 0) {
  throw new NoStampImageError();
}

  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      const imageUrl = await uploadToS3({
        ...file,
        originalname: `stamps/${Date.now()}_${file.originalname}`,
      });

      await prisma.stampImage.create({
        data: {
          cafeId: cafe.id,
          imageUrl,
        },
      });

      return imageUrl;
    })
  );

  return uploadedUrls;
};

// 스탬프 정책 등록 
export const createStampPolicy = async (userId, policyData) => {
  const {
    selectedImageUrl,
    conditionType,
    amountThreshold,
    stampCountAmount,
    drinkCount,
    stampCountDrink,
    rewardType,
    discountAmount,
    menuId,
    hasExpiry,
    expiryDate
  } = policyData;

  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });
  if (!cafe) throw new InvalidStampPolicyError('해당 사용자의 카페를 찾을 수 없습니다.');

  const existing = await prisma.stampPolicy.findFirst({
    where: { cafeId: cafe.id },
  });
  if (existing) throw new InvalidStampPolicyError('이미 등록된 스탬프 정책이 존재합니다.');

  const stampPerAmount =
    conditionType === 'AMOUNT' ? stampCountAmount : null;
  const stampPerCount =
    conditionType === 'COUNT' ? stampCountDrink : null;
  const discount =
    rewardType === 'DISCOUNT' ? discountAmount : null;
  const rewardMenuId =
    rewardType === 'FREE_DRINK' ? menuId : null;
  const rewardExpiresAt =
    hasExpiry && expiryDate ? new Date(expiryDate) : null;

  const created = await prisma.stampPolicy.create({
    data: {
      cafeId: cafe.id,
      selectedImageUrl,
      conditionType,
      minAmount: conditionType === 'AMOUNT' ? amountThreshold : null,
      drinkCount: conditionType === 'COUNT' ? drinkCount : null,
      stampPerAmount,
      stampPerCount,
      rewardType,
      discountAmount: discount,
      menuId: rewardMenuId,
      hasExpiry,
      rewardExpiresAt,
    },
  });

  return created;
};

// 스탬프 정책 수정 
export const updateStampPolicy = async (userId, policyData) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });
  if (!cafe) throw new CafeNotFoundError();

  const existingPolicy = await prisma.stampPolicy.findFirst({
    where: { cafeId: cafe.id },
  });
  if (!existingPolicy) throw new StampPolicyNotFoundError();

  const {
    selectedImageUrl,
    conditionType,
    amountThreshold,
    stampCountAmount,
    drinkCount,
    stampCountDrink,
    rewardType,
    discountAmount,
    menuId,
    hasExpiry,
    expiryDate,
  } = policyData;

  const updated = await prisma.stampPolicy.update({
    where: { id: existingPolicy.id },
    data: {
      selectedImageUrl,
      conditionType,
      minAmount: conditionType === 'AMOUNT' ? amountThreshold : null,
      drinkCount: conditionType === 'COUNT' ? drinkCount : null,
      stampPerAmount: conditionType === 'AMOUNT' ? stampCountAmount : null,
      stampPerCount: conditionType === 'COUNT' ? stampCountDrink : null,
      rewardType,
      discountAmount: rewardType === 'DISCOUNT' ? discountAmount : null,
      menuId: rewardType === 'FREE_DRINK' ? menuId : null,
      hasExpiry,
      rewardExpiresAt: hasExpiry ? new Date(expiryDate) : null,
    },
  });

  return updated;
};

// 스탬프 정책 조회
export const getMyStampPolicy = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });

  if (!cafe) throw new CafeNotFoundError();

  const policy = await prisma.stampPolicy.findFirst({
    where: { cafeId: cafe.id },
  });

  if (!policy) throw new StampPolicyNotFoundError();

  return policy;
};