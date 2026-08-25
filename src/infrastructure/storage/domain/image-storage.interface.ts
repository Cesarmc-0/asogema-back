export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const UPLOAD_FOLDERS: readonly string[] = [
  'general',
  'salones',
  'tipos-habitacion',
  'habitaciones',
  'productos',
];

export const DEFAULT_UPLOAD_FOLDER = 'general';

export interface UploadedImage {
  url: string;
  key: string;
}

export abstract class ImageStorage {
  abstract upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadedImage>;
}
