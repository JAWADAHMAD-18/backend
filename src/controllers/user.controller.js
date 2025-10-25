import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import cordinaryUploadImage from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessandrefreshToken = async (userid) => {
  try {
    console.log(userid);
    const user = await User.findById(userid);
    if (!user) throw new ApiError(404, "User not found");
    const accessToken = user.generateAccess_token();
    const refreshToken = user.generateRefresh_token();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Failed to generate access and refresh tokens:", error);
    throw new ApiError(500, "Failed to generate access and refresh tokens");
  }
};

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

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) throw new ApiError(404, "User not found");
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError(401, "Password is incorrect");
  const { accessToken, refreshToken } = await generateAccessandrefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loginUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});
const newRefreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken) throw new ApiError(401,"Unauthorized user");
  const decode=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
  const user=await User.findById(decode?.id);
  if(!user) throw new ApiError(401,"Unauthorized user");
  const {accessToken,refreshToken}=await generateAccessandrefreshToken(user._id);
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
  .status(200)
  .cookie("refreshToken", refreshToken, options)
  .cookie("accessToken", accessToken, options)
  .json(new ApiResponse(200,{accessToken,refreshToken},"User logged in successfully"));

})

export { userRegister, loginUser, logout };
