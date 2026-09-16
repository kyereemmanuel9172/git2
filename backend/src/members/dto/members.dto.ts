import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEmail, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { Gender, MemberStatus } from '../../common/constants/enums';

export class SetPortalPasswordDto {
  @IsString()
  @Length(8, 100)
  password: string;
}

export class CreateMemberDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsEnum(Gender) gender: Gender;
  @IsOptional() @Type(() => Date) @IsDate() dateOfBirth?: Date;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() churchBranch?: string;
  @IsOptional() @IsEnum(MemberStatus) membershipStatus?: MemberStatus;
  @IsOptional() @Type(() => Date) @IsDate() joinDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() baptismDate?: Date;
  @IsOptional() @IsString() familyId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) departmentIds?: string[];
}

export class UpdateMemberDto {
  @IsOptional() @IsString() @IsNotEmpty() firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @Type(() => Date) @IsDate() dateOfBirth?: Date;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() churchBranch?: string;
  @IsOptional() @IsEnum(MemberStatus) membershipStatus?: MemberStatus;
  @IsOptional() @Type(() => Date) @IsDate() joinDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() baptismDate?: Date;
  @IsOptional() @IsString() familyId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) departmentIds?: string[];
}

export class CreateFamilyDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() headMemberId?: string;
}

export class ImportMembersDto {
  @IsArray()
  @IsObject({ each: true })
  members: Array<Record<string, unknown>>;
}
