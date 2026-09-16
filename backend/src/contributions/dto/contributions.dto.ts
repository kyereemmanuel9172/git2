import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ContributionStatus, ContributionType, PaymentMethod } from '../../common/constants/enums';

export class CreateContributionDto {
  @IsEnum(ContributionType) type: ContributionType;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @IsOptional() @IsEnum(ContributionStatus) status?: ContributionStatus;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() giverName?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContributionDto extends CreateContributionDto {}
