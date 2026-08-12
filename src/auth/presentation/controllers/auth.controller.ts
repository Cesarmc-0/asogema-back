import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RegisterUseCase } from 'src/auth/application/use-cases/register.use-case';
import { UpdateProfileUseCase } from 'src/auth/application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from 'src/auth/application/use-cases/change-password.use-case';
import { RefreshTokenUseCase } from 'src/auth/application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from 'src/auth/application/use-cases/logout.use-case';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { CurrentUser } from '../dto/decorators/current-user.decorator';
import { Public } from '../dto/decorators/public.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 201, description: 'Token JWT generado' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @Post('tokens')
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  @Post('users')
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  @ApiResponse({ status: 201, description: 'Nuevo par de tokens emitido' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o revocado',
  })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Cerrar sesión y revocar refresh token' })
  @ApiResponse({ status: 201, description: 'Sesión cerrada' })
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.logoutUseCase.execute(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @Get('users/me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @Patch('users/me')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateProfileUseCase.execute(user.id, {
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono,
      direccion: dto.direccion,
      fecha_nacimiento: dto.fecha_nacimiento
        ? new Date(dto.fecha_nacimiento)
        : undefined,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @Patch('users/me/password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.changePasswordUseCase.execute(user.id, {
      current_password: dto.current_password,
      new_password: dto.new_password,
    });
  }
}
