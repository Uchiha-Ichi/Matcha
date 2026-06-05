import { Controller, UploadedFile, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Query, UseInterceptors, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { SearchNearbyDto } from './dto/search-nearby.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from 'src/image/image.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService,
    private readonly imageService: ImageService
  ) { }
  @Post()
  @Roles('admin', 'partner')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPartnerDto: CreatePartnerDto) {
    const partner = await this.partnersService.create(createPartnerDto);
    return partner;
  }

  @Get()
  async findAll() {
    const partners = await this.partnersService.findAll();
    return partners;
  }

  @Get('search/nearby')
  async searchNearby(@Query() searchNearbyDto: SearchNearbyDto) {
    return this.partnersService.searchNearby(
      searchNearbyDto.latitude,
      searchNearbyDto.longitude,
      searchNearbyDto.radius_km,
    );
  }

  @Get('me')
  @Roles('partner', 'admin', 'customer')
  async findMe(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
  ) {
    const partners = await this.partnersService.findAll();
    const mine = partners.find((p: any) => p.user?.id === currentUser.userId || (p as any).user_id === currentUser.userId);
    if (!mine) {
      return null;
    }
    return mine;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const partner = await this.partnersService.findOne(+id);
    return partner;
  }

  @Patch(':id')
  @Roles('admin', 'partner')
  async update(@Param('id') id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    const partner = await this.partnersService.update(+id, updatePartnerDto);
    return partner;
  }

  @Delete(':id')
  @Roles('admin', 'partner')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.partnersService.remove(+id);
  }

  @Patch(':id/img')
  @Roles('partner')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async updateImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const url = await this.imageService.uploadFile(file);
    return await this.partnersService.updateImage(+id, url);
  }

  /**
   * GET /partners/:id/calendar
   * - Admin: xem lịch của bất kỳ partner nào
   * - Partner: chỉ xem lịch của chính họ
   */
  @Get(':id/calendar')
  @Roles('admin', 'partner')
  async getCalendar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: { userId: number; roles: string[] },
  ) {
    const isAdmin = currentUser.roles.includes('admin');
    const isPartner = currentUser.roles.includes('partner');

    if (isPartner && !isAdmin) {
      // Partner chỉ được xem lịch của chính họ
      // user_id trong JWT phải khớp với partner.user.id
      const partnerData = await this.partnersService.findOneWithUser(id);
      if (partnerData.user?.id !== currentUser.userId) {
        throw new ForbiddenException('Bạn không có quyền xem lịch của partner này');
      }
    }


    return this.partnersService.getCalendar(id);
  }
}
