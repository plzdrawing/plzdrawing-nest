import {
  Body,
  Controller,
  Get,
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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateWithdrawRequestDto } from './dto/create-withdraw-request.dto';
import { WithdrawAdminQueryDto } from './dto/withdraw-admin-query.dto';
import { UpdateWithdrawRequestAdminDto } from './dto/update-withdraw-request-admin.dto';
import { WithdrawPolicyResponseDto } from './dto/withdraw-policy-response.dto';
import { WithdrawRequestResponseDto } from './dto/withdraw-request-response.dto';
import { WithdrawService } from './withdraw.service';

@ApiTags('Withdraw')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Get('v1/policy')
  @ApiOperation({ summary: '환전 정책 조회' })
  @ApiResponse({
    status: 200,
    description: '환전 정책 조회 성공',
    type: WithdrawPolicyResponseDto,
  })
  getPolicy(): WithdrawPolicyResponseDto {
    return this.withdrawService.getPolicy();
  }

  @Post('v1/requests')
  @ApiOperation({ summary: '환전 신청' })
  @ApiBody({ type: CreateWithdrawRequestDto })
  @ApiResponse({
    status: 201,
    description: '환전 신청 성공',
    type: WithdrawRequestResponseDto,
  })
  async create(
    @GetUser() member: Member,
    @Body() dto: CreateWithdrawRequestDto,
  ): Promise<WithdrawRequestResponseDto> {
    return this.withdrawService.create(member.id, dto);
  }

  @Get('v1/requests/me')
  @ApiOperation({ summary: '내 환전 신청 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '내 환전 신청 목록 조회 성공',
    type: [WithdrawRequestResponseDto],
  })
  async findMine(
    @GetUser() member: Member,
  ): Promise<WithdrawRequestResponseDto[]> {
    return this.withdrawService.findMine(member.id);
  }

  @Get('v1/requests/:id')
  @ApiOperation({ summary: '내 환전 신청 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '내 환전 신청 상세 조회 성공',
    type: WithdrawRequestResponseDto,
  })
  async findOne(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<WithdrawRequestResponseDto> {
    return this.withdrawService.findOne(member.id, +id);
  }

  @Get('v1/admin/requests')
  @ApiOperation({ summary: '환전 신청 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '환전 신청 목록 조회 성공',
    type: [WithdrawRequestResponseDto],
  })
  async findAllForAdmin(
    @GetUser() member: Member,
    @Query() query: WithdrawAdminQueryDto,
  ): Promise<WithdrawRequestResponseDto[]> {
    return this.withdrawService.findAllForAdmin(member, query);
  }

  @Get('v1/admin/requests/:id')
  @ApiOperation({ summary: '환전 신청 상세 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '환전 신청 상세 조회 성공',
    type: WithdrawRequestResponseDto,
  })
  async findOneForAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<WithdrawRequestResponseDto> {
    return this.withdrawService.findOneForAdmin(member, +id);
  }

  @Patch('v1/admin/requests/:id')
  @ApiOperation({ summary: '환전 신청 처리 (관리자)' })
  @ApiBody({ type: UpdateWithdrawRequestAdminDto })
  @ApiResponse({
    status: 200,
    description: '환전 신청 처리 성공',
    type: WithdrawRequestResponseDto,
  })
  async updateByAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawRequestAdminDto,
  ): Promise<WithdrawRequestResponseDto> {
    return this.withdrawService.updateByAdmin(member, +id, dto);
  }
}
