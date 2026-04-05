import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { BankResponseDto } from './dto/bank-response.dto';
import { CreateWithdrawAccountDto } from './dto/create-withdraw-account.dto';
import { UpdateWithdrawAccountAdminDto } from './dto/update-withdraw-account-admin.dto';
import { WithdrawAccountResponseDto } from './dto/withdraw-account-response.dto';
import { WithdrawAccountService } from './withdraw-account.service';

@ApiTags('WithdrawAccount')
@Controller()
export class WithdrawAccountController {
  constructor(
    private readonly withdrawAccountService: WithdrawAccountService,
  ) {}

  @Get('banks/v1')
  @ApiOperation({ summary: '은행 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '은행 목록 조회 성공',
    type: [BankResponseDto],
  })
  getBanks(): BankResponseDto[] {
    return this.withdrawAccountService.getBanks();
  }

  @Get('withdraw-accounts/v1')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 환전계좌 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '내 환전계좌 목록 조회 성공',
    type: [WithdrawAccountResponseDto],
  })
  async findMine(
    @GetUser() member: Member,
  ): Promise<WithdrawAccountResponseDto[]> {
    return this.withdrawAccountService.findMine(member.id);
  }

  @Post('withdraw-accounts/v1')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '환전계좌 등록' })
  @ApiBody({ type: CreateWithdrawAccountDto })
  @ApiResponse({
    status: 201,
    description: '환전계좌 등록 성공',
    type: WithdrawAccountResponseDto,
  })
  async create(
    @GetUser() member: Member,
    @Body() dto: CreateWithdrawAccountDto,
  ): Promise<WithdrawAccountResponseDto> {
    return this.withdrawAccountService.create(member.id, dto);
  }

  @Patch('withdraw-accounts/v1/:id/primary')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '대표 환전계좌 지정' })
  @ApiResponse({
    status: 200,
    description: '대표 환전계좌 지정 성공',
    type: WithdrawAccountResponseDto,
  })
  async setPrimary(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<WithdrawAccountResponseDto> {
    return this.withdrawAccountService.setPrimary(member.id, +id);
  }

  @Delete('withdraw-accounts/v1/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '환전계좌 삭제' })
  @ApiResponse({ status: 204, description: '환전계좌 삭제 성공' })
  async remove(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<void> {
    return this.withdrawAccountService.remove(member.id, +id);
  }

  @Get('withdraw-accounts/v1/admin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '환전계좌 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '환전계좌 목록 조회 성공',
    type: [WithdrawAccountResponseDto],
  })
  async findAllForAdmin(
    @GetUser() member: Member,
  ): Promise<WithdrawAccountResponseDto[]> {
    return this.withdrawAccountService.findAllForAdmin(member);
  }

  @Patch('withdraw-accounts/v1/admin/:id/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '환전계좌 인증 처리 (관리자)' })
  @ApiBody({ type: UpdateWithdrawAccountAdminDto })
  @ApiResponse({
    status: 200,
    description: '환전계좌 인증 처리 성공',
    type: WithdrawAccountResponseDto,
  })
  async verifyByAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawAccountAdminDto,
  ): Promise<WithdrawAccountResponseDto> {
    return this.withdrawAccountService.verifyByAdmin(member, +id, dto);
  }
}
