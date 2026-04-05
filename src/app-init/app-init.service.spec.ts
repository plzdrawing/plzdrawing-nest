import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CoinProduct } from '../entities/coin-product.entity';
import { Member } from '../entities/member.entity';
import { Terms } from '../entities/terms.entity';
import { AppInitService } from './app-init.service';

describe('AppInitService', () => {
  let service: AppInitService;

  let coinProductRepository: any;
  let termsRepository: any;
  let memberRepository: any;
  let configService: any;

  beforeEach(async () => {
    coinProductRepository = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    termsRepository = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    memberRepository = {
      findOne: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          SEED_DEFAULT_DATA: 'true',
          SEED_ADMIN_ID: 1,
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppInitService,
        {
          provide: getRepositoryToken(CoinProduct),
          useValue: coinProductRepository,
        },
        {
          provide: getRepositoryToken(Terms),
          useValue: termsRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: memberRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AppInitService>(AppInitService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('기본 코인 상품 누락분을 시드한다', async () => {
    coinProductRepository.find.mockResolvedValue([
      {
        coinAmount: 10,
      },
    ]);
    termsRepository.find.mockResolvedValue([]);
    memberRepository.findOne.mockResolvedValue({ id: 1 });

    await service.onApplicationBootstrap();

    expect(coinProductRepository.save).toHaveBeenCalled();
    expect(coinProductRepository.create).toHaveBeenCalled();
  });

  it('SEED_ADMIN_ID가 없으면 약관 시드를 건너뛴다', async () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string | undefined> = {
        SEED_DEFAULT_DATA: 'true',
      };
      return values[key];
    });
    coinProductRepository.find.mockResolvedValue([]);

    await service.onApplicationBootstrap();

    expect(memberRepository.findOne).not.toHaveBeenCalled();
    expect(termsRepository.save).not.toHaveBeenCalled();
  });

  it('관리자 회원이 있으면 기본 약관 누락분을 시드한다', async () => {
    coinProductRepository.find.mockResolvedValue([]);
    termsRepository.find.mockResolvedValue([]);
    memberRepository.findOne.mockResolvedValue({ id: 1 });

    await service.onApplicationBootstrap();

    expect(termsRepository.save).toHaveBeenCalled();
    expect(termsRepository.create).toHaveBeenCalled();
  });
});
