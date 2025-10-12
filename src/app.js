import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
app.use(cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN
}));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

// routes
import userRoutes from "./routes/user.routes.js";

app.use("/api/v1/user", userRoutes);

export default app