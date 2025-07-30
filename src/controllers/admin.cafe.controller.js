import { 
  createMyCafeBasicInfo,
  updateCafeOperationInfo,
  addCafeMenu,
  addCafePhotos,
  finishCafeRegistration, 
  getMyCafe, 
  updateMyCafe,
  getCafePhoto,
  deleteCafePhoto  
} from "../services/admin.cafe.service.js";

import { CafeNotExistError, UnauthCafeAccessError } from '../errors/customErrors.js';
import prisma from '../../prisma/client.js';

export const postCafeBasicInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const basicInfo = req.body;

    const cafe = await createMyCafeBasicInfo(userId, basicInfo);

    res.status(201).json({
      message: '카페 기본 정보가 등록되었습니다.',
      cafe: {
        id: cafe.id,
        name: cafe.name,
        ownerName: cafe.ownerName,
        address: cafe.address,
        region1DepthName: cafe.region1DepthName,
        region2DepthName: cafe.region2DepthName,
        region3DepthName: cafe.region3DepthName,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        phone: cafe.phone,
        websiteUrl: cafe.websiteUrl,
        description: cafe.description
      }
    });
  } catch (error) {
    next(error);
  }
};

export const patchCafeOperationInfo = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const userId = req.user.id;
    const operationInfo = req.body;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId }
    });
    if (!cafe) throw new CafeNotExistError();
    if (cafe.ownerId !== userId) throw new UnauthCafeAccessError();

    const updatedCafe = await updateCafeOperationInfo(Number(cafeId), operationInfo);

    res.status(200).json({
      message: '카페 운영 정보가 업데이트되었습니다.',
      cafe: {
        id: updatedCafe.id,
        name: updatedCafe.name,
        businessHours: updatedCafe.businessHours,
        storeFilters: updatedCafe.storeFilters,
        takeOutFilters: updatedCafe.takeOutFilters,
        menuFilters: updatedCafe.menuFilters,
        keywords: updatedCafe.keywords
      }
    });
  } catch (error) {
    next(error);
  }
};

export const postCafeMenu = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const userId = req.user.id;
    const menu = req.body;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId }
    });

    if (!cafe) throw new CafeNotExistError();

    const createdMenu = await addCafeMenu(cafe.id, menu);

    return res.status(201).json({
      message: '카페 메뉴가 등록되었습니다.',
      cafeMenu: createdMenu,
    });
  } catch (error) {
    next(error);
  }
};


export const postCafePhotos = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const userId = req.user.id;
    const { photoUrls } = req.body;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId }
    });

    if (!cafe) throw new CafeNotExistError();

    const createdPhotos = await addCafePhotos(cafe.id, photoUrls);

    res.status(201).json({
  message: '카페 사진이 등록되었습니다.',
  cafePhotos: createdPhotos.map((photo) => ({
    id: photo.id,
    photoUrl: photo.photoUrl,
    displayOrder: photo.displayOrder,
  })),
});
  } catch (error) {
    next(error);
  }
};

export const completeCafeRegistration = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const userId = req.user.id;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId }
    });

    if (!cafe) throw new CafeNotExistError();

    const updatedCafe = await finishCafeRegistration(cafe.id);

    res.status(200).json({
      message: '카페 등록이 완료되었습니다.',
      cafe: {
        status: updatedCafe.status,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const getCafe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getMyCafe(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateCafe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId }
    });

    if (!cafe) throw new CafeNotExistError();

    const result = await updateMyCafe(userId, cafe.id, req.body);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getMyCafePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getCafePhoto(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteMyCafePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const photoId = parseInt(req.params.photoId);

    const result = await deleteCafePhoto(userId, photoId);

    return res.status(200).json({
      resultType: 'SUCCESS',
      error: null,
      success: result,
    });
  } catch (err) {
    next(err);
  }
};