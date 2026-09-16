import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateChurchDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() brandColor?: string;
  @IsOptional() @IsString() serviceTimes?: string;
  @IsOptional() @IsString() plan?: string;

  @IsString() @IsNotEmpty() adminName: string;
  @IsEmail() @IsNotEmpty() adminEmail: string;
}

export class UpdateChurchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() brandColor?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() serviceTimes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() plan?: string;

  @IsOptional() @IsString() premisesName?: string;
  @IsOptional() @IsString() premisesAddress?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() @Min(0) allowedRadiusMeters?: number;
  @IsOptional() @IsNumber() @Min(0) maxGpsUncertainty?: number;
  @IsOptional() @IsBoolean() requireGpsForMembers?: boolean;
  @IsOptional() @IsBoolean() requireGpsForVisitors?: boolean;
  @IsOptional() @IsBoolean() allowQrFallback?: boolean;
  @IsOptional() @IsInt() @Min(0) openBeforeServiceMinutes?: number;
  @IsOptional() @IsInt() @Min(0) closeAfterStartMinutes?: number;
}
