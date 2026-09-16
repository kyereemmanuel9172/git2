import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Success message' })
  message: string;

  constructor(data: T, message = 'Success') {
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request path' })
  path: string;
}

export class IdResponseDto {
  @ApiProperty({ description: 'Record ID' })
  id: string;

  @ApiProperty({ description: 'Success message' })
  message: string;

  constructor(id: string, message = 'Operation successful') {
    this.id = id;
    this.message = message;
  }
}
