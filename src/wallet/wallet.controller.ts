import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { WalletService } from './wallet.service';
import { CoinProductResponseDto } from './dto/coin-product-response.dto';
import { WalletSummaryResponseDto } from './dto/wallet-summary-response.dto';
import { WalletTransactionPageResponseDto } from './dto/wallet-transaction-page-response.dto';

@ApiTags('Wallet')
@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallet/v1/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 코인 지갑 조회' })
  @ApiResponse({
    status: 200,
    description: '내 코인 지갑 조회 성공',
    type: WalletSummaryResponseDto,
  })
  async getMyWallet(
    @GetUser() member: Member,
  ): Promise<WalletSummaryResponseDto> {
    return this.walletService.getMyWallet(member.id);
  }

  @Get('wallet/v1/transactions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 코인 거래내역 조회' })
  @ApiResponse({
    status: 200,
    description: '내 코인 거래내역 조회 성공',
    type: WalletTransactionPageResponseDto,
  })
  async getMyTransactions(
    @GetUser() member: Member,
    @Query() paginationDto: PaginationDto,
  ): Promise<WalletTransactionPageResponseDto> {
    return this.walletService.getMyTransactions(member.id, paginationDto);
  }

  @Get('coin-shop/v1/products')
  @ApiOperation({ summary: '코인 상품 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '코인 상품 목록 조회 성공',
    type: [CoinProductResponseDto],
  })
  async getCoinProducts(): Promise<CoinProductResponseDto[]> {
    return this.walletService.getCoinProducts();
  }
}
