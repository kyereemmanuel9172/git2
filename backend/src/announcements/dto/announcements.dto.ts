import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnnouncementStatus, Gender, MemberStatus } from '../../common/constants/enums';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(MemberStatus), { each: true })
  memberStatus?: string[];

  @IsOptional()
  @IsIn(Object.values(Gender))
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(Object.values(AnnouncementStatus))
  status?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(MemberStatus), { each: true })
  memberStatus?: string[];

  @IsOptional()
  @IsIn(Object.values(Gender))
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(Object.values(AnnouncementStatus))
  status?: string;
}
