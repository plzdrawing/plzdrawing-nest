import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { LatestContentsPageResponseDto } from './dto/latest-contents-page-response.dto';
import { ContentsPageResponseDto } from './dto/contents-page-response.dto';

@ApiTags('Post')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 파일당 10MB 제한
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '게시글 작성' })
  @ApiResponse({ status: 201, description: '게시글 작성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 (이미지 누락 등)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        title: { type: 'string' },
        content: { type: 'string' },
        hashTag: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  create(
    @Request() req,
    @Body() body,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.postService.create(req.user, body, files);
  }

  @Get()
  @ApiOperation({ summary: '최신 게시글 조회' })
  @ApiResponse({
    status: 200,
    description: '최신 게시글 조회 성공',
    type: LatestContentsPageResponseDto,
  })
  getLatestContents(@Query() paginationDto: PaginationDto) {
    return this.postService.getLatestContents(paginationDto);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: '멤버별 게시글 조회' })
  @ApiResponse({
    status: 200,
    description: '멤버별 게시글 조회 성공',
    type: ContentsPageResponseDto,
  })
  getMemberContents(
    @Param('memberId') memberId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.postService.getMemberContents(+memberId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiResponse({ status: 200, description: '게시글 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  findOne(@Param('id') id: string) {
    return this.postService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '게시글 수정' })
  @ApiResponse({ status: 200, description: '게시글 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  update(@Param('id') id: string, @Body() body) {
    return this.postService.update(+id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 200, description: '게시글 삭제 성공' })
  remove(@Param('id') id: string) {
    return this.postService.remove(+id);
  }
}
