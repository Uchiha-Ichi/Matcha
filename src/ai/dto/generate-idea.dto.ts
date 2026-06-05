import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateIdeaDto {
  @IsString({ message: 'Ý tưởng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Ý tưởng không được để trống' })
  prompt!: string;
}
