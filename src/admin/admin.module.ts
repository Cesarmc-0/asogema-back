import { Module } from '@nestjs/common';
import { AdminController } from './presentation/controllers/admin.controller';

@Module({
  controllers: [AdminController],
})
export class AdminModule {}
