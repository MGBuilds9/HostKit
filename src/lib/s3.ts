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

// Max allowed upload size: 10MB. This is enforced in the upload route (via the
// `size` field in the request body). For PutObject presigned URLs the SDK does
// not support server-side ContentLengthRange conditions (that requires
// presigned POST), so client-side validation in the route is the correct layer.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // ContentLength is not set here because the client supplies it at upload
    // time. Size enforcement is done in the API route before issuing this URL.
  });
  return getSignedUrl(s3, command, { expiresIn: 600 });
}

export { MAX_UPLOAD_BYTES };

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${key}`;
  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}
