import { Module } from '@nestjs/common';
import { DateBlocksService } from './date-blocks.service';
import { DateBlocksController } from './date-blocks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DateBlock } from './entities/date-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DateBlock])],
  controllers: [DateBlocksController],
  providers: [DateBlocksService],
})
export class DateBlocksModule { }
