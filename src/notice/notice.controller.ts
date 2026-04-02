import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NoticeResponseDto } from './dto/notice-response.dto';
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
}
