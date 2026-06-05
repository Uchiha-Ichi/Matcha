import { Module } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { PartnerConceptsController } from './partner-concepts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerConcept } from './entities/partner-concept.entity';
import { ImageModule } from 'src/image/image.module';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerConcept]), ImageModule],
  controllers: [PartnerConceptsController],
  providers: [PartnerConceptsService],
})
export class PartnerConceptsModule { }
