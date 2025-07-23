import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (file) => {
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `reviews/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(uploadParams);
  const result = await s3.send(command);
  // v3에서는 결과에 Location이 없어서 직접 만들어야 함
  const location = `https://${uploadParams.Bucket}.s3.${s3.config.region}.amazonaws.com/${uploadParams.Key}`;
  return location;
};
