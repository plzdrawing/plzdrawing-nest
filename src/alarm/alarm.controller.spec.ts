import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AlarmController } from './alarm.controller';
import { AlarmService } from './alarm.service';

describe('AlarmController', () => {
  let controller: AlarmController;
  let consoleLogSpy: jest.SpyInstance;

  const mockAlarmService = {
    sendMessageTo: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('development');
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlarmController],
      providers: [
        {
          provide: AlarmService,
          useValue: mockAlarmService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AlarmController>(AlarmController);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
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
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'FCM Test send failed (expected without valid token):',
      expect.any(Error),
    );
  });

  it('운영 환경에서는 FCM 테스트 엔드포인트를 숨겨야 한다', async () => {
    mockConfigService.get.mockReturnValue('production');

    await expect(controller.fcmTest()).rejects.toThrow(NotFoundException);
    expect(mockAlarmService.sendMessageTo).not.toHaveBeenCalled();
  });
});
