import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

let s3;
if (config.storageDriver === 's3') {
  if (!config.s3Bucket || !config.s3Region || !config.s3AccessKeyId || !config.s3SecretAccessKey) {
    throw new Error('S3 storage selected but required S3 environment variables are missing');
  }
  s3 = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint || undefined,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey }
  });
}
export async function saveImage({ ownerId, bytes, mimeType, kind }) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new AppError(400,'EMPTY_IMAGE','Image data is empty.');
  if (!['image/png','image/jpeg','image/webp'].includes(mimeType)) throw new AppError(415,'UNSUPPORTED_IMAGE','Only PNG, JPEG and WebP images are supported.');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const key = `${ownerId}/${kind}/${crypto.randomUUID()}.${ext}`;
  if (config.storageDriver === 's3') {
    await s3.send(new PutObjectCommand({ Bucket: config.s3Bucket, Key: key, Body: bytes, ContentType: mimeType, ServerSideEncryption: 'AES256' }));
  } else {
    const root = path.resolve(config.localStorageDir);
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) throw new AppError(400,'INVALID_STORAGE_KEY','Invalid storage key.');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
  }
  return { storageKey: key, mimeType, sizeBytes: bytes.length };
}
export async function getImageBuffer(storageKey) {
  if (config.storageDriver === 's3') {
    const out = await s3.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: storageKey }));
    const chunks = [];
    for await (const chunk of out.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  const root = path.resolve(config.localStorageDir);
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(root + path.sep)) throw new AppError(400,'INVALID_STORAGE_KEY','Invalid storage key.');
  return fs.readFile(target);
}
export async function getAssetUrl(storageKey) {
  if (config.storageDriver === 's3') {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.s3Bucket, Key: storageKey }), { expiresIn: config.signedUrlTtlSeconds });
  }
  return null; // Local files are streamed by an authenticated API endpoint.
}
