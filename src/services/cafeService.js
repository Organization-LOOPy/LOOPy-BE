import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafeRepository.js";

export const cafeService = {
  async getCafeDetails(cafe, cafeId) {
    const [photos, menu] = await Promise.all([
      cafeRepository.findPhotos(cafeId),
      cafeRepository.findMenu(cafeId),
    ]);

    const cafeDetails = {
      ...cafe,
      photos: photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        displayOrder: photo.displayOrder,
      })),
      menu: menu.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        imgUrl: item.photoUrl,
      })),
    };
    logger.debug(`카페 정보 조회 성공: ${cafeDetails.name}`);
    return cafeDetails;
  },
};
