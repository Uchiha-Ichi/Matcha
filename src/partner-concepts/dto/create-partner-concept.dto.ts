import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePartnerConceptDto {
    @IsNumber()
    @IsNotEmpty()
    price!: number;

    @IsString()
    @IsOptional()
    time?: string;

    @IsString()
    @IsOptional()
    image_des?: string;
}
