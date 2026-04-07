import { Module } from '@nestjs/common';
import { PartnerConceptsService } from './partner-concepts.service';
import { PartnerConceptsController } from './partner-concepts.controller';

@Module({
  controllers: [PartnerConceptsController],
  providers: [PartnerConceptsService],
})
export class PartnerConceptsModule {}
