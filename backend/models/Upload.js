import mongoose from 'mongoose';


const uploadSchema = new mongoose.Schema({
    userId : String,
    key : String ,
    uploadId : String,

    parts : [{ETag : String , PartNumber : Number}],
    status : {
        type : String ,
        enum : ['initiated' , 'in-progress', 'completed', 'failed'],
        default : 'initiated'
    },
    createdAt : {
        type : Date ,
        default : Date.now 
    }
})

const upload = mongoose.model('Upload', uploadSchema);

 export default  upload; 

