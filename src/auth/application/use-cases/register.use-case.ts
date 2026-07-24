import { Injectable, ConflictException } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { AuthRepository } from "src/auth/domain/repositories/auth.repository.interface";
import { RegisterDto } from "src/auth/presentation/dto/register.dto";

@Injectable()
export class RegisterUseCase{
    constructor(private authRepository:AuthRepository){}

    async execute(dto:RegisterDto){
        const existing = await this.authRepository.findByEmail(dto.correo);
        if (existing) throw new ConflictException('El correo ya se encuentra registrado');

        const password_hash = await bcrypt.hash(dto.password,10);
        const {password,...rest} = dto;

        return this.authRepository.create({
            ...rest,
            password_hash,
            rol_id: 2,
        });
    }
}