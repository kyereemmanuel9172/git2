import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateServiceDayDto {
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(0) @Max(6) weekday: number;
  @IsString() @IsNotEmpty() startTime: string;
}

export class SetTodayServiceDto {
  @IsString() @IsNotEmpty() serviceDayId: string;
  @IsOptional() @IsString() date?: string;
}
