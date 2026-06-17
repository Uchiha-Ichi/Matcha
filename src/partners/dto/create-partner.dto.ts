import { IsNotEmpty, IsString, IsBoolean, IsNumber, IsOptional, Matches } from 'class-validator';

export class CreatePartnerDto {
    @IsString()
    @IsNotEmpty()
    band_name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^POINT\([-\d.]+ [-\d.]+\)$/i, {
        message: 'location_gps phải có dạng POINT(longitude latitude), VD: POINT(105.8342 21.0245)'
    })
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

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
