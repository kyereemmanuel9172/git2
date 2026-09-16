import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class PortalLoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdatePortalProfileDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() occupation?: string;
}

export class ChangePortalPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @Length(8, 100)
  newPassword: string;
}

export class CreatePortalPrayerRequestDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() content: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class SetPortalPasswordDto {
  @IsString()
  @Length(8, 100)
  password: string;
}

export class PortalForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class PortalResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Length(8, 100)
  newPassword: string;
}
