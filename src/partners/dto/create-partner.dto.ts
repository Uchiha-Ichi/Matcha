import { IsNotEmpty, IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreatePartnerDto {
    @IsString()
    @IsNotEmpty()
    band_name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    location_gps!: string;

    @IsString()
    @IsOptional()
    cover_image?: string;

    @IsString()
    @IsOptional()
    location_name?: string;

    @IsNumber()
    @IsNotEmpty()
    user_id!: number;

    @IsNumber()
    @IsOptional()
    categories_id?: number;
}
