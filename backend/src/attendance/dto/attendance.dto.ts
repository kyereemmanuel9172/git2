import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceType } from '../../common/constants/enums';

export class CheckInDto {
  @IsString() @IsNotEmpty() memberId: string;
  @IsEnum(ServiceType) serviceType: ServiceType;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @Type(() => Date) @IsDate() checkedInAt?: Date;
  @IsOptional() @IsString() notes?: string;
}

export class CheckOutDto {
  @IsOptional() @IsString() recordId?: string;
  @IsOptional() @IsString() @IsNotEmpty() memberId?: string;
  @IsOptional() @IsEnum(ServiceType) serviceType?: ServiceType;
}

export class QueryAttendanceDto {
  @IsOptional() @IsEnum(ServiceType) serviceType?: ServiceType;
  @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}
