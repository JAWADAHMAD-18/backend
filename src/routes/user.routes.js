import { Router } from "express";
import { loginUser, logout, userRegister } from "../controllers/user.controller.js";
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
router.route("/logout").post(verifyAuth,logout);

export default router;
