import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';

@Controller('partner-concepts')
export class PartnerConceptsController {
  constructor(private readonly partnerConceptsService: PartnerConceptsService) {}

  @Post()
  create(@Body() createPartnerConceptDto: CreatePartnerConceptDto) {
    return this.partnerConceptsService.create(createPartnerConceptDto);
  }

  @Get()
  findAll() {
    return this.partnerConceptsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnerConceptsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartnerConceptDto: UpdatePartnerConceptDto) {
    return this.partnerConceptsService.update(+id, updatePartnerConceptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partnerConceptsService.remove(+id);
  }
}
