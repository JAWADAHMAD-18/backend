import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import cordinaryUploadImage from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const userRegister = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) throw new ApiError(409, "User already exists");
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required on local");
  const avatar = await cordinaryUploadImage(avatarLocalPath);
  const coverImage = await cordinaryUploadImage(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar is required on cloudinary");
  }
  const user = await User.create({
    fullname,
    username,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!userCreated)
    throw new ApiError(500, "Something went wrong during registering user");

  return res
    .status(201)
    .json(new ApiResponse(200, userCreated, "User created successfully"));
});

export { userRegister };
