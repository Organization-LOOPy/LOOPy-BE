import prisma from '../../prisma/client.js';
import { uploadToS3 } from '../utils/s3.js';
import { CafeNotFoundError, InvalidStampPolicyError } from '../errors/customErrors.js';

export const uploadStampImagesService = async (userId, files) => {
  const cafe = await prisma.cafe.findUnique({
    where: { ownerId: userId },
  });

  if (!cafe) throw new CafeNotFoundError();

  const existing = await prisma.stampImage.count({ where: { cafeId: cafe.id } });
  if (existing + files.length > 2) {
    throw new Error('스탬프 이미지는 최대 2개까지만 업로드할 수 있습니다.');
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

export const createStampPolicy = async (userId, policyData) => {
  const {
    selectedImageUrl,
    conditionType,
    amountPerStamp,
    countPerStamp,
    rewardType,
    discountAmount,
    menuId,
    hasExpiry,
    expiryDate
  } = policyData;

  // 1. 카페 존재 및 소유 확인
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });
  if (!cafe) throw new InvalidStampPolicyError('해당 사용자의 카페를 찾을 수 없습니다.');

  // 2. 기존 정책 있는 경우 예외처리
  const existing = await prisma.stampPolicy.findFirst({
    where: { cafeId: cafe.id },
  });
  if (existing) throw new InvalidStampPolicyError('이미 등록된 스탬프 정책이 존재합니다.');

  // 3. 스탬프 정책 저장
  const created = await prisma.stampPolicy.create({
    data: {
      cafeId: cafe.id,
      selectedImageUrl,
      conditionType,
      amountPerStamp: conditionType === 'AMOUNT' ? amountPerStamp : null,
      countPerStamp: conditionType === 'COUNT' ? countPerStamp : null,
      rewardType,
      discountAmount: rewardType === 'DISCOUNT' ? discountAmount : null,
      menuId: rewardType === 'FREE_DRINK' ? menuId : null,
      hasExpiry,
      expiryDate: hasExpiry ? new Date(expiryDate) : null,
    },
  });

  return created;
};