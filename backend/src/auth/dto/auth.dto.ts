import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 100)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class EnableTwoFactorDto {
  @IsString()
  code: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Length(8, 100)
  newPassword: string;
}
