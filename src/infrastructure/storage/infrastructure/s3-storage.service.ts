import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ImageStorage,
  UploadedImage,
} from '../domain/image-storage.interface';

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class S3StorageService extends ImageStorage {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicBaseUrl?: string;

  constructor() {
    super();
    this.bucket = process.env.AWS_S3_BUCKET ?? '';
    this.region = process.env.AWS_REGION ?? 'us-east-1';
    this.publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    this.client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async upload(
    file: Express.Multer.File,
    folder = 'general',
  ): Promise<UploadedImage> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'El archivo de imagen está vacío o es inválido',
      );
    }

    const extension = EXTENSION_BY_MIME_TYPE[file.mimetype];
    if (!extension || !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de imagen no permitido. Solo JPG, PNG o WebP',
      );
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    this.logger.log(`Imagen subida a S3: ${key}`);
    return { url, key };
  }
}
