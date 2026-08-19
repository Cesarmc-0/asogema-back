import { Module } from '@nestjs/common';
import { AdminController } from './presentation/controllers/admin.controller';
import { EmployeeController } from './presentation/controllers/employee.controller';

@Module({
  controllers: [AdminController, EmployeeController],
})
export class AdminModule {}
