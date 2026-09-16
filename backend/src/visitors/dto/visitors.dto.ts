import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVisitorDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() memberType?: string;
  @IsOptional() @IsString() hostName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() followedUp?: boolean;
}
