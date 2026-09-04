import { Test, TestingModule } from '@nestjs/testing';
import { PlanSettingsController } from './plan-settings.controller';

describe('PlanSettingsController', () => {
  let controller: PlanSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanSettingsController],
    }).compile();

    controller = module.get<PlanSettingsController>(PlanSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
