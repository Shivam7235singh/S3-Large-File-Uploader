




import  { useState } from "react";
import axios from "axios";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUploader() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const userId = "demo-user";

    // Step 1: Start Upload
    const { data: startRes } = await axios.post(
      "http://localhost:4000/api/upload/start-upload",
      {
        filename: file.name,
        contentType: file.type,
        userId,
      }
    );

    const { uploadId, key } = startRes;

    // Step 2: Upload Each Chunk using Signed URLs
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;

      // Get signed URL from backend
      const {
        data: { signedUrl },
      } = await axios.get("http://localhost:4000/api/upload/get-signed-url", {
        params: { uploadId, key, partNumber },
      });

      // Upload directly to S3
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: chunk,
      });

      console.log(`uploadRes`, uploadRes);

      const ETag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
      console.log(`ETag`, ETag);

      // Notify backend
      await axios.post("http://localhost:4000/api/upload/upload-part", {
        uploadId,
        key,
        partNumber,
        ETag,
        userId,
      });

      setProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    // Step 3: Complete Upload
    const completeRes = await axios.post(
      "http://localhost:4000/api/upload/complete-upload",
      {
        uploadId,
        key,
        userId,
      }
    );

    setStatus(`✅ Upload complete! File URL: ${completeRes.data.location}`);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto" }}>
      <h2>Large File Uploader (Signed URL)</h2>
      <input type="file" onChange={handleUpload} />
      <div style={{ marginTop: "10px" }}>
        Progress: {progress}%
        <br />
        {status && <p>{status}</p>}
      </div>
    </div>
  );
}
