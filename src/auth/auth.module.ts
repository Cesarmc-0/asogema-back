import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './presentation/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { ResendCodeUseCase } from './application/use-cases/resend-code.use-case';
import { CreateAdminService } from './application/use-cases/create-admin.use-case';
import { TokenService } from './application/services/token.service';
import { EmailVerificationService } from './application/services/email-verification.service';
import { AuthRepository } from './domain/repositories/auth.repository.interface';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { AuthRepositoryImpl } from './infrastructure/persistence/auth.repository';
import { RefreshTokenRepositoryImpl } from './infrastructure/persistence/refresh-token.repository';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as StringValue,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RegisterUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,
    ResendCodeUseCase,
    CreateAdminService,
    TokenService,
    EmailVerificationService,
    JwtStrategy,
    { provide: AuthRepository, useClass: AuthRepositoryImpl },
    {
      provide: RefreshTokenRepository,
      useClass: RefreshTokenRepositoryImpl,
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly createAdmin: CreateAdminService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.createAdmin.ensureAdmin();
    } catch {
      // fail-safe: BD inalcanzable en startup local
    }
  }
}
