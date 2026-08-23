import { Module } from '@nestjs/common';
import { AdminController } from './presentation/controllers/admin.controller';
import { EmployeeController } from './presentation/controllers/employee.controller';
import { StorageModule } from 'src/infrastructure/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AdminController, EmployeeController],
})
export class AdminModule {}
