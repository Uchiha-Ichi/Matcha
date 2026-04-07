import { Test, TestingModule } from '@nestjs/testing';
import { DateBlocksService } from './date-blocks.service';

describe('DateBlocksService', () => {
  let service: DateBlocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DateBlocksService],
    }).compile();

    service = module.get<DateBlocksService>(DateBlocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
