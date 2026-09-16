import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AssetCondition, AssetType } from '../../common/constants/enums';

export class CreateAssetDto {
  @IsString() name: string;
  @IsOptional() @IsEnum(AssetType) type?: AssetType;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @Type(() => Date) @IsDate() purchaseDate?: Date;
  @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateMaintenanceDto {
  @IsString() description: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() performedBy?: string;
  @IsOptional() @Type(() => Date) @IsDate() nextDueDate?: Date;
}
