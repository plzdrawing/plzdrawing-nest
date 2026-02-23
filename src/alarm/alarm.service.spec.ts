import { Test, TestingModule } from '@nestjs/testing';
import { AlarmService } from './alarm.service';

describe('AlarmService', () => {
  let service: AlarmService;
  let sendMock: jest.Mock;

  const mockFirebaseAdmin = {
    messaging: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    sendMock = jest.fn();
    mockFirebaseAdmin.messaging.mockReturnValue({
      send: sendMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseAdmin,
        },
      ],
    }).compile();

    service = module.get<AlarmService>(AlarmService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('FCM 메시지를 구성해 전송한다', async () => {
    await service.sendMessageTo('token', 'title', 'body', '/link');

    expect(mockFirebaseAdmin.messaging).toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith({
      token: 'token',
      notification: { title: 'title', body: 'body' },
      webpush: { fcmOptions: { link: '/link' } },
    });
  });

  it('전송 실패 시 예외를 다시 던진다', async () => {
    const error = new Error('send failed');
    sendMock.mockRejectedValue(error);

    await expect(
      service.sendMessageTo('token', 'title', 'body', '/link'),
    ).rejects.toThrow(error);
  });
});
