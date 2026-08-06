import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { CreateAdminService } from './application/use-cases/create-admin.use-case';
import { AuthRepository } from './domain/repositories/auth.repository.interface';
import { AuthRepositoryImpl } from './infrastructure/persistence/auth.repository';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RegisterUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    CreateAdminService,
    JwtStrategy,
    { provide: AuthRepository, useClass: AuthRepositoryImpl },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly createAdmin: CreateAdminService) {}

  async onModuleInit(): Promise<void> {
    await this.createAdmin.ensureAdmin();
  }
}
