const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Upload a file buffer to the configured storage backend.
 * @param {Buffer} buffer - File content
 * @param {string} filePath - Relative path within storage (e.g. "invoices/abc.pdf")
 * @returns {string} Stored path
 */
async function uploadFile(buffer, filePath) {
  if (config.storage.type === 's3') {
    return uploadToS3(buffer, filePath);
  }
  return uploadToLocal(buffer, filePath);
}

async function uploadToLocal(buffer, filePath) {
  const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, buffer);
  return filePath;
}

async function uploadToS3(buffer, filePath) {
  // S3 implementation placeholder.
  // To enable: npm install @aws-sdk/client-s3, set STORAGE_TYPE=s3,
  // and configure S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({ region: config.storage.s3.region });
  await client.send(new PutObjectCommand({
    Bucket: config.storage.s3.bucket,
    Key: filePath,
    Body: buffer,
  }));
  return filePath;
}

/**
 * Get the public URL for a stored file.
 * @param {string} filePath - Relative path returned by uploadFile
 * @returns {string} Public URL
 */
function getFileUrl(filePath) {
  if (config.storage.type === 's3') {
    const { bucket, region } = config.storage.s3;
    return `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  }
  return `/uploads/${filePath}`;
}

/**
 * Delete a stored file.
 * @param {string} filePath - Relative path returned by uploadFile
 */
async function deleteFile(filePath) {
  if (config.storage.type === 's3') {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({ region: config.storage.s3.region });
    await client.send(new DeleteObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: filePath,
    }));
    return;
  }
  const fullPath = path.join(LOCAL_UPLOAD_DIR, filePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { uploadFile, getFileUrl, deleteFile };
