import prisma from "../../prisma/client.js";
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
} from "../errors/customErrors.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";

export const createMyCafeBasicInfo = async (userId, basicInfo) => {
  const {
    name,
    address,
    region1DepthName,
    region2DepthName,
    region3DepthName,
    latitude,
    longitude,
    ownerName,
  } = basicInfo;

  const missingFields = [];
  if (!name) missingFields.push("name");
  if (!address) missingFields.push("address");
  if (!region1DepthName) missingFields.push("region1DepthName");
  if (!region2DepthName) missingFields.push("region2DepthName");
  if (!region3DepthName) missingFields.push("region3DepthName");
  if (!latitude) missingFields.push("latitude");
  if (!longitude) missingFields.push("longitude");
  if (!ownerName) missingFields.push("ownerName");

  if (missingFields.length > 0) {
    throw new InvalidCafeBasicInfoError(missingFields);
  }

  const existing = await prisma.cafe.findFirst({
    where: { ownerId: toInt(userId) },
  });

  if (existing) throw new CafeAlreadyExistError(userId);

  return await prisma.cafe.create({
    data: {
      ...basicInfo,
      ownerId: toInt(userId),
    },
  });
};

const parseIfString = (value) => {
  if (typeof value === "string") {
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
  const businessHourType = operationInfo.businessHourType;

  if (!Array.isArray(parsedHours)) {
    throw new InvalidBusinessHoursError("businessHours는 배열이어야 합니다.");
  }

  for (const entry of parsedHours) {
    if (!entry.day || typeof entry.isClosed !== "boolean") {
      throw new InvalidBusinessHoursError(
        `잘못된 요일 항목: ${JSON.stringify(entry)}`
      );
    }
    if (!entry.isClosed && (!entry.openTime || !entry.closeTime)) {
      throw new InvalidBusinessHoursError(
        `운영 중인 요일에는 openTime과 closeTime이 필요합니다.`
      );
    }
  }

  const validTypes = ["SAME_ALL_DAYS", "WEEKDAY_WEEKEND", "DIFFERENT_EACH_DAY"];
  if (businessHourType && !validTypes.includes(businessHourType)) {
    throw new InvalidBusinessHoursError(
      "유효하지 않은 businessHourType입니다."
    );
  }

  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: toInt(userId) },
  });

  if (!cafe) {
    throw new CafeNotExistError();
  }

  return await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      businessHours: parsedHours,
      businessHourType: businessHourType,
      breakTime: operationInfo.breakTime,
      storeFilters: parseIfString(operationInfo.storeFilters),
      takeOutFilters: parseIfString(operationInfo.takeOutFilters),
      menuFilters: parseIfString(operationInfo.menuFilters),
      keywords: parseIfString(operationInfo.keywords),
    },
  });
};

export const addCafeMenu = async (userId, menuData, file) => {
  const requiredFields = ["name", "price"];
  const missing = requiredFields.filter((field) => !menuData[field]);

  if (missing.length > 0) {
    throw new InvalidMenuDataError(missing);
  }

  const cafe = await prisma.cafe.findFirst({ where: { ownerId: Number(userId) }});

  if (!cafe) throw new CafeNotExistError();

  const existingMenu = await prisma.cafeMenu.findFirst({
    where: {
      cafeId: cafe.id,
      name: menuData.name,
    },
  });

  if (existingMenu) {
    throw new DuplicateMenuNameError(menuData.name);
  }

  const isRep = String(menuData.isRepresentative).toLowerCase() === 'true';

  if (isRep) {
    const repCount = await prisma.cafeMenu.count({
      where: { cafeId: cafe.id, isRepresentative: true },
    });
    if (repCount >= 2) throw new RepresentativeLimitExceededError();
  }

  let photoUrl = null;
  if (file) {
    photoUrl = await uploadToS3(file, 'cafes/menus');
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

export const addCafePhotos = async (cafeId, photoDataArray) => {
  if (!Array.isArray(photoDataArray) || photoDataArray.length === 0) {
    throw new InvalidPhotoUrlsError(
      "사진 데이터가 비어 있거나 배열이 아닙니다."
    );
  }

  const createdPhotos = [];

  for (const { url, displayOrder } of photoDataArray) {
    if (typeof url !== "string" || !url.startsWith("http")) {
      throw new InvalidPhotoUrlsError(`유효하지 않은 사진 URL: ${url}`);
    }

    const photo = await prisma.cafePhoto.create({
      data: {
        cafeId,
        photoUrl: url,
        displayOrder,
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
  if (cafe.status === "active") throw new CafeAlreadyCompletedError(cafeId);

  const updatedCafe = await prisma.cafe.update({
    where: { id: cafeId },
    data: {
      status: "active",
    },
  });

  return updatedCafe;
};

export const getCafeBasicInfo = async (userId) => {
  return await prisma.cafe.findMany({
    where: {
      ownerId: userId,
    },
    select: {
      name: true,
      ownerName: true,
      address: true,
      region1DepthName: true,
      region2DepthName: true,
      region3DepthName: true,
      phone: true,
      description: true,
      websiteUrl: true,
      photos: {
        select: {
          photoUrl: true,
        },
      },
    },
  });
};

export const getCafeBusinessInfo = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: {
      ownerId: userId,
    },
    select: {
      businessHours: true,
      businessHourType: true,
      breakTime: true,
      keywords: true,
      storeFilters: true,
      takeOutFilters: true,
      menuFilters: true,
    },
  });

  if (!cafe) throw new CafeNotExistError();

  return {
    businessHourType: cafe.businessHourType ?? "DIFFERENT_EACH_DAY",
    businessHours: cafe.businessHours ?? [],
    hasNoHoliday: cafe.businessHours
      ? cafe.businessHours.every((day) => day.isClosed === false)
      : false,
    keywords: cafe.keywords ?? [],
    selectedKeywords: {
      storeFilters: cafe.storeFilters ?? [],
      takeOutFilters: cafe.takeOutFilters ?? [],
      menuFilters: cafe.menuFilters ?? [],
    },
  };
};

export const updateMyCafe = async (userId, cafeId, updateData) => {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new CafePhotoNotFoundError();
  if (cafe.ownerId != toInt(userId)) throw new UnauthCafeAccessError();

  return await prisma.cafe.update({
    where: { id: cafeId },
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
      createdAt: "desc",
    },
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
    throw new CafePhotoNotFoundError();
  }

  if (!photo.cafe || photo.cafe.ownerId !== userId) {
    throw new UnauthCafeAccessError(userId, photo.cafeId, photoId);
  }

  await deleteFromS3(photo.photoUrl);

  await prisma.cafePhoto.delete({
    where: { id: photoId },
  });

  return true;
};

export const getCafeMenus = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (!cafe) throw new CafeNotExistError();

  const menus = await prisma.cafeMenu.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      photoUrl: true,
      isRepresentative: true,
      description: true,
    },
  });

  return menus;
};

export const getFirstCafePhotoByOwner = async (ownerId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId },
    select: { id: true },
  });

  if (!cafe) {
    throw new CafePhotoNotFoundError();
  }

  const photo = await prisma.cafePhoto.findFirst({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: "asc" },
  });

  if (!photo) {
    throw new CafePhotoNotFoundError();
  }

  return photo;
};
