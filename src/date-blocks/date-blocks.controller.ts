import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DateBlocksService } from './date-blocks.service';
import { CreateDateBlockDto } from './dto/create-date-block.dto';
import { UpdateDateBlockDto } from './dto/update-date-block.dto';

@Controller('date-blocks')
export class DateBlocksController {
  constructor(private readonly dateBlocksService: DateBlocksService) {}

  @Post()
  create(@Body() createDateBlockDto: CreateDateBlockDto) {
    return this.dateBlocksService.create(createDateBlockDto);
  }

  @Get()
  findAll() {
    return this.dateBlocksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dateBlocksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDateBlockDto: UpdateDateBlockDto) {
    return this.dateBlocksService.update(+id, updateDateBlockDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dateBlocksService.remove(+id);
  }
}
