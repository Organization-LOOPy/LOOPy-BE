import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-northeast-2",
});

export const uploadToS3 = async (file) => {
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `reviews/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const result = await s3.upload(uploadParams).promise();
  return result.Location;
};
