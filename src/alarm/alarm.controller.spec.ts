import { Test, TestingModule } from '@nestjs/testing';
import { AlarmController } from './alarm.controller';
import { AlarmService } from './alarm.service';

describe('AlarmController', () => {
  let controller: AlarmController;

  const mockAlarmService = {
    sendMessageTo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlarmController],
      providers: [
        {
          provide: AlarmService,
          useValue: mockAlarmService,
        },
      ],
    }).compile();

    controller = module.get<AlarmController>(AlarmController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
