import express from 'express' ;
const router = express.Router();

import  {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
  } from  "@aws-sdk/client-s3";
  import {getSignedUrl } from "@aws-sdk/s3-request-presigner";
  import  s3 from "../s3Client.js" ;
  import Upload from  "../models/Upload.js" ;


//    step 1 Start Upload

router.post("/start-upload", async(req, res ) =>{
    try {
        const { filename , contentType , userId} = req.body;

        const command = new CreateMultipartUploadCommand({
            Bucket : process.env.S3_BUCKET_NAME,
            Key : filename ,
            ContentType : contentType 
        });

        const response = await s3.send(command);

        await Upload.create({
            userId,
            key : response.Key,
            uploadId : response.UploadId,        
        });
      
        res.json({
            uploadId : response.UploadId,
            key : response.Key
        });
    } catch (error) {
         console.error("Error starting upload", error);
        res.status(500).json({
            error : "Error starting upload"
        }); 
    }
});

// Step 2: Get Signed URL for a Chunk

 router .get("/get-signed-url", async(req, res) =>{
    try {
        const {uploadId , key , partNumber} = req.body;
        const command = new UploadPartCommand({
            Bucket : process.env.S3_BUCKET_NAME,
            Key : key,
            PartNumber : Number(partnumber),
            UploadId : uploadId,
        });
        const signedUrl = await getSignedUrl(s3, command, {
            expiresIn : 3600,
        });
        res.json({
            signedUrl,
        });
        
    } catch (error) {
        console.error("Error getting signed URL", error);
        res.status(500).json({
            error : "Error getting signed URL"
        });
    }
 });


 // Step 3: Record Uploaded Part
router.post("/upload-part", async (req, res) => {
    try {
      const { uploadId, key, partNumber, ETag, userId } = req.body;
  
      await Upload.updateOne(
        { uploadId, key, userId },
        {
          $push: { parts: { ETag, PartNumber: Number(partNumber) } },
          $set: { status: "in-progress" },
        }
      );
  
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /upload-part:", err);
      res.status(500).json({ error: "Failed to record part" });
    }
  });
  
  // Step 4: Complete Upload
  router.post("/complete-upload", async (req, res) => {
    try {
      const { uploadId, key, userId } = req.body;
  
      const upload = await Upload.findOne({ uploadId, key, userId });
      if (!upload || !upload.parts.length) {
        return res
          .status(404)
          .json({ error: "Upload session not found or no parts uploaded" });
      }
  
      const sortedParts = upload.parts
        .filter((p) => p?.ETag && p?.PartNumber)
        .sort((a, b) => a.PartNumber - b.PartNumber)
        .map((p) => ({
          ETag: `"${p.ETag.replace(/"/g, "")}"`, // wrap ETag in quotes
          PartNumber: p.PartNumber,
        }));
  
      const payload = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts,
        },
      };
  
      const command = new CompleteMultipartUploadCommand(payload);
      const response = await s3.send(command);
  
      await Upload.updateOne(
        { uploadId, key, userId },
        { $set: { status: "completed" } }
      );
  
      res.json({
        message: "Upload completed successfully",
        location: response.Location,
        key: response.Key,
      });
    } catch (err) {
      console.error("Error in /complete-upload:", err);
      res.status(500).json({ error: "Failed to complete upload", details: err });
    }
  });
  
  export default  router;


