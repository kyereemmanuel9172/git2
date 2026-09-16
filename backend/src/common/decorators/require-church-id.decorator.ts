import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const RequireChurchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.churchId) {
      throw new BadRequestException('Church ID is required for this operation');
    }
    return user.churchId;
  },
);
