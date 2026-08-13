import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pravah-storage';

// R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: endpoint || 'https://mock-account.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: accessKeyId || 'mock_access_key',
    secretAccessKey: secretAccessKey || 'mock_secret_key',
  },
});

/**
 * Check connectivity with Cloudflare R2
 */
export async function checkR2Connection(): Promise<{
  connected: boolean;
  message: string;
  bucketName: string;
  endpoint: string;
}> {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return {
      connected: false,
      message: 'Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing in environment variables.',
      bucketName: R2_BUCKET_NAME,
      endpoint: endpoint || 'Not configured',
    };
  }

  try {
    // Ping bucket using ListObjectsV2 or HeadBucket
    await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        MaxKeys: 1,
      })
    );

    return {
      connected: true,
      message: `Successfully connected to Cloudflare R2 bucket "${R2_BUCKET_NAME}"!`,
      bucketName: R2_BUCKET_NAME,
      endpoint,
    };
  } catch (error: any) {
    console.error('Cloudflare R2 Connection Error:', error);
    return {
      connected: false,
      message: `Cloudflare R2 Connection Failed: ${error.message}`,
      bucketName: R2_BUCKET_NAME,
      endpoint,
    };
  }
}

/**
 * Upload buffer or string to Cloudflare R2
 */
export async function uploadToR2({
  fileBuffer,
  fileName,
  contentType = 'application/octet-stream',
}: {
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  contentType?: string;
}) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  return {
    bucket: R2_BUCKET_NAME,
    fileName,
    url: `${endpoint}/${R2_BUCKET_NAME}/${fileName}`,
  };
}

/**
 * Generate presigned download URL for a file in R2
 */
export async function getR2PresignedUrl(fileName: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Permanently removes objects from R2.
 *
 * Used by retention and account deletion, where leaving the bytes behind after
 * deleting the rows that point at them would mean the data is unreachable but
 * not actually gone — which is not what a deletion request asks for.
 *
 * Reports what failed rather than throwing, so one bad key cannot abandon a
 * purge partway through and leave the rest of the batch orphaned.
 */
export async function deleteFromR2(
  keys: string[]
): Promise<{ deleted: number; failed: { key: string; reason: string }[] }> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return { deleted: 0, failed: [] };

  let deleted = 0;
  const failed: { key: string; reason: string }[] = [];

  // The API caps a delete request at 1000 keys.
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000);
    try {
      const res = await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
      deleted += batch.length - (res.Errors?.length ?? 0);
      for (const err of res.Errors ?? []) {
        failed.push({ key: err.Key || 'unknown', reason: err.Message || 'unknown error' });
      }
    } catch (error: any) {
      for (const key of batch) failed.push({ key, reason: error.message });
    }
  }

  return { deleted, failed };
}

/**
 * Download object from Cloudflare R2 as a Buffer
 */
export async function downloadFromR2(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  
  if (!response.Body) {
    throw new Error('Empty response body from R2');
  }

  const bytes = await response.Body.transformToByteArray();
  
  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType || 'application/octet-stream',
  };
}
