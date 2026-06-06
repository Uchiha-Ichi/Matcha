import { IsNotEmpty, IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDateBlockDto {
  @IsString()
  @IsNotEmpty()
  date_block!: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  /**
   * partner — relation object { id: number }
   * Gửi từ frontend: { partner: { id: 1 }, date_block: '2025-12-25' }
   */
  @IsOptional()
  @IsObject()
  partner?: { id: number };

  /**
   * partner_id — flat form (alternative)
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  partner_id?: number;
}

