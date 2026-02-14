import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { MemberService } from '../member/member.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'MAIL_HOST':
          return 'smtp.example.com';
        case 'MAIL_PORT':
          return 587;
        case 'MAIL_USERNAME':
          return 'user@example.com';
        case 'MAIL_PASSWORD':
          return 'password';
        case 'AUTH_CODE_EXPIRATION':
          return 180000;
        default:
          return null;
      }
    }),
  };

  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockMemberService = {
    // added if needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });
});
