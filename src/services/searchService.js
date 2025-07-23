import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafeReposiroty.js";
import { getDistanceInMeters } from "../utils/geo.js";

export const searchCafeService = {
  async getCafeDetails(cafe, x, y) {
    const photos = await cafeRepository.findPhotos(cafe.id);
    const cafeDetails = {
      id: cafe.id.toString(),
      name: cafe.name,
      adress: cafe.adress,
      region: cafe.region,
      keywords: cafe.keywords,
      photos: photos.map((photo) => ({
        id: photo.id.toString(),
        url: photo.photoUrl,
        displayOrder: photo.displayOrder,
      })),
    };

    cafe.distance = getDistanceInMeters(cafe.latitude, cafe.longtitude, x, y);

    logger.info(cafeDetails); //디버깅

    return cafeDetails;
  },
};
