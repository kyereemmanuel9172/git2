import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType } from '../../common/constants/enums';

export class CreateTransactionDto {
  @IsEnum(TransactionType) type: TransactionType;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @IsString() memberId?: string;
}

export class UpdateTransactionDto extends CreateTransactionDto {}
