import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  partner_concept_id?: number;
}
