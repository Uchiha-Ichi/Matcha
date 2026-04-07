import { Injectable } from '@nestjs/common';
import { CreatePartnerConceptDto } from './dto/create-partner-concept.dto';
import { UpdatePartnerConceptDto } from './dto/update-partner-concept.dto';

@Injectable()
export class PartnerConceptsService {
  create(createPartnerConceptDto: CreatePartnerConceptDto) {
    return 'This action adds a new partnerConcept';
  }

  findAll() {
    return `This action returns all partnerConcepts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partnerConcept`;
  }

  update(id: number, updatePartnerConceptDto: UpdatePartnerConceptDto) {
    return `This action updates a #${id} partnerConcept`;
  }

  remove(id: number) {
    return `This action removes a #${id} partnerConcept`;
  }
}
