import prisma from '../../prisma/client.js';
import { CafeAlreadyExistError, CafeNotExistError, UnauthCafeAccessError } from '../errors/customErrors.js';

export const createMyCafeBasicInfo = async (userId, basicInfo) => {
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
  return await prisma.cafe.update({
    where: { id: cafeId },
    data: {
      businessHours: parseIfString(operationInfo.businessHours),
      storeFilters: parseIfString(operationInfo.storeFilters),
      takeOutFilters: parseIfString(operationInfo.takeOutFilters),
      menuFilters: parseIfString(operationInfo.menuFilters),
      keywords: parseIfString(operationInfo.keywords),
    },
  });
};

export const addCafeMenus = async (cafeId, menus) => {
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
  const createdPhotos = [];

  for (const [index, url] of photoUrls.entries()) {
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