import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateConceptDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    image?: string;
}
