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

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });
});
