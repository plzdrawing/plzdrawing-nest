import {
  Body,
  Controller,
  Delete,
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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { NoticeAdminQueryDto } from './dto/notice-admin-query.dto';
import { NoticeResponseDto } from './dto/notice-response.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeService } from './notice.service';

@ApiTags('Notice')
@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get('v1')
  @ApiOperation({ summary: '공지사항 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '공지사항 목록 조회 성공',
    type: [NoticeResponseDto],
  })
  async findAll(): Promise<NoticeResponseDto[]> {
    return this.noticeService.findAll();
  }

  @Get('v1/:id')
  @ApiOperation({ summary: '공지사항 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '공지사항 상세 조회 성공',
    type: NoticeResponseDto,
  })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async findOne(@Param('id') id: string): Promise<NoticeResponseDto> {
    return this.noticeService.findOne(+id);
  }

  @Get('v1/admin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '공지사항 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '공지사항 목록 조회 성공',
    type: [NoticeResponseDto],
  })
  async findAllForAdmin(
    @GetUser() member: Member,
    @Query() query: NoticeAdminQueryDto,
  ): Promise<NoticeResponseDto[]> {
    return this.noticeService.findAllForAdmin(member, query);
  }

  @Post('v1')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '공지사항 등록 (관리자)' })
  @ApiResponse({
    status: 201,
    description: '공지사항 등록 성공',
    type: NoticeResponseDto,
  })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  async create(
    @GetUser() member: Member,
    @Body() dto: CreateNoticeDto,
  ): Promise<NoticeResponseDto> {
    return this.noticeService.create(member, dto);
  }

  @Patch('v1/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '공지사항 수정 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '공지사항 수정 성공',
    type: NoticeResponseDto,
  })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async update(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateNoticeDto,
  ): Promise<NoticeResponseDto> {
    return this.noticeService.update(member, +id, dto);
  }

  @Delete('v1/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '공지사항 삭제 (관리자)' })
  @ApiResponse({ status: 204, description: '공지사항 삭제 성공' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async remove(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<void> {
    return this.noticeService.remove(member, +id);
  }
}
