import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { EventStatus } from '../../common/constants/enums';

export class CreateEventDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() location?: string;
  @Type(() => Date) @IsDate() startDate: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
}

export class RegisterDto {
  @IsString() @IsNotEmpty() memberId: string;
}

export class UpdateRegistrationDto {
  @IsOptional() attended?: boolean;
  @IsOptional() @IsString() status?: string;
}
