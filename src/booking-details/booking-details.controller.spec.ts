import { Test, TestingModule } from '@nestjs/testing';
import { BookingDetailsController } from './booking-details.controller';
import { BookingDetailsService } from './booking-details.service';

describe('BookingDetailsController', () => {
  let controller: BookingDetailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingDetailsController],
      providers: [BookingDetailsService],
    }).compile();

    controller = module.get<BookingDetailsController>(BookingDetailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
