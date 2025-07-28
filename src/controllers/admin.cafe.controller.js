import { 
  createMyCafeBasicInfo,
  updateCafeOperationInfo,
  addCafeMenus,
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

    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotExistError(cafeId);
    if (cafe.ownerId !== userId) throw new UnauthCafeAccessError();

    await updateCafeOperationInfo(Number(cafeId), operationInfo);

    res.status(200).json({
      message: '카페 운영 정보가 업데이트되었습니다.',
      cafe: {
        id: cafe.id,
        name: cafe.name,
        businessHours: cafe.businessHours,
        storeFilters: cafe.storeFilters,
        takeOutFilters: cafe.takeOutFilters,
        menuFilters: cafe.menuFilters,
        keywords: cafe.keywords
      }
    });
  } catch (error) {
    next(error);
  }
};

export const postCafeMenus = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const userId = req.user.id;
    const menus = req.body.menus;

    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotExistError(cafeId);
    if (cafe.ownerId !== userId) throw new UnauthCafeAccessError();

    const cafeMenus = await addCafeMenus(Number(cafeId), menus);
    

    res.status(201).json({
      message: '카페 메뉴가 등록되었습니다.',
      cafeMenus
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

    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotExistError(cafeId);
    if (cafe.ownerId !== userId) throw new UnauthCafeAccessError();

    await addCafePhotos(Number(cafeId), photoUrls);

    const createdPhotos = await addCafePhotos(Number(cafeId), photoUrls);

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

    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotExistError(cafeId);
    if (cafe.ownerId !== userId) throw new UnauthCafeAccessError();

    await finishCafeRegistration(Number(cafeId));

    res.status(200).json({
      message: '카페 등록이 완료되었습니다.',
      cafe: {
        status: cafe.status
      }
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

    const cafeId = parseInt(req.params.cafeId, 10);
    if (isNaN(cafeId)) throw new Error('Invalid cafeId');

    const result = await updateMyCafe(userId, cafeId, req.body);
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