import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RegisterUseCase } from 'src/auth/application/use-cases/register.use-case';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { CurrentUser } from '../dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Get('perfil')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
