import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrayerStatus } from '../../common/constants/enums';

export class CreatePrayerRequestDto {
  @IsOptional() @IsString() memberId?: string;
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() content: string;
  @IsOptional() isPublic?: boolean;
}

export class UpdatePrayerRequestDto {
  @IsOptional() @IsEnum(PrayerStatus) status?: PrayerStatus;
  @IsOptional() @IsString() prayedBy?: string;
}

export class CreateCounselingDto {
  @IsString() @IsNotEmpty() memberId: string;
  @IsOptional() @IsString() counselorId?: string;
  @Type(() => Date) @IsDate() date: Date;
  @IsString() @IsNotEmpty() topic: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Date) @IsDate() followUpDate?: Date;
  @IsOptional() @IsString() status?: string;
}
