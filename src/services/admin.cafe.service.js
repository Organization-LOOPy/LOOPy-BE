import prisma from '../../prisma/client.js';
import { 
  CafeAlreadyExistError, 
  InvalidCafeBasicInfoError, 
  CafeNotExistError, 
  InvalidBusinessHoursError, 
  DuplicateMenuNameError,
  InvalidMenuDataError,
  InvalidPhotoUrlsError,
  CafeAlreadyCompletedError,
  CafePhotoNotFoundError,
  UnauthCafeAccessError,
  RepresentativeLimitExceededError, 
} from '../errors/customErrors.js';
import { uploadToS3 } from '../utils/s3.js';

export const createMyCafeBasicInfo = async (userId, basicInfo) => {
  const { name, address, region1DepthName, region2DepthName, region3DepthName, latitude, longitude, ownerName } = basicInfo;

  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!address) missingFields.push('address');
  if (!region1DepthName) missingFields.push('region1DepthName');
  if (!region2DepthName) missingFields.push('region2DepthName');
  if (!region3DepthName) missingFields.push('region3DepthName');
  if (!latitude) missingFields.push('latitude');
  if (!longitude) missingFields.push('longitude');
  if (!ownerName) missingFields.push('ownerName');

  if (missingFields.length > 0) {
    throw new InvalidCafeBasicInfoError(missingFields);
  }

  const existing = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });

  if (existing) throw new CafeAlreadyExistError(userId);

  return await prisma.cafe.create({
    data: {
      ...basicInfo,
      ownerId: userId,
    },
  });
};

const parseIfString = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      return value; 
    }
  }
  return value;
};

export const updateCafeOperationInfo = async (userId, operationInfo) => {
  const parsedHours = parseIfString(operationInfo.businessHours);

  if (!Array.isArray(parsedHours)) {
    throw new InvalidBusinessHoursError('businessHours는 배열이어야 합니다.');
  }

  for (const entry of parsedHours) {
    if (!entry.day || typeof entry.isClosed !== 'boolean') {
      throw new InvalidBusinessHoursError(`잘못된 요일 항목: ${JSON.stringify(entry)}`);
    }
    if (!entry.isClosed && (!entry.openTime || !entry.closeTime)) {
      throw new InvalidBusinessHoursError(`운영 중인 요일에는 openTime과 closeTime이 필요합니다.`);
    }
  }

  const cafe = await prisma.cafe.findUnique({
    where: { ownerId: userId },
  });

  if (!cafe) {
    throw new Error('등록된 카페를 찾을 수 없습니다.');
  }

  return await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      businessHours: parsedHours,
      storeFilters: parseIfString(operationInfo.storeFilters),
      takeOutFilters: parseIfString(operationInfo.takeOutFilters),
      menuFilters: parseIfString(operationInfo.menuFilters),
      keywords: parseIfString(operationInfo.keywords),
    },
  });
};

export const addCafeMenu = async (userId, menuData, file) => {
  const requiredFields = ['name', 'price'];
  const missing = requiredFields.filter((field) => !menuData[field]);

  if (missing.length > 0) {
    throw new InvalidMenuDataError(missing);
  }

  const cafe = await prisma.cafe.findUnique({
    where: { ownerId: userId },
  });

  if (!cafe) throw new Error('등록된 카페가 없습니다.');

  const existingMenu = await prisma.cafeMenu.findFirst({
    where: {
      cafeId: cafe.id,
      name: menuData.name,
    },
  });

  if (existingMenu) {
    throw new DuplicateMenuNameError(menuData.name);
  }

  const isRep = menuData.isRepresentative === true;

  if (isRep) {
    const repCount = await prisma.cafeMenu.count({
      where: { cafeId: cafe.id, isRepresentative: true },
    });
    if (repCount >= 2) throw new RepresentativeLimitExceededError();
  }

  let photoUrl = null;
  if (file) {
    photoUrl = await uploadToS3(file);
  }

  const created = await prisma.cafeMenu.create({
    data: {
      cafeId: cafe.id,
      name: menuData.name,
      price: parseInt(menuData.price, 10),
      description: menuData.description,
      isRepresentative: isRep,
      isSoldOut: false,
      photoUrl,
    },
  });

  return created;
};


export const addCafePhotos = async (cafeId, photoUrls) => {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    throw new InvalidPhotoUrlsError('photoUrls가 비어 있거나 배열이 아닙니다.');
  }

  const createdPhotos = [];

  for (const [index, url] of photoUrls.entries()) {
    if (typeof url !== 'string' || !url.startsWith('http')) {
      throw new InvalidPhotoUrlsError(`유효하지 않은 사진 URL: ${url}`);
    }

    const photo = await prisma.cafePhoto.create({
      data: {
        cafeId,
        photoUrl: url,
        displayOrder: index,
      },
    });

    createdPhotos.push(photo);
  }

  return createdPhotos;
};

export const finishCafeRegistration = async (cafeId) => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
  });

  if (!cafe) throw new CafeNotExistError(cafeId);
  if (cafe.status === 'active') throw new CafeAlreadyCompletedError(cafeId);

  return await prisma.cafe.update({
    where: { id: cafeId },
    data: {
      status: 'active',
    },
  });
};

export const getMyCafe = async (userId) => {
    return await prisma.cafe.findMany({
        where: {
            ownerId: userId,
        },
    });
};

export const updateMyCafe = async (userId, cafeId, updateData) => {
    const cafe = await prisma.cafe.findUnique({where: {id: cafeId }});
    if(!cafe)  throw new CafePhotoNotFoundError();
    if(cafe.ownerId != userId)  throw new UnauthCafeAccessError();

    return await prisma.cafe.update({
        where: {id: cafeId },
        data: updateData,
    });
};

export const getCafePhoto = async (userId) => {
  return await prisma.cafePhoto.findMany({
    where: {
      cafe: {
        ownerId: userId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
};

export const deleteCafePhoto = async (userId, photoId) => {
  const photo = await prisma.cafePhoto.findUnique({
    where: { id: photoId },
    include: {
      cafe: true,
    },
  });

  if (!photo) {
    throw new CafePhotoNotFoundError(`해당 ID의 사진을 찾을 수 없습니다. (photoId: ${photoId})`);
  }

 if (!photo.cafe || photo.cafe.ownerId !== userId) {
  throw new UnauthCafeAccessError(userId, photo.cafeId, photoId);
}


  await prisma.cafePhoto.delete({
    where: { id: photoId },
  });

  return { message: '카페 이미지가 삭제되었습니다.', photoId };
};