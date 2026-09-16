import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PortalMember {
  id: string;
  firstName: string;
  lastName: string;
  memberId: string | null;
  churchId: string;
}

export const CurrentMember = createParamDecorator(
  (data: keyof PortalMember | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const member = request.user as PortalMember;
    return data ? member?.[data] : member;
  },
);
