import { Test, TestingModule } from '@nestjs/testing';
import { BookingDetailsService } from './booking-details.service';

describe('BookingDetailsService', () => {
  let service: BookingDetailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingDetailsService],
    }).compile();

    service = module.get<BookingDetailsService>(BookingDetailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
