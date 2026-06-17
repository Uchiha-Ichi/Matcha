import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFiles } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ImageService } from 'src/image/image.service';
import { ImageTargetType } from 'src/image/entities/image.entity';

@Controller('partner-concepts')
export class PartnerConceptsController {
  constructor(private readonly partnerConceptsService: PartnerConceptsService,
    private readonly imageService: ImageService
  ) { }

  // ── Public read endpoints ──────────────────────────────────────────────────
  @Get()
  findAll() {
    return this.partnerConceptsService.findAll();
  }

  @Get(':param')
  findOne(@Param('param') param: string) {
    if (/^\d+$/.test(param)) {
      return this.partnerConceptsService.findOne(+param);
    } else {
      return this.partnerConceptsService.findOneBySlug(param);
    }
  }

  // ── Protected write endpoints ──────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @Body() createPartnerConceptDto: CreatePartnerConceptDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.imageService.uploadFile(file);
        imageUrls.push(url);
      }
      if (imageUrls.length > 0) {
        createPartnerConceptDto.image_des = imageUrls[0];
      }
    }
    const saved = await this.partnerConceptsService.create(createPartnerConceptDto);

    // Save other images as secondary images in image table
    if (imageUrls.length > 1) {
      for (let i = 1; i < imageUrls.length; i++) {
        await this.imageService.createImage(
          ImageTargetType.PARTNER_CONCEPT,
          saved.id,
          imageUrls[i],
          false // isPrimary = false
        );
      }
    }

    return saved;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  update(@Param('id') id: string, @Body() updatePartnerConceptDto: UpdatePartnerConceptDto) {
    return this.partnerConceptsService.update(+id, updatePartnerConceptDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  remove(@Param('id') id: string) {
    return this.partnerConceptsService.remove(+id);
  }
}
