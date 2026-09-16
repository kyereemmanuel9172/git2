import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, entity?: string, entityId?: string, details?: string, userId?: string, ipAddress?: string) {
    try {
      await this.prisma.auditLog.create({
        data: { action, entity, entityId, details, userId, ipAddress },
      });
    } catch {
      // Audit logging should never break the main request
    }
  }
}
