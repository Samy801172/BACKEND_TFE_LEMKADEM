import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RawBodyRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.rawBody;
  },
); 