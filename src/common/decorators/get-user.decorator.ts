import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Member } from '../../entities/member.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Member => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
