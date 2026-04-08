import { Module } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { PartnerConceptsController } from './partner-concepts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerConcept } from './entities/partner-concept.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerConcept])],
  controllers: [PartnerConceptsController],
  providers: [PartnerConceptsService],
})
export class PartnerConceptsModule { }
