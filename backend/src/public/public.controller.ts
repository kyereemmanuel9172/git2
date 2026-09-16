import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MembersService } from '../members/members.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private membersService: MembersService) {}

  @Get('member/:code')
  async getMember(@Param('code') code: string) {
    const member = await this.membersService.findByMemberId(code);
    if (!member) return null;
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      photoUrl: member.photoUrl,
      memberId: member.memberId,
      family: member.family,
      departmentLinks: member.departmentLinks,
    };
  }
}
