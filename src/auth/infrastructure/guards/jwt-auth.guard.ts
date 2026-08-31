import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from 'src/auth/presentation/dto/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext): unknown {
    const gqlCtx = GqlExecutionContext.create(context);
    if (gqlCtx.getType() === 'graphql') {
      const { req } = gqlCtx.getContext<{ req?: unknown }>();
      return req;
    }
    return context.switchToHttp().getRequest();
  }
}
