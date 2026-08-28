import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { ThrottlerRequest } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const isGraphql = requestProps.context.getType() === ('graphql' as string);
    const prevSetHeaders = this.commonOptions.setHeaders;
    if (isGraphql) {
      this.commonOptions.setHeaders = false;
    }
    try {
      return await super.handleRequest(requestProps);
    } finally {
      this.commonOptions.setHeaders = prevSetHeaders;
    }
  }

  protected async getTracker(
    req: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<string> {
    if (context && context.getType() === ('graphql' as string)) {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctxObj = gqlCtx.getContext<{ req?: Request; request?: Request }>();
      const request = ctxObj?.req ?? ctxObj?.request;
      return Promise.resolve(request?.ip ?? 'unknown');
    }

    const request = req as unknown as Request | undefined;
    return Promise.resolve(request?.ip ?? 'unknown');
  }
}
