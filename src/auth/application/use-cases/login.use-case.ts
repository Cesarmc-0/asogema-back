import {  Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { AuthRepository } from "src/auth/domain/repositories/auth.repository.interface";
import { LoginDto } from "src/auth/presentation/dto/login.dto";

@Injectable()
export class LoginUseCase{
    constructor(
        private authRepository:AuthRepository,
        private jwtService: JwtService,
    ){}

    async execute(dto:LoginDto){
        const user = await this.authRepository.findByEmail(dto.correo);
        if (!user || !user.estado) throw new UnauthorizedException('credenciales invalidas');

        const valid = await bcrypt.compare(dto.password, user.password_hash);
        if(!valid) throw new UnauthorizedException('credenciales invalidas');

        const payload = {sub:user.id.toString(), correo:user.correo, rol:user.rol_id.toString()};
        const access_token = this.jwtService.sign(payload);

        return {access_token,usuario:{id:user.id,nombre:user.nombre,apellido:user.apellido,correo:user.correo}};
    }
}