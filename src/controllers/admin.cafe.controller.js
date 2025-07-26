import { createMyCafe, getMyCafe, updateMyCafe } from '../services/admin.cafe.service.js';

export const createCafe = async (req, res, next) => {
  try {
    console.log('✅ [req.user]:', req.user); 
    const userId = req.user.id;
    const result = await createMyCafe(userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
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
