import { usuarios } from '@prisma/client';

export abstract class AuthRepository {
    abstract findByEmail(correo: string): Promise<usuarios | null>;
    abstract create(data: any): Promise<usuarios>;
}