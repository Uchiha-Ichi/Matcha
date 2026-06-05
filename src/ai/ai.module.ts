import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PartnerConcept } from '../partner-concepts/entities/partner-concept.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerConcept])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
