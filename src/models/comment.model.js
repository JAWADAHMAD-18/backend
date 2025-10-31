import mongoose,{Schema, Types} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const comentSchema=new Schema({
    content:{
        Type:String,
        required:true
    },
    owner:{
        Type:Schema.Types.ObjectId,
        ref:"User"

    },
    vedio:{
        Type:Schema.Types.ObjectId,
        ref:"Vedio"
    }
},{timestamps:true});
comentSchema.plugin(mongooseAggregatePaginate);
export const Comment=mongoose.model("Comment",comentSchema);