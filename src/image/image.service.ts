import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Image, ImageTargetType } from './entities/image.entity';

@Injectable()
export class ImageService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'matcha',
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new BadRequestException(`Upload ảnh thất bại: ${error.message}`));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new BadRequestException('Upload ảnh thất bại: Không nhận được kết quả'));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async createImage(targetType: ImageTargetType, targetId: number, imageSrc: string, isPrimary: boolean = false): Promise<Image> {
    if (isPrimary) {
      await this.imagesRepository.update(
        { target_type: targetType, target_id: targetId },
        { is_primary: 0 }
      );
    }
    const image = this.imagesRepository.create({
      target_type: targetType,
      target_id: targetId,
      image_src: imageSrc,
      is_primary: isPrimary ? 1 : 0,
    });
    return await this.imagesRepository.save(image);
  }

  async getImagesForTarget(targetType: ImageTargetType, targetId: number): Promise<Image[]> {
    return await this.imagesRepository.find({
      where: { target_type: targetType, target_id: targetId },
      order: { is_primary: 'DESC', created_at: 'ASC' }
    });
  }

  async getPrimaryImageForTarget(targetType: ImageTargetType, targetId: number): Promise<Image | null> {
    return await this.imagesRepository.findOne({
      where: { target_type: targetType, target_id: targetId, is_primary: 1 }
    });
  }

  async updatePrimaryImage(targetType: ImageTargetType, targetId: number, imageSrc: string): Promise<Image> {
    const existingPrimary = await this.getPrimaryImageForTarget(targetType, targetId);
    if (existingPrimary) {
      existingPrimary.image_src = imageSrc;
      return await this.imagesRepository.save(existingPrimary);
    } else {
      return await this.createImage(targetType, targetId, imageSrc, true);
    }
  }

  async deleteImagesForTarget(targetType: ImageTargetType, targetId: number): Promise<void> {
    await this.imagesRepository.delete({ target_type: targetType, target_id: targetId });
  }

  async deleteImage(id: number): Promise<void> {
    await this.imagesRepository.delete(id);
  }
}
