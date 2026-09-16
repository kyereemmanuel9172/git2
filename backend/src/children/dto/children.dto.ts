import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChildDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianPhone?: string;
  @IsOptional() @IsString() ministry?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() notes?: string;
}
