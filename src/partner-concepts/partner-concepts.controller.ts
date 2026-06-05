import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UploadedFile } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from 'src/image/image.service';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnerConceptsService.findOne(+id);
  }

  // ── Protected write endpoints ──────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async create(@Body() createPartnerConceptDto: CreatePartnerConceptDto, @UploadedFile() file: Express.Multer.File) {
    if (file) {
      const url = await this.imageService.uploadFile(file);
      createPartnerConceptDto.image_des = url;
    }
    return this.partnerConceptsService.create(createPartnerConceptDto);
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
