import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

const PRISMA_ERROR_MAP: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'A record with this value already exists' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Related record not found' },
  P2014: { status: HttpStatus.BAD_REQUEST, message: 'Required relation violated' },
  P2024: { status: HttpStatus.REQUEST_TIMEOUT, message: 'Database operation timed out' },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      message =
        typeof exResponse === 'string'
          ? exResponse
          : ((exResponse as Record<string, unknown>).message as string) ?? message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
      } else {
        this.logger.error(`Prisma error: ${exception.code}`, exception.stack);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      this.logger.warn(`Prisma validation: ${exception.message}`);
    } else if (exception instanceof Error) {
      this.logger.error(`${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
