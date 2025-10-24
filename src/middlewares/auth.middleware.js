import { ApiError } from "../utils/apiErrors.js";
import asyncHandler from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js";
import jwt from "jsonwebtoken";

const verifyAuth = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers("Authorization")?.replace("Bearer ", "");
    if (!token) throw new ApiError(401, "Unauthorized user");
    const decode = jwt.verifytoken(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decode?.id).select(
      "-password -refreshToken"
    );
    if (!user) throw new ApiError(401, "Unauthorized user");
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "invalid access to user ");
  }
});

export default verifyAuth;