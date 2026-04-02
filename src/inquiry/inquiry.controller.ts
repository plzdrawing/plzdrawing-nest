import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';
import { InquiryService } from './inquiry.service';
import { UpdateInquiryAdminDto } from './dto/update-inquiry-admin.dto';

@ApiTags('Inquiry')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('inquiry')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post('v1')
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '1:1 문의 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '1:1 문의 등록 성공',
    type: InquiryResponseDto,
  })
  async create(
    @GetUser() member: Member,
    @Body() dto: CreateInquiryDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<InquiryResponseDto> {
    return this.inquiryService.create(member.id, dto, files);
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

  @Get('v1/admin')
  @ApiOperation({ summary: '문의 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '문의 목록 조회 성공',
    type: [InquiryResponseDto],
  })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  async findAllForAdmin(
    @GetUser() member: Member,
  ): Promise<InquiryResponseDto[]> {
    return this.inquiryService.findAllForAdmin(member);
  }

  @Get('v1/admin/:id')
  @ApiOperation({ summary: '문의 상세 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '문의 상세 조회 성공',
    type: InquiryResponseDto,
  })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '문의 내역을 찾을 수 없음' })
  async findOneForAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<InquiryResponseDto> {
    return this.inquiryService.findOneForAdmin(member, +id);
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

  @Patch('v1/admin/:id')
  @ApiOperation({ summary: '문의 답변/상태 수정 (관리자)' })
  @ApiBody({ type: UpdateInquiryAdminDto })
  @ApiResponse({
    status: 200,
    description: '문의 답변/상태 수정 성공',
    type: InquiryResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '문의 내역을 찾을 수 없음' })
  async updateByAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateInquiryAdminDto,
  ): Promise<InquiryResponseDto> {
    return this.inquiryService.updateByAdmin(member, +id, dto);
  }
}
