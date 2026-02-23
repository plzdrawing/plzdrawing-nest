import { Test, TestingModule } from '@nestjs/testing';
import { AlarmController } from './alarm.controller';
import { AlarmService } from './alarm.service';

describe('AlarmController', () => {
  let controller: AlarmController;

  const mockAlarmService = {
    sendMessageTo: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

  it('fcmTest는 알림 전송을 시도하고 true를 반환한다', async () => {
    mockAlarmService.sendMessageTo.mockResolvedValue(undefined);

    await expect(controller.fcmTest()).resolves.toBe(true);
    expect(mockAlarmService.sendMessageTo).toHaveBeenCalledWith(
      'target',
      '알림 테스트',
      '알림 내용',
      '알림 링크',
    );
  });

  it('fcmTest는 전송 실패해도 true를 반환한다', async () => {
    mockAlarmService.sendMessageTo.mockRejectedValue(new Error('FCM failed'));

    await expect(controller.fcmTest()).resolves.toBe(true);
  });
});
