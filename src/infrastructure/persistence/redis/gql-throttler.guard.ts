import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Si Nest pasó un ExecutionContext, detectarlo por switchToHttp
    if (req && typeof (req as unknown as { switchToHttp?: () => void }).switchToHttp === 'function') {
      const ctx = req as unknown as ExecutionContext;
      const gqlCtx = GqlExecutionContext.create(ctx);
      const ctxObj = gqlCtx.getContext<{ req?: Request; request?: Request }>();
      const request = ctxObj?.req ?? ctxObj?.request;
      return await Promise.resolve(request?.ip ?? 'unknown');
    }

    // req es un objeto con .req o .request
    const possibleReq = (req as Record<string, unknown>).req ?? 
                        (req as Record<string, unknown>).request ?? 
                        req;
    const ipValue = (possibleReq as { ip?: string }).ip ?? 'unknown';
    return await Promise.resolve(ipValue);
  }
}
