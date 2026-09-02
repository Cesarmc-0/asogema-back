import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { ROLES_KEY } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const gqlCtx = GqlExecutionContext.create(context);
    let request: Request & { user: AuthenticatedUser };
    if (gqlCtx.getType() === 'graphql') {
      const graphqlCtx = gqlCtx.getContext<{ req: Request }>();
      request = graphqlCtx.req as Request & { user: AuthenticatedUser };
    } else {
      request = context.switchToHttp().getRequest();
    }

    const { user } = request;
    return requiredRoles.includes(user.rol_nombre);
  }
}
