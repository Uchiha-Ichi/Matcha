import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, UseGuards, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('image')
@UseGuards(JwtAuthGuard)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file để upload');
    }

    // Validate mimetype: must be an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Chỉ cho phép tải lên các file ảnh (jpg, png, webp...)');
    }

    // Validate size: max 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Kích thước ảnh tối đa là 5MB');
    }

    const url = await this.imageService.uploadFile(file);
    return { url };
  }

  @Post('upload-multiple')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10)) // Cho phép upload tối đa 10 file cùng lúc
  async uploadMultipleImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một file để upload');
    }

    // Validate tất cả các file trước khi upload
    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException(`File ${file.originalname} không phải là ảnh hợp lệ`);
      }
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new BadRequestException(`File ${file.originalname} vượt quá dung lượng 5MB cho phép`);
      }
    }

    // Upload song song các file lên Cloudinary
    const uploadPromises = files.map(file => this.imageService.uploadFile(file));
    const urls = await Promise.all(uploadPromises);

    return { urls };
  }
}
