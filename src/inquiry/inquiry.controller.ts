import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';
import { InquiryService } from './inquiry.service';

@ApiTags('Inquiry')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post('v1')
  @ApiOperation({ summary: '1:1 문의 등록' })
  @ApiBody({ type: CreateInquiryDto })
  @ApiResponse({
    status: 201,
    description: '1:1 문의 등록 성공',
    type: InquiryResponseDto,
  })
  async create(
    @GetUser() member: Member,
    @Body() dto: CreateInquiryDto,
  ): Promise<InquiryResponseDto> {
    return this.inquiryService.create(member.id, dto);
  }

  @Get('v1/me')
  @ApiOperation({ summary: '내 1:1 문의 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '내 1:1 문의 목록 조회 성공',
    type: [InquiryResponseDto],
  })
  async findMine(@GetUser() member: Member): Promise<InquiryResponseDto[]> {
    return this.inquiryService.findMine(member.id);
  }

  @Get('v1/:id')
  @ApiOperation({ summary: '내 1:1 문의 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '내 1:1 문의 상세 조회 성공',
    type: InquiryResponseDto,
  })
  @ApiResponse({ status: 403, description: '문의 조회 권한 없음' })
  @ApiResponse({ status: 404, description: '문의 내역을 찾을 수 없음' })
  async findOne(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<InquiryResponseDto> {
    return this.inquiryService.findOne(member.id, +id);
  }
}
