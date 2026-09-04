import { Test, TestingModule } from '@nestjs/testing';
import { PlanSettingsService } from './plan-settings.service';

describe('PlanSettingsService', () => {
  let service: PlanSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanSettingsService],
    }).compile();

    service = module.get<PlanSettingsService>(PlanSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
