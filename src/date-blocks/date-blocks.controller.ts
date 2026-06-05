import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DateBlocksService } from './date-blocks.service';
import { CreateDateBlockDto } from './dto/create-date-block.dto';
import { UpdateDateBlockDto } from './dto/update-date-block.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('date-blocks')
export class DateBlocksController {
  constructor(private readonly dateBlocksService: DateBlocksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  create(@Body() createDateBlockDto: CreateDateBlockDto) {
    return this.dateBlocksService.create(createDateBlockDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.dateBlocksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dateBlocksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDateBlockDto: UpdateDateBlockDto) {
    return this.dateBlocksService.update(id, updateDateBlockDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('partner', 'admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dateBlocksService.remove(id);
  }
}
