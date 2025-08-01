import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 원하는 폴더명 지정 가능 (stamps/, menus/, reviews/...)
/**
 * @param {Express.Multer.File} file - multer로 받은 단일 파일 객체
 * @param {string} folder - S3에 저장할 폴더명 (예: 'stamps', 'reviews')
 * @returns {string} S3에 저장된 파일의 public URL
 */
export const uploadToS3 = async (file) => {
  const fileKey = `${folder}/${Date.now()}_${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);
  // v3에서는 결과에 Location이 없어서 직접 만들어야 함
  const location = `https://${uploadParams.Bucket}.s3.${s3.config.region}.amazonaws.com/${fileKey}`;
  return location;
};
