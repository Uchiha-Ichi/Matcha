import { Test, TestingModule } from '@nestjs/testing';
import { PartnerConceptsService } from './partner-concepts.service';

describe('PartnerConceptsService', () => {
  let service: PartnerConceptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerConceptsService],
    }).compile();

    service = module.get<PartnerConceptsService>(PartnerConceptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
