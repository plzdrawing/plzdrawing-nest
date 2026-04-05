import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { WithdrawAccountStatus } from '../common/enums';
import { Member } from '../entities/member.entity';
import { WithdrawAccount } from '../entities/withdraw-account.entity';
import { BankResponseDto } from './dto/bank-response.dto';
import { CreateWithdrawAccountDto } from './dto/create-withdraw-account.dto';
import { WithdrawAccountResponseDto } from './dto/withdraw-account-response.dto';

@Injectable()
export class WithdrawAccountService {
  private static readonly BANKS = [
    new BankResponseDto('004', '국민은행'),
    new BankResponseDto('088', '신한은행'),
    new BankResponseDto('020', '우리은행'),
    new BankResponseDto('081', '하나은행'),
    new BankResponseDto('011', '농협은행'),
    new BankResponseDto('003', '기업은행'),
    new BankResponseDto('023', 'SC제일은행'),
    new BankResponseDto('032', '부산은행'),
    new BankResponseDto('071', '우체국'),
    new BankResponseDto('089', '케이뱅크'),
    new BankResponseDto('090', '카카오뱅크'),
    new BankResponseDto('092', '토스뱅크'),
  ];

  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(WithdrawAccount)
    private readonly withdrawAccountRepository: Repository<WithdrawAccount>,
    private readonly configService: ConfigService,
  ) {}

  getBanks(): BankResponseDto[] {
    return WithdrawAccountService.BANKS;
  }

  async findMine(memberId: number): Promise<WithdrawAccountResponseDto[]> {
    await this.assertMemberExists(memberId);

    const accounts = await this.withdrawAccountRepository.find({
      where: { memberId, status: WithdrawAccountStatus.ACTIVE },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return accounts.map((account) => this.mapAccount(account));
  }

  async create(
    memberId: number,
    dto: CreateWithdrawAccountDto,
  ): Promise<WithdrawAccountResponseDto> {
    await this.assertMemberExists(memberId);
    this.assertSupportedBank(dto.bankCode, dto.bankName);

    const existingAccounts = await this.withdrawAccountRepository.find({
      where: { memberId, status: WithdrawAccountStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });

    const normalizedAccountNumber = dto.accountNumber.replace(/-/g, '');
    const duplicatedAccount = existingAccounts.find(
      (account) =>
        this.decryptAccountNumber(account.accountNumberEncrypted) ===
        normalizedAccountNumber,
    );
    if (duplicatedAccount) {
      throw new BadRequestException('Withdraw account already exists');
    }

    const shouldBePrimary =
      dto.isPrimary === true || existingAccounts.length === 0;
    if (shouldBePrimary && existingAccounts.length > 0) {
      await this.withdrawAccountRepository.update(
        { memberId, isPrimary: true, status: WithdrawAccountStatus.ACTIVE },
        { isPrimary: false },
      );
    }

    const savedAccount = await this.withdrawAccountRepository.save(
      this.withdrawAccountRepository.create({
        memberId,
        bankCode: dto.bankCode,
        bankName: dto.bankName,
        accountHolder: dto.accountHolder.trim(),
        accountNumberMasked: this.maskAccountNumber(normalizedAccountNumber),
        accountNumberEncrypted: this.encryptAccountNumber(
          normalizedAccountNumber,
        ),
        isPrimary: shouldBePrimary,
        status: WithdrawAccountStatus.ACTIVE,
        verifiedAt: null,
      }),
    );

    return this.mapAccount(savedAccount);
  }

  async setPrimary(
    memberId: number,
    accountId: number,
  ): Promise<WithdrawAccountResponseDto> {
    await this.assertMemberExists(memberId);

    const account = await this.withdrawAccountRepository.findOne({
      where: { id: accountId, memberId, status: WithdrawAccountStatus.ACTIVE },
    });
    if (!account) {
      throw new NotFoundException('Withdraw account not found');
    }

    await this.withdrawAccountRepository.update(
      { memberId, isPrimary: true, status: WithdrawAccountStatus.ACTIVE },
      { isPrimary: false },
    );

    account.isPrimary = true;
    const savedAccount = await this.withdrawAccountRepository.save(account);
    return this.mapAccount(savedAccount);
  }

  async remove(memberId: number, accountId: number): Promise<void> {
    await this.assertMemberExists(memberId);

    const account = await this.withdrawAccountRepository.findOne({
      where: { id: accountId, memberId, status: WithdrawAccountStatus.ACTIVE },
    });
    if (!account) {
      throw new NotFoundException('Withdraw account not found');
    }

    const wasPrimary = account.isPrimary;
    account.status = WithdrawAccountStatus.INACTIVE;
    account.isPrimary = false;
    await this.withdrawAccountRepository.save(account);

    if (wasPrimary) {
      const nextAccount = await this.withdrawAccountRepository.findOne({
        where: { memberId, status: WithdrawAccountStatus.ACTIVE },
        order: { createdAt: 'ASC' },
      });
      if (nextAccount) {
        nextAccount.isPrimary = true;
        await this.withdrawAccountRepository.save(nextAccount);
      }
    }
  }

  async hasActiveWithdrawAccount(memberId: number): Promise<boolean> {
    const count = await this.withdrawAccountRepository.count({
      where: { memberId, status: WithdrawAccountStatus.ACTIVE },
    });
    return count > 0;
  }

  private async assertMemberExists(memberId: number): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
  }

  private assertSupportedBank(bankCode: string, bankName: string): void {
    const matchedBank = WithdrawAccountService.BANKS.find(
      (bank) => bank.code === bankCode && bank.name === bankName,
    );
    if (!matchedBank) {
      throw new BadRequestException('Unsupported bank');
    }
  }

  private mapAccount(account: WithdrawAccount): WithdrawAccountResponseDto {
    return new WithdrawAccountResponseDto(
      account.id,
      account.bankCode,
      account.bankName,
      account.accountHolder,
      account.accountNumberMasked,
      account.isPrimary,
      account.status,
      account.verifiedAt ?? null,
      account.createdAt,
    );
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 6) {
      return `${accountNumber.slice(0, 2)}****`;
    }

    return `${accountNumber.slice(0, 6)}******${accountNumber.slice(-2)}`;
  }

  private encryptAccountNumber(accountNumber: string): string {
    const key = crypto
      .createHash('sha256')
      .update(
        this.configService.get<string>('WITHDRAW_ACCOUNT_SECRET') ??
          'plzdrawing-withdraw-account-secret',
      )
      .digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(accountNumber, 'utf8'),
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptAccountNumber(encryptedValue: string): string {
    const key = crypto
      .createHash('sha256')
      .update(
        this.configService.get<string>('WITHDRAW_ACCOUNT_SECRET') ??
          'plzdrawing-withdraw-account-secret',
      )
      .digest();
    const [ivHex, cipherHex] = encryptedValue.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
