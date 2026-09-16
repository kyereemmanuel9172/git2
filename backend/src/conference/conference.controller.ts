import { Body, Controller, Get, Param, Post, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConferenceService } from './conference.service';
import { DeliveryService } from '../communications/delivery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/enums';

@ApiTags('conference')
@Controller('conference')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConferenceController {
  constructor(
    private readonly conference: ConferenceService,
    private readonly delivery: DeliveryService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  create() {
    const roomId = crypto.randomUUID();
    return { roomId, createdAt: new Date() };
  }

  @Get(':roomId')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  get(@Param('roomId') roomId: string) {
    return {
      roomId,
      participants: this.conference.getParticipants(roomId),
      count: this.conference.getParticipants(roomId).length,
    };
  }

  @Post('phone-call')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  async phoneCall(
    @Body() body: { numbers: string[]; message?: string },
  ) {
    if (!body.numbers || body.numbers.length === 0) {
      throw new HttpException('At least one phone number is required', HttpStatus.BAD_REQUEST);
    }

    const results: Array<{ number: string; ok: boolean; error?: string }> = [];
    const script = body.message || 'Hello, this is a call from your church. God bless you.';

    for (const number of body.numbers) {
      try {
        await this.delivery.makeCall(number, script);
        results.push({ number, ok: true });
      } catch (err) {
        results.push({
          number,
          ok: false,
          error: err instanceof Error ? err.message : 'Call failed',
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return { succeeded, failed, results };
  }
}
