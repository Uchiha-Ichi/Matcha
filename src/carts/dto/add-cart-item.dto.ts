import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  @IsNotEmpty()
  partner_concept_id!: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number = 1;
}
