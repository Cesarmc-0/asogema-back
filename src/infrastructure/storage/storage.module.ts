import { Module } from '@nestjs/common';
import { ImageStorage } from './domain/image-storage.interface';
import { S3StorageService } from './infrastructure/s3-storage.service';

@Module({
  providers: [{ provide: ImageStorage, useClass: S3StorageService }],
  exports: [ImageStorage],
})
export class StorageModule {}
