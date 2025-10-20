import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

export const connectDB = async () => {
    try {
        const db=await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`);
        console.log("DB connected",db.connection.name);
    } catch (error) {
        console.log("db connection Failed",error);
        process.exit(1);
    }
};

export default connectDB