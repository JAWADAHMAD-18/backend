import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.models.js";
import cordinaryUploadImage from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
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
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized user");
  try {
    const decode = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decode?._id);
    if (!user) throw new ApiError(401, "Unauthorized user");
    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "the refresh token is already used or expired");
    const { accessToken, refreshToken } = await generateAccessandrefreshToken(
      user._id
    );
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
          { accessToken, refreshToken },
          "Access token successfully renewed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "there is issue during renewing access token");
  }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?.id);
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect)
    throw new ApiError(401, "Current password is incorrect");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id).select(
    "-password -refreshToken"
  );
  if (!user) throw new ApiError(404, "User not found");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User found successfully"));
});
const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) throw new ApiError(400, "All fields are required");
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Data updated successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const localPathAvatr = req.file?.path;
  if (!localPathAvatr) throw new ApiError(400, "Avatar is required on local");
  const avatar = await cordinaryUploadImage(localPathAvatr);
  if (!avatar.url)
    throw new ApiError(
      400,
      "Avatar is required on cloudinary error during uploading"
    );
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Avatar updated successfully"));
});
const updateUserCoverPhoto = asyncHandler(async (req, res) => {
  const localPathCoverPhoto = req.file?.path;
  if (!localPathCoverPhoto)
    throw new ApiError(400, "Coverimage is required on local");
  const coverPhoto = await cordinaryUploadImage(localPathAvatr);
  if (!coverPhoto.url)
    throw new ApiError(
      400,
      "CoverImage is required on cloudinary error during uploading"
    );
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverPhoto.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User coverImage updated successfully"));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) throw new ApiError(400, "Username is required");
  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },

    {
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscriber",
      },
    },
    {
      $lookup: {
        from: "Subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedto",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscriber" },
        subscribedtoCount: { $size: "$subscribedto" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscribedtoCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  if (!channel?.length)
    throw new ApiError(404, "Channel data  not found error during aggregate ");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "Channel data found and send  successfully"
      )
    );
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },{
            $addFields:{//this portion is just for frontend developer to get easier he will get a object now with onkly that vallues warna usay aray jana tha 
              owner:{
                $first:"$owner",//yahan par first sy matlab aarray ka first element hy 
              }
            }
          }
        ],
      },
    },
  ]);
  res.ststus(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history found"));
});
export {
  userRegister,
  loginUser,
  logout,
  newRefreshToken,
  getCurrentUser,
  changeCurrentPassword,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverPhoto,
  getUserChannelProfile,
  getWatchHistory,
};
