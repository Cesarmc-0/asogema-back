import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

export const GqlCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const gqlCtx = GqlExecutionContext.create(ctx);
    const { req } = gqlCtx.getContext<{
      req: Request & { user: AuthenticatedUser };
    }>();
    return req.user;
  },
);
