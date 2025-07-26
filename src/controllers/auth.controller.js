import { signupService, loginService, 
  logoutService } from '../services/auth.service.js';

export const signup = async (req, res, next) => {
  try {
    const result = await signupService(req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const result = await loginService(email, password, role);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const result = await logoutService(req.user?.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
