import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Role } from '../../common/constants/enums';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 100)
  password: string;

  @IsString()
  name: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  isActive?: boolean;
}
