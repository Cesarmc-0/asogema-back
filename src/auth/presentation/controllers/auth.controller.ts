import { Controller, Post, Body } from "@nestjs/common";
import { LoginUseCase } from "src/auth/application/use-cases/login.use-case";
import { RegisterUseCase } from "src/auth/application/use-cases/register.use-case";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly loginUseCase: LoginUseCase,
        private readonly registerUseCase: RegisterUseCase,
    ){}

    @Post('login')
    login(@Body() dto: LoginDto){
        return this.loginUseCase.execute(dto);
    }

    @Post('register')
    register(@Body() dto:RegisterDto){
        return this.registerUseCase.execute(dto);
    }
}