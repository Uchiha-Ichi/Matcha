import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateFeedbackDto {
  @IsNumber()
  @IsNotEmpty()
  booking_detail_id!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;
}
