import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { WalletService } from './wallet.service';
import { CancelCoinOrderDto } from './dto/cancel-coin-order.dto';
import { CoinProductResponseDto } from './dto/coin-product-response.dto';
import { CoinOrderPageResponseDto } from './dto/coin-order-page-response.dto';
import { CoinOrderResponseDto } from './dto/coin-order-response.dto';
import { CoinOrderAdminQueryDto } from './dto/coin-order-admin-query.dto';
import { ConfirmCoinOrderDto } from './dto/confirm-coin-order.dto';
import { CreateCoinProductDto } from './dto/create-coin-product.dto';
import { CreateCoinOrderDto } from './dto/create-coin-order.dto';
import { TossWebhookDto } from './dto/toss-webhook.dto';
import { UpdateCoinProductDto } from './dto/update-coin-product.dto';
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

  @Get('coin-shop/v1/admin/products')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 상품 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '코인 상품 목록 조회 성공',
    type: [CoinProductResponseDto],
  })
  async getCoinProductsForAdmin(
    @GetUser() member: Member,
  ): Promise<CoinProductResponseDto[]> {
    return this.walletService.getCoinProductsForAdmin(member);
  }

  @Post('coin-shop/v1/admin/products')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 상품 등록 (관리자)' })
  @ApiBody({ type: CreateCoinProductDto })
  @ApiResponse({
    status: 201,
    description: '코인 상품 등록 성공',
    type: CoinProductResponseDto,
  })
  async createCoinProduct(
    @GetUser() member: Member,
    @Body() dto: CreateCoinProductDto,
  ): Promise<CoinProductResponseDto> {
    return this.walletService.createCoinProduct(member, dto);
  }

  @Patch('coin-shop/v1/admin/products/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 상품 수정 (관리자)' })
  @ApiBody({ type: UpdateCoinProductDto })
  @ApiResponse({
    status: 200,
    description: '코인 상품 수정 성공',
    type: CoinProductResponseDto,
  })
  async updateCoinProduct(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateCoinProductDto,
  ): Promise<CoinProductResponseDto> {
    return this.walletService.updateCoinProduct(member, +id, dto);
  }

  @Post('coin-shop/v1/orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 주문 생성' })
  @ApiBody({ type: CreateCoinOrderDto })
  @ApiResponse({
    status: 201,
    description: '코인 주문 생성 성공',
    type: CoinOrderResponseDto,
  })
  async createCoinOrder(
    @GetUser() member: Member,
    @Body() dto: CreateCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    return this.walletService.createCoinOrder(member.id, dto);
  }

  @Post('coin-shop/v1/orders/:id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 주문 결제 승인' })
  @ApiBody({ type: ConfirmCoinOrderDto })
  @ApiResponse({
    status: 200,
    description: '코인 주문 결제 승인 성공',
    type: CoinOrderResponseDto,
  })
  async confirmCoinOrder(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: ConfirmCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    return this.walletService.confirmCoinOrder(member.id, +id, dto);
  }

  @Get('coin-shop/v1/orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 코인 주문 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '내 코인 주문 목록 조회 성공',
    type: CoinOrderPageResponseDto,
  })
  async getCoinOrders(
    @GetUser() member: Member,
    @Query() paginationDto: PaginationDto,
  ): Promise<CoinOrderPageResponseDto> {
    return this.walletService.getCoinOrders(member.id, paginationDto);
  }

  @Get('coin-shop/v1/admin/orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 주문 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '코인 주문 목록 조회 성공',
    type: CoinOrderPageResponseDto,
  })
  async getCoinOrdersForAdmin(
    @GetUser() member: Member,
    @Query() query: CoinOrderAdminQueryDto,
  ): Promise<CoinOrderPageResponseDto> {
    return this.walletService.getCoinOrdersForAdmin(member, query);
  }

  @Get('coin-shop/v1/orders/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 코인 주문 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '내 코인 주문 상세 조회 성공',
    type: CoinOrderResponseDto,
  })
  async getCoinOrder(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<CoinOrderResponseDto> {
    return this.walletService.getCoinOrder(member.id, +id);
  }

  @Post('coin-shop/v1/orders/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '코인 주문 결제 취소' })
  @ApiBody({ type: CancelCoinOrderDto })
  @ApiResponse({
    status: 200,
    description: '코인 주문 결제 취소 성공',
    type: CoinOrderResponseDto,
  })
  async cancelCoinOrder(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: CancelCoinOrderDto,
  ): Promise<CoinOrderResponseDto> {
    return this.walletService.cancelCoinOrder(member.id, +id, dto);
  }

  @Post('payments/v1/webhooks/toss')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleTossWebhook(@Body() payload: TossWebhookDto): Promise<void> {
    return this.walletService.handleTossWebhook(payload);
  }
}
