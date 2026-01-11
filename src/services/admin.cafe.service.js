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
  CafeMenuNotExistError,
} from "../errors/customErrors.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";

const defaultStampImages = (process.env.DEFAULT_STAMP_IMAGES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ensureDefaultStampImages = async (tx, cafeId) => {
  const count = await tx.stampImage.count({ where: { cafeId } });
  if (count > 0) return;

  const urls = defaultStampImages.length > 0
    ? defaultStampImages
    : [
        'https://loopy-cafe-bucket.s3.ap-northeast-2.amazonaws.com/stamps/Loopy_stamp1.svg',
        'https://loopy-cafe-bucket.s3.ap-northeast-2.amazonaws.com/stamps/Loopy_stamp2.svg',
      ];

  await tx.stampImage.createMany({
    data: urls.map((url) => ({ cafeId, imageUrl: url })),
  });
};

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
    where: { ownerId: userId },
  });

  if (existing) throw new CafeAlreadyExistError(userId);

  return await prisma.$transaction(async (tx) => {
    const cafe = await tx.cafe.create({
      data: { ...basicInfo, ownerId: Number(userId) },
    });

    await ensureDefaultStampImages(tx, cafe.id); 

    return cafe;
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


const dayMap = {
  "월": "MONDAY",
  "화": "TUESDAY",
  "수": "WEDNESDAY",
  "목": "THURSDAY",
  "금": "FRIDAY",
  "토": "SATURDAY",
  "일": "SUNDAY"
};
const storeFilterList = [
  "노트북",
  "1인석",
  "단체석",
  "주차 가능",
  "예약 가능",
  "와이파이 제공",
  "애견 동반",
  "24시간 운영",
];

const extractSelected = (filterObj = {}) => {
  return Object.entries(filterObj)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);
};

const takeOutFilterList = ["텀블러 할인", "포장 할인"];
const menuFilterList = ["비건", "저당/무가당", "글루텐프리", "디카페인"];
const normalizeFilters = (allOptions, given) => {
  const result = {};
  allOptions.forEach((opt) => {
    result[opt] = given?.[opt] ?? false;
  });
  return result;
};

const normalizeFilters2 = (allOptions, selectedArray = []) => {
  const result = {};
  allOptions.forEach((opt) => {
    result[opt] = selectedArray.includes(opt); 
  });
  return result;
};
export const updateCafeOperationInfo = async (userId, operationInfo = {}) => {
  let parsedHours = parseIfString(operationInfo.businessHours);
  const businessHourType = operationInfo.businessHourType;

  const validTypes = ["SAME_ALL_DAYS", "WEEKDAY_WEEKEND", "EACH_DAY_DIFFERENT"];
  if (businessHourType && !validTypes.includes(businessHourType)) {
    throw new InvalidBusinessHoursError("유효하지 않은 businessHourType입니다.");
  }

  const allDays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];

  const parseBreakTime = (breakTime) => {
    if (!breakTime) return { breakStart: null, breakEnd: null };
    const [breakStart, breakEnd] = breakTime.split("~");
    return { breakStart, breakEnd };
  };

  if (
    businessHourType === "SAME_ALL_DAYS" &&
    parsedHours &&
    !Array.isArray(parsedHours) &&
    typeof parsedHours === "object"
  ) {
    const { open, close, breakTime } = parsedHours;

    if (!open || !close) {
      throw new InvalidBusinessHoursError(
        "SAME_ALL_DAYS는 open과 close 값이 필요합니다."
      );
    }

    const { breakStart, breakEnd } = parseBreakTime(breakTime);

    parsedHours = allDays.map((day) => ({
      day,
      isClosed: false,
      openTime: open,
      closeTime: close,
      breakStart,
      breakEnd,
    }));
  }

  else if (
    businessHourType === "WEEKDAY_WEEKEND" &&
    parsedHours &&
    !Array.isArray(parsedHours) &&
    typeof parsedHours === "object"
  ) {
    const { weekday, weekend } = parsedHours;

    if (!weekday || !weekend) {
      throw new InvalidBusinessHoursError(
        "WEEKDAY_WEEKEND는 weekday와 weekend 값이 필요합니다."
      );
    }

    const weekdayBreak = parseBreakTime(weekday.breakTime);
    const weekendBreak = parseBreakTime(weekend.breakTime);

    parsedHours = [
      ...["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => ({
        day,
        isClosed: false,
        openTime: weekday.open,
        closeTime: weekday.close,
        ...weekdayBreak,
      })),
      ...["SATURDAY", "SUNDAY"].map((day) => ({
        day,
        isClosed: false,
        openTime: weekend.open,
        closeTime: weekend.close,
        ...weekendBreak,
      })),
    ];
  }

  else if (businessHourType === "EACH_DAY_DIFFERENT") {
    if (!Array.isArray(parsedHours)) {
      throw new InvalidBusinessHoursError(
        "EACH_DAY_DIFFERENT는 배열 형태의 businessHours가 필요합니다."
      );
    }

    parsedHours = parsedHours.map((entry) => ({
      day: entry.day,
      isClosed: entry.isClosed,
      openTime: entry.openTime ?? null,
      closeTime: entry.closeTime ?? null,
      breakStart: entry.breakStart ?? null,
      breakEnd: entry.breakEnd ?? null,
    }));
  }

  if (!Array.isArray(parsedHours)) {
    throw new InvalidBusinessHoursError("businessHours는 배열이어야 합니다.");
  }

  parsedHours = parsedHours.map((entry) => ({
    ...entry,
    day: dayMap[entry.day] || entry.day,
  }));

  for (const entry of parsedHours) {
    if (!entry.day || typeof entry.isClosed !== "boolean") {
      throw new InvalidBusinessHoursError(
        `잘못된 요일 항목: ${JSON.stringify(entry)}`
      );
    }
    if (!entry.isClosed && (!entry.openTime || !entry.closeTime)) {
      throw new InvalidBusinessHoursError(
        "운영 중인 요일에는 openTime과 closeTime이 필요합니다."
      );
    }
  }

  /* ===============================
     카페 조회
  =============================== */
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
  });

  if (!cafe) {
    throw new CustomError(
      "CAFE_NOT_FOUND",
      "해당 유저의 카페가 존재하지 않습니다."
    );
  }

  const updatedCafe = await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      businessHourType,
      businessHours: parsedHours,
      breakTime: null,
      keywords: operationInfo.keywords ?? [],
      storeFilters: normalizeFilters2(
        storeFilterList,
        operationInfo.storeFilters ?? []
      ),
      takeOutFilters: normalizeFilters2(
        takeOutFilterList,
        operationInfo.takeOutFilters ?? []
      ),
      menuFilters: normalizeFilters2(
        menuFilterList,
        operationInfo.menuFilters ?? []
      ),
      updatedAt: new Date(),
    },
  });

  return {
    id: updatedCafe.id,
    businessHourType: updatedCafe.businessHourType,
    businessHours: updatedCafe.businessHours,
    breakTime: updatedCafe.breakTime,
    keywords: updatedCafe.keywords,
    storeFilters: extractSelected(updatedCafe.storeFilters),
    takeOutFilters: extractSelected(updatedCafe.takeOutFilters),
    menuFilters: extractSelected(updatedCafe.menuFilters),
  };
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
    where: { cafeId: cafe.id,name: menuData.name, },
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
      "사진 데이터가 비어 있거나 사진 배열이 아닙니다."
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
          id: true,
          photoUrl: true,
        },
      },
    },
  });
};

export const deleteCafeMenuService = async (userId, menuId) => {

  const menu = await prisma.cafeMenu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      cafe: { select: { ownerId: true } },
    },
  });

  if (!menu) {
    throw new CafeMenuNotExistError();
  }

  if (menu.cafe.ownerId !== userId) {
    throw new UnauthCafeAccessError();
  }

  await prisma.cafeMenu.delete({
    where: { id: menuId },
  });

  return menuId;
};

export const getCafeBusinessInfo = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
    select: {
      id: true,
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
    id: cafe.id,
    businessHourType: cafe.businessHourType ?? "DIFFERENT_EACH_DAY",
    businessHours: cafe.businessHours ?? [],
    breakTime: cafe.breakTime ?? null,
    keywords: cafe.keywords ?? [],
    storeFilters: extractSelected(cafe.storeFilters),
    takeOutFilters: extractSelected(cafe.takeOutFilters),
    menuFilters: extractSelected(cafe.menuFilters),
  };
};

export const updateMyCafe = async (userId, cafeId, updateData) => {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new CafePhotoNotFoundError();
  if (cafe.ownerId != userId) throw new UnauthCafeAccessError();

  return await prisma.cafe.update({
    where: { id: cafeId },
    data: updateData,
  });
};

export const getCafePhotos = async (userId) => {
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

export const getOwnerCafeInfo = async (userId) => {
  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: userId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!cafe) {
    return {
      userId,
      cafeId: null,
      cafeStatus: null,
    };
  }

  return {
    userId,
    cafeId: cafe.id,
    cafeStatus: cafe.status,
  };
};