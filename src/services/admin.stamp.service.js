import prisma from '../../prisma/client.js';
import { uploadToS3, deleteFromS3  } from '../utils/s3.js';
import { 
  CafeNotFoundError, 
  InvalidStampPolicyError,
  StampImageLimitExceededError, 
  NoStampImageError,
  StampPolicyNotFoundError,
  UnauthCafeAccessError
} from '../errors/customErrors.js';

// 스탬프 사진 등록
export const uploadStampImagesService = async (userId, files) => {
  if (!files || files.length === 0) {
    throw new NoStampImageError();
  }
  const MAX_TOTAL_IMAGES = 4;

  const defaultStampImages = [
    'https://loopy-cafe-bucket.s3.ap-northeast-2.amazonaws.com/stamps/Loopy_stamp1.svg',
    'https://loopy-cafe-bucket.s3.ap-northeast-2.amazonaws.com/stamps/Loopy_stamp2.svg',
  ];

  return await prisma.$transaction(async (tx) => {
    const cafe = await tx.cafe.findFirst({
      where: { ownerId: Number(userId) },
      select: { id: true },
    });
    if (!cafe) throw new CafeNotFoundError();

    // 내가 올린 것만 카운트
    const existingCount = await tx.stampImage.count({
      where: {
        cafeId: cafe.id,
        createdBy: Number(userId),
        imageUrl: { notIn: defaultStampImages },
      },
    });

    const capacity = MAX_TOTAL_IMAGES - defaultStampImages.length - existingCount;

    if (capacity <= 0) {
      throw new StampImageLimitExceededError();
    }
    if (files.length > capacity) {
      throw new StampImageLimitExceededError();
    }

    const results = [];
    for (const file of files) {
      const imageUrl = await uploadToS3(file, 'cafes/stamps');
      const saved = await tx.stampImage.create({
        data: {
          cafeId: cafe.id,
          imageUrl,
          createdBy: Number(userId),
        },
        select: { id: true, imageUrl: true },
      });
      results.push(saved);
    }
    return results;
  });
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
    },
  });

  // 스탬프 정책 변경 시 고객에게 알림 전송
  const recipients = await prisma.user.findMany({
    where: { allowKakaoAlert: true },
    select: { id: true },
  });

  const content = JSON.stringify({
    conditionType: updated.conditionType,
    minAmount: updated.minAmount,
    stampPerAmount: updated.stampPerAmount,
    drinkCount: updated.drinkCount,
    stampPerCount: updated.stampPerCount,
    rewardType: updated.rewardType,
    discountAmount: updated.discountAmount,
    menuId: updated.menuId,
  }, null, 2);

  if (recipients.length > 0) {
    const notifications = recipients.map(({ id }) => ({
      userId: id,
      cafeId: cafe.id,
      type: 'stamp',
      title: '스탬프 정책이 변경되었습니다.',
      content,
    }));

    await prisma.notification.createMany({ data: notifications });
  }

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

// 스탬프 이미지 삭제
export const deleteStampImageService = async (userId, imageId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: Number(userId) },
    select: { id: true, ownerId: true },
  });
  if (!cafe) throw new CafeNotFoundError();

  const stampImage = await prisma.stampImage.findUnique({
    where: { id: Number(imageId) },
    include: { cafe: { select: { ownerId: true } } },
  });

  if (!stampImage) throw new NoStampImageError();
  if (!stampImage.cafe || stampImage.cafe.ownerId !== Number(userId)) {
    throw new UnauthCafeAccessError(userId, stampImage.cafeId, imageId);
  }

  await deleteFromS3(stampImage.imageUrl);

  await prisma.stampImage.delete({
    where: { id: stampImage.id },
  });

  return true;
};

// 스탬프 이미지 조회
export const getMyStampImagesService = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: Number(userId) },
    select: { id: true },
  });
  if (!cafe) throw new CafeNotFoundError();

  const images = await prisma.stampImage.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, imageUrl: true, createdAt: true},
  });

  return images; 
};