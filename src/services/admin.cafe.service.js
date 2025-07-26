import prisma from '../../prisma/client.js';
import { CafeAlreadyExistError, CafeNotExistError, UnauthCafeAccessError } from '../errors/customErrors.js';

export const createMyCafe = async (userId, cafeData) => {
    const existing = await prisma.cafe.findFirst({
  where: { ownerId: userId }
});

if (existing) throw new CafeAlreadyExistError(userId);

return await prisma.cafe.create({
  data: {
    ...cafeData,
    ownerId: userId,
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