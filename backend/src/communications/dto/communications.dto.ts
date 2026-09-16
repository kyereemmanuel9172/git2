import { IsArray, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, MemberStatus } from '../../common/constants/enums';

const validTypes = ['SMS', 'EMAIL', 'CALL'] as const;

export class CreateCommunicationDto {
  @ApiProperty({ description: 'Communication channel', enum: validTypes })
  @IsIn(validTypes)
  type: string;

  @ApiPropertyOptional({ description: 'Email subject (required for EMAIL type)', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ description: 'Message body. Supports {firstName}, {lastName}, {name} template variables', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Filter by membership status', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(MemberStatus), { each: true })
  memberStatus?: string[];

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by gender', enum: Object.values(Gender) })
  @IsOptional()
  @IsIn(Object.values(Gender))
  gender?: string;

  @ApiPropertyOptional({ description: 'Filter by city', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Schedule for later (ISO 8601 datetime)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCommunicationDto {
  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Message body' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({ description: 'Schedule time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Filter by membership status', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(MemberStatus), { each: true })
  memberStatus?: string[];

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by gender', enum: Object.values(Gender) })
  @IsOptional()
  @IsIn(Object.values(Gender))
  gender?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class DirectMessageDto {
  @ApiProperty({ description: 'Communication channel', enum: validTypes })
  @IsIn(validTypes)
  type: string;

  @ApiProperty({ description: 'Target member ID' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ description: 'Email subject (required for EMAIL type)', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ description: 'Message body. Supports {firstName}, {lastName}, {name} template variables', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}

export class LogCallDto {
  @ApiProperty({ description: 'Member ID who was called' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiPropertyOptional({ description: 'Call note or summary', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}

export class AudienceCountQueryDto {
  @ApiProperty({ description: 'Communication channel', enum: validTypes })
  @IsIn(validTypes)
  type: string;

  @ApiPropertyOptional({ description: 'Comma-separated membership statuses' })
  @IsOptional()
  @IsString()
  memberStatus?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Gender filter', enum: Object.values(Gender) })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;
}
