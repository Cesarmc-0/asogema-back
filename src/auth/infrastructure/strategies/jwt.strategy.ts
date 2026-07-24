import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "src/infrastructure/persistence/postgres/prisma.service";
import { AuthenticatedUser } from "src/auth/domain/interfaces/authenticated-user.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private prisma:PrismaService){
        super({
            jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'secret-dev',
        });
    }

    async validate(payload:{sub:string}): Promise<AuthenticatedUser> {
        const user = await this.prisma.usuarios.findUnique({where:{id:BigInt(payload.sub)}});
        if(!user || !user.estado) throw new UnauthorizedException();
        return {id:user.id, correo:user.correo, rol:user.rol_id};
    }
}