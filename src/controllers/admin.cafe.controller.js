import {
  createMyCafeBasicInfo,
  updateCafeOperationInfo,
  addCafeMenu,
  addCafePhotos,
  finishCafeRegistration,
  updateMyCafe,
  getCafePhotos,
  deleteCafePhoto,
  getCafeBasicInfo,
  getCafeBusinessInfo,
  deleteCafeMenuService,
  getCafeMenus,
  getFirstCafePhotoByOwner,
  getOwnerCafeInfo, 
} from "../services/admin.cafe.service.js";
import { uploadToS3 } from "../utils/s3.js";

import { CafeNotExistError } from "../errors/customErrors.js";
import prisma from "../../prisma/client.js";

import { cafeEmbedding } from "../services/nlp.search.js";

export const postCafeBasicInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const basicInfo = req.body;

    const cafe = await createMyCafeBasicInfo(userId, basicInfo);

    res.status(201).json({
      message: "카페 기본 정보가 등록되었습니다.",
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
        description: cafe.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const patchCafeOperationInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const operationInfo = req.body;

    const updatedCafe = await updateCafeOperationInfo(userId, operationInfo);

    res.status(200).json({
      message: "카페 운영 정보가 업데이트되었습니다.",
      cafe: {
        id: updatedCafe.id,
        name: updatedCafe.name,
        businessHourType: updatedCafe.businessHourType,
        businessHours: updatedCafe.businessHours,
        breakTime: updatedCafe.breakTime,
        storeFilters: updatedCafe.storeFilters,
        takeOutFilters: updatedCafe.takeOutFilters,
        menuFilters: updatedCafe.menuFilters,
        keywords: updatedCafe.keywords,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const postCafeMenu = async (req, res, next) => {
  try {
    console.log("[DEBUG] req.file:", req.file);
    console.log("[DEBUG] req.body:", req.body);

    const userId = req.user.id;
    const createdMenu = await addCafeMenu(userId, req.body, req.file);

    res.status(201).json({
      message: "카페 메뉴가 등록되었습니다.",
      data: createdMenu,
    });
  } catch (err) {
    next(err);
  }
};

export const postCafePhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafe = await prisma.cafe.findFirst({ where: { ownerId: userId } });
    if (!cafe) throw new CafeNotExistError();

    const files = req.files ?? [];
    if (files.length === 0) {
      return res.status(400).json({ message: "사진 파일이 없습니다." });
    }

    const uploadedUrls = await Promise.all(
      files.map((file, index) =>
        uploadToS3(file, "cafes/photos").then((url) => ({
          url,
          displayOrder: index,
        }))
      )
    );

    const createdPhotos = await addCafePhotos(cafe.id, uploadedUrls);
    res.status(200).json({
      message: "카페 사진이 등록되었습니다.",
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
    const userId = Number(req.user.id);
    const cafe = await prisma.cafe.findUnique({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });
    if (!cafe) throw new CafeNotExistError();

    const updatedCafe = await finishCafeRegistration(cafe.id);
    await cafeEmbedding(updatedCafe);

    res.status(200).json({
      message: "카페 등록이 완료되었습니다.",
      cafe: {
        status: updatedCafe.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCafeBasicInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafe = await getCafeBasicInfo(userId);
    return res.status(200).json(cafe);
  } catch (err) {
    next(err);
  }
};

export const getMyCafeBusinessInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessInfo = await getCafeBusinessInfo(userId);

    if (!businessInfo) {
      return res.status(404).json({
        errorCode: 'CAFE_NOT_FOUND',
        reason: '해당 유저의 카페가 존재하지 않습니다.',
        data: null
      });
    }

    return res.status(200).json(businessInfo);
  } catch (err) {
    next(err);
  }
};
export const updateCafe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cafe = await prisma.cafe.findFirst({
      where: { ownerId: userId },
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
    const result = await getCafePhotos(userId);
    return res.status(200).json({
      message: "내 카페 사진 조회 성공",
      data: {
        result,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyCafePhoto = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) {
      return res.status(400).json({ message: "유효하지 않은 photoId" });
    }

    const result = await deleteCafePhoto(userId, photoId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyCafeMenus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const menus = await getCafeMenus(userId);

    res.status(200).json({
      message: "내 카페 메뉴 목록 조회 성공",
      data: menus,
    });
  } catch (error) {
    next(error);
  }
};

export const getFirstCafePhotoController = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const photo = await getFirstCafePhotoByOwner(ownerId);
    res.status(200).json({ photo });
  } catch (error) {
    next(error);
  }
};

export const deleteCafeMenu = async (req, res, next) => {
  try {
    const userId = req.user.id; 
    const { menuId } = req.params;

    const deletedId = await deleteCafeMenuService(userId, parseInt(menuId, 10));

    return res.status(200).json({
      message: "카페 메뉴가 삭제되었습니다.",
      data: { menuId: deletedId },
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerCafe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getOwnerCafeInfo(userId);

    res.status(200).json({
      message: '사장님의 카페 정보 조회 성공',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};