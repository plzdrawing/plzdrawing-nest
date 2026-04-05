import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CoinProduct } from '../entities/coin-product.entity';
import { Member } from '../entities/member.entity';
import { Terms } from '../entities/terms.entity';

type CoinProductSeed = Pick<
  CoinProduct,
  'name' | 'coinAmount' | 'price' | 'displayOrder' | 'description'
>;

type TermSeed = Pick<Terms, 'title' | 'version' | 'content'>;

const DEFAULT_COIN_PRODUCTS: CoinProductSeed[] = [
  {
    name: '그리코인 10개',
    coinAmount: 10,
    price: 1200,
    displayOrder: 1,
    description: '가볍게 시작하는 기본 코인 상품',
  },
  {
    name: '그리코인 30개',
    coinAmount: 30,
    price: 3600,
    displayOrder: 2,
    description: '자주 사용하는 이용자를 위한 코인 상품',
  },
  {
    name: '그리코인 50개',
    coinAmount: 50,
    price: 6000,
    displayOrder: 3,
    description: '여러 작업을 준비할 때 쓰기 좋은 코인 상품',
  },
  {
    name: '그리코인 100개',
    coinAmount: 100,
    price: 12000,
    displayOrder: 4,
    description: '장기 이용자를 위한 대용량 코인 상품',
  },
];

const DEFAULT_TERMS: TermSeed[] = [
  {
    title: '서비스 이용약관',
    version: '1.0.0',
    content:
      '플리즈드로잉 서비스 이용약관입니다. 서비스 이용 시 관련 법령과 운영 정책을 준수해야 합니다.',
  },
  {
    title: '개인정보 처리방침',
    version: '1.0.0',
    content:
      '플리즈드로잉은 회원 식별, 고객 지원, 서비스 운영을 위해 필요한 최소한의 개인정보를 수집 및 이용합니다.',
  },
];

@Injectable()
export class AppInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppInitService.name);

  constructor(
    @InjectRepository(CoinProduct)
    private readonly coinProductRepository: Repository<CoinProduct>,
    @InjectRepository(Terms)
    private readonly termsRepository: Repository<Terms>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled =
      this.configService.get<string>('SEED_DEFAULT_DATA') !== 'false';

    if (!enabled) {
      return;
    }

    await this.seedCoinProducts();
    await this.seedTerms();
  }

  private async seedCoinProducts(): Promise<void> {
    const existingProducts = await this.coinProductRepository.find({
      where: {
        coinAmount: In(
          DEFAULT_COIN_PRODUCTS.map((product) => product.coinAmount),
        ),
      },
    });
    const existingCoinAmounts = new Set(
      existingProducts.map((product) => product.coinAmount),
    );

    const missingProducts = DEFAULT_COIN_PRODUCTS.filter(
      (product) => !existingCoinAmounts.has(product.coinAmount),
    );

    if (missingProducts.length === 0) {
      return;
    }

    await this.coinProductRepository.save(
      missingProducts.map((product) =>
        this.coinProductRepository.create({
          ...product,
          isActive: true,
        }),
      ),
    );

    this.logger.log(`Seeded ${missingProducts.length} default coin products`);
  }

  private async seedTerms(): Promise<void> {
    const seedAdminId = this.configService.get<number>('SEED_ADMIN_ID');
    if (!seedAdminId) {
      return;
    }

    const admin = await this.memberRepository.findOne({
      where: { id: seedAdminId },
    });
    if (!admin) {
      this.logger.warn(
        `Skipping default terms seed because admin ${seedAdminId} was not found`,
      );
      return;
    }

    const existingTerms = await this.termsRepository.find({
      where: {
        title: In(DEFAULT_TERMS.map((term) => term.title)),
      },
    });
    const existingKeys = new Set(
      existingTerms.map((term) => `${term.title}:${term.version}`),
    );

    const missingTerms = DEFAULT_TERMS.filter(
      (term) => !existingKeys.has(`${term.title}:${term.version}`),
    );

    if (missingTerms.length === 0) {
      return;
    }

    await this.termsRepository.save(
      missingTerms.map((term) =>
        this.termsRepository.create({
          ...term,
          adminId: admin.id,
        }),
      ),
    );

    this.logger.log(`Seeded ${missingTerms.length} default terms`);
  }
}
