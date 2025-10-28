import { Router } from "express";
import {
  loginUser,
  logout,
  userRegister,
  newRefreshToken,
  changeCurrentPassword,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverPhoto,
  getUserChannelProfile,
  getWatchHistory,
  getCurrentUser
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/cloudniary.middlewares.js";
import verifyAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  userRegister
);
router.route("/login").post(loginUser);
//secured routes
router.route("/logout").post(verifyAuth, logout);
router.route("/newRefreshToken").post(newRefreshToken);
router.route("/passworf-changed").post(verifyAuth, changeCurrentPassword);
router.route("/profile-update").patch(verifyAuth, updateUserDetails);//patch usekiya hy takay jo detail user change karay sirf wohi hn 
router
  .route("/update_avatar")
  .patch(verifyAuth, upload.single("avatar"), updateUserAvatar);
router
  .route("/updateUserCoverPhoto")
  .patch(verifyAuth, upload.single("coverimage"), updateUserCoverPhoto);
router.route("/channel/:username").post(verifyAuth, getUserChannelProfile);
router.route("/watchHistory").get(verifyAuth, getWatchHistory);
router.route("/current-user").get(verifyAuth, getCurrentUser);
export default router;
