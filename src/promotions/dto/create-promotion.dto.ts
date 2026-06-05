import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  max_discount?: number;

  @IsDateString()
  @IsOptional()
  expired_at?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
