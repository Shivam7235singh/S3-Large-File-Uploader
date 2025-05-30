import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Uploadroute from './routes/upload.js';

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json({limit: '100mb'} ));


mongoose.connect(process.env.MONGODB_URI).then(()=>console.log("mongodb connected")).catch((err)=>console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
 
})


