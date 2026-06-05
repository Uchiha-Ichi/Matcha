import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartnerConceptDto {
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    price!: number;

    @IsString()
    @IsOptional()
    time?: string;

    @IsString()
    @IsOptional()
    image_des?: string;

    /**
     * partner_id — ID của partner sở hữu concept này
     */
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    partner_id!: number;

    /**
     * concept_id — ID của concept (loại chụp ảnh)
     */
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    concept_id!: number;
}
