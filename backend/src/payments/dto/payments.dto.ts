import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod, PaymentSource, PaymentStatus } from '../../common/constants/enums';

export class CreatePaymentDto {
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() payerName?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsEnum(PaymentSource) source?: PaymentSource;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePaymentDto extends CreatePaymentDto {}
