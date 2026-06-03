import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

const AVATAR_SIZE = 200;
const AVATAR_FORMAT = "webp";
const AVATAR_QUALITY = 80;

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private avatarFolder: string;
  private maxSizeMB: number;

  constructor() {
    const region = process.env.AWS_REGION || "eu-west-1";
    const bucket = process.env.AWS_S3_BUCKET;
    const maxSize = parseInt(process.env.AVATAR_MAX_SIZE_MB || "5", 10);

    if (!bucket) {
      throw new Error("AWS_S3_BUCKET environment variable is not set");
    }

    this.bucketName = bucket;
    this.avatarFolder = process.env.S3_AVATAR_FOLDER || "avatars/";
    this.maxSizeMB = maxSize;

    this.s3Client = new S3Client({
      region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // Uses IAM role if credentials not provided
    });
  }

  /**
   * Verify bucket is accessible (called once on startup)
   */
  async verifyBucket(): Promise<void> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3Client.send(command);
      console.log(`✓ S3 bucket "${this.bucketName}" is accessible`);
    } catch (error) {
      throw new Error(
        `S3 bucket "${this.bucketName}" is not accessible. Check bucket name, region, and IAM permissions. Error: ${error}`
      );
    }
  }

  /**
   * Upload and compress avatar image
   * Returns: S3 object key (e.g., "avatars/player-uuid.webp")
   */
  async uploadAvatar(playerId: string, imageBuffer: Buffer): Promise<string> {
    // Validate size
    const fileSizeMB = imageBuffer.length / (1024 * 1024);
    if (fileSizeMB > this.maxSizeMB) {
      throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${this.maxSizeMB}MB`);
    }

    // Validate and compress image
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(imageBuffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: AVATAR_QUALITY })
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to process image: ${error}`);
    }

    // Generate object key
    const objectKey = `${this.avatarFolder}${playerId}.${AVATAR_FORMAT}`;

    // Upload to S3
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: processedBuffer,
        ContentType: "image/webp",
        CacheControl: `public, max-age=${process.env.AVATAR_CACHE_MAX_AGE || 31536000}`,
        Metadata: {
          "uploaded-at": new Date().toISOString(),
          "player-id": playerId,
        },
      });
      console.log(`Uploading avatar for playerId=${playerId} to S3 : ${this.bucketName}`);
      await this.s3Client.send(command);
      console.log(`✓ Avatar uploaded to S3: ${objectKey}`);
      return objectKey;
    } catch (error) {
      throw new Error(`Failed to upload avatar to S3: ${error}`);
    }
  }

  /**
   * Get avatar from S3 as buffer (for serving)
   */
  async getAvatarBuffer(playerId: string): Promise<Buffer | null> {
    const objectKey = `${this.avatarFolder}${playerId}.${AVATAR_FORMAT}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);
      if (!response.Body) return null;

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return null;
      }
      throw new Error(`Failed to retrieve avatar from S3: ${error}`);
    }
  }

  /**
   * Get signed URL for avatar (for client-side display)
   * Useful for direct S3 access without going through API
   */
  async getSignedAvatarUrl(playerId: string, expiresIn: number = 3600): Promise<string | null> {
    const objectKey = `${this.avatarFolder}${playerId}.${AVATAR_FORMAT}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error: any) {
      if (error.name === "NoSuchKey") {
        return null;
      }
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Delete avatar from S3
   */
  async deleteAvatar(playerId: string): Promise<void> {
    const objectKey = `${this.avatarFolder}${playerId}.${AVATAR_FORMAT}`;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      await this.s3Client.send(command);
      console.log(`✓ Avatar deleted from S3: ${objectKey}`);
    } catch (error) {
      throw new Error(`Failed to delete avatar from S3: ${error}`);
    }
  }

  /**
   * Validate MIME type of uploaded file
   */
  static validateImageMimeType(mimeType: string): boolean {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    return validTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get S3 object key for a player
   */
  getAvatarObjectKey(playerId: string): string {
    return `${this.avatarFolder}${playerId}.${AVATAR_FORMAT}`;
  }
}

// Singleton instance
let s3ServiceInstance: S3Service | null = null;

export function getS3Service(): S3Service {
  if (!s3ServiceInstance) {
    s3ServiceInstance = new S3Service();
  }
  return s3ServiceInstance;
}
