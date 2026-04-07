import { Test, TestingModule } from '@nestjs/testing';
import { PartnerConceptsController } from './partner-concepts.controller';
import { PartnerConceptsService } from './partner-concepts.service';

describe('PartnerConceptsController', () => {
  let controller: PartnerConceptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerConceptsController],
      providers: [PartnerConceptsService],
    }).compile();

    controller = module.get<PartnerConceptsController>(PartnerConceptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
