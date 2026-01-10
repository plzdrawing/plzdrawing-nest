import { Test, TestingModule } from '@nestjs/testing';
import { AlarmService } from './alarm.service';

describe('AlarmService', () => {
  let service: AlarmService;

  const mockFirebaseAdmin = {
    messaging: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  };

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
