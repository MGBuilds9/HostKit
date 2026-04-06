import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.S3_BUCKET ?? "hostkit";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB for images
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB for video

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const isVideo = contentType.startsWith("video/");
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: isVideo ? 1800 : 600 });
}

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${key}`;
  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}
