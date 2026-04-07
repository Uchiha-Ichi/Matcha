import { Module } from '@nestjs/common';
import { DateBlocksService } from './date-blocks.service';
import { DateBlocksController } from './date-blocks.controller';

@Module({
  controllers: [DateBlocksController],
  providers: [DateBlocksService],
})
export class DateBlocksModule {}
