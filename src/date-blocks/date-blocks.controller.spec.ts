import { Test, TestingModule } from '@nestjs/testing';
import { DateBlocksController } from './date-blocks.controller';
import { DateBlocksService } from './date-blocks.service';

describe('DateBlocksController', () => {
  let controller: DateBlocksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DateBlocksController],
      providers: [DateBlocksService],
    }).compile();

    controller = module.get<DateBlocksController>(DateBlocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
