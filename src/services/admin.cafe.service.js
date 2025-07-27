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
  UnauthCafeAccessError 
} from '../errors/customErrors.js';

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

export const updateCafeOperationInfo = async (cafeId, operationInfo) => {
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

  return await prisma.cafe.update({
    where: { id: cafeId },
    data: {
      businessHours: parsedHours,
      storeFilters: parseIfString(operationInfo.storeFilters),
      takeOutFilters: parseIfString(operationInfo.takeOutFilters),
      menuFilters: parseIfString(operationInfo.menuFilters),
      keywords: parseIfString(operationInfo.keywords),
    },
  });
};

export const addCafeMenus = async (cafeId, menus) => {
  if (!Array.isArray(menus) || menus.length === 0) {
    throw new InvalidMenuDataError('메뉴 배열이 비어있습니다.');
  }

  const duplicateNames = [];
  for (const menu of menus) {
    if (!menu.name || typeof menu.price !== 'number') {
      throw new InvalidMenuDataError(`메뉴 필수 항목 누락 또는 잘못된 값: ${JSON.stringify(menu)}`);
    }

    const existing = await prisma.cafeMenu.findFirst({
      where: { cafeId, name: menu.name },
    });

    if (existing) {
      duplicateNames.push(menu.name);
    }
  }

  if (duplicateNames.length > 0) {
    throw new DuplicateMenuNameError(duplicateNames);
  }

  const createdMenus = [];
  for (const menu of menus) {
    const created = await prisma.cafeMenu.create({
      data: {
        cafeId,
        name: menu.name,
        price: menu.price,
        photoUrl: menu.photoUrl,
        description: menu.description,
        isSoldOut: false,
        category: menu.category || '기본'
      },
    });
    createdMenus.push(created);
  }

  return createdMenus;
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
    if(!cafe)  throw new CafeNotExistError();
    if(cafe.ownerId != userId)  throw new UnauthCafeAccessError();

    return await prisma.cafe.update({
        where: {id: cafeId },
        data: updateData,
    });
};