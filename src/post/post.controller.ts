import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { LatestContentsPageResponseDto } from './dto/latest-contents-page-response.dto';
import { ContentsPageResponseDto } from './dto/contents-page-response.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { JwtOptionalAuthGuard } from '../auth/guards/jwt-optional-auth.guard';
import { LatestContentsQueryDto } from './dto/latest-contents-query.dto';
import { Post as PostEntity } from '../entities/post.entity';
import { Member } from '../entities/member.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

type AuthRequest = ExpressRequest & { user: Member };

const MAX_POST_IMAGE_COUNT = 3;
const MAX_POST_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

const imageFileFilter = (
  _req: ExpressRequest,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(
    new BadRequestException(
      '이미지 파일(jpeg/jpg/png/webp)만 업로드할 수 있습니다.',
    ),
    false,
  );
};

@ApiTags('Post')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FilesInterceptor('images', MAX_POST_IMAGE_COUNT, {
      limits: { fileSize: MAX_POST_IMAGE_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '게시글 작성',
    description:
      '게시글과 이미지를 함께 업로드합니다. images는 선택이며 최대 3개, 파일당 최대 10MB입니다.',
  })
  @ApiResponse({
    status: 201,
    description: '게시글 작성 성공',
    type: PostEntity,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (유효성 검사 실패 등)',
  })
  @ApiResponse({
    status: 413,
    description: '파일 크기 초과 (파일당 최대 10MB)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          description: '업로드 이미지 목록(선택), 최대 3개, 파일당 최대 10MB',
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        title: { type: 'string' },
        content: { type: 'string' },
        timeTaken: { type: 'string', example: '10분' },
        price: { type: 'number', example: 12000 },
        hashTag: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  create(
    @Request() req: AuthRequest,
    @Body() body: CreatePostDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.postService.create(req.user, body, files);
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '최신 게시글 조회' })
  @ApiResponse({
    status: 200,
    description: '최신 게시글 조회 성공',
    type: LatestContentsPageResponseDto,
  })
  getLatestContents(
    @GetUser() member: Member | null,
    @Query() queryDto: LatestContentsQueryDto,
  ) {
    return this.postService.getLatestContents(queryDto, member?.id);
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'newImages', maxCount: MAX_POST_IMAGE_COUNT }],
      {
        limits: { fileSize: MAX_POST_IMAGE_FILE_SIZE },
        fileFilter: imageFileFilter,
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '게시글 수정' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newImages: {
          description: '추가할 이미지 목록(선택), 최대 3개, 파일당 최대 10MB',
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        deleteImageIds: {
          description: '삭제할 이미지 ID 목록(선택)',
          type: 'array',
          items: { type: 'number' },
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
  @ApiResponse({ status: 200, description: '게시글 수정 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: UpdatePostDto,
    @UploadedFiles() files: { newImages?: Array<Express.Multer.File> },
  ) {
    return this.postService.update(+id, req.user, body, files?.newImages ?? []);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 200, description: '게시글 삭제 성공' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.postService.remove(+id, req.user);
  }
}
