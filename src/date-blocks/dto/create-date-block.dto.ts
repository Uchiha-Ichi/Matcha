import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDateBlockDto {
  @IsString()
  @IsNotEmpty()
  date_block!: string;

  /**
   * partner — relation object { id: number }
   * Gửi từ frontend: { partner: { id: 1 }, date_block: '2025-12-25' }
   */
  partner?: { id: number };

  /**
   * partner_id — flat form (alternative)
   */
  @IsNumber()
  @Type(() => Number)
  partner_id?: number;
}
