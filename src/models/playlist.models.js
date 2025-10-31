import mongoose,{Schema, Types} from "mongoose";

const playlistSchema =new Schema({
    name:{
        Type:String,
        required:true
    },
    description:{
        Type:String,
        required:true
    },
    vedios:[{
        Type:Schema.Types.ObjectId,
        ref:"Vedio"
    }],
    owner:{
        Type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true});
export const Playlist=mongoose.model("Playlist",playlistSchema);