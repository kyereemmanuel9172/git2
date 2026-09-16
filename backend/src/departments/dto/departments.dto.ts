import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() leaderId?: string;
}

export class AssignMemberDto {
  @IsString() @IsNotEmpty() memberId: string;
  @IsOptional() @IsString() role?: string;
}
