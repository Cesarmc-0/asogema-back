import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  // Match ThrottlerGuard signature: accepts a request-like object and returns Promise<string>
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If Nest passed an ExecutionContext (some versions do), detect it by presence of switchToHttp
    if (req && typeof (req as any).switchToHttp === 'function') {
      const ctx = req as unknown as ExecutionContext;
      const gqlCtx = GqlExecutionContext.create(ctx);
      const ctxObj = gqlCtx.getContext<{ req?: Request; request?: Request }>();
      const request = ctxObj?.req ?? ctxObj?.request;
      return request?.ip ?? 'unknown';
    }

    // Otherwise, req is an object that may contain the original request under .req or .request
    const possibleReq = req.req ?? req.request ?? req;
    return possibleReq?.ip ?? 'unknown';
  }
}
