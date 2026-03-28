import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { JwtOptionalAuthGuard } from '../auth/guards/jwt-optional-auth.guard';
import { ReviewListQueryDto } from './dto/review-list-query.dto';
import { ReviewPageResponseDto } from './dto/review-page-response.dto';

@ApiTags('Review')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '후기 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '후기 목록 조회 성공',
    type: ReviewPageResponseDto,
  })
  async getLatestReviews(
    @GetUser() member: Member | null,
    @Query() queryDto: ReviewListQueryDto,
  ): Promise<ReviewPageResponseDto> {
    return this.reviewService.getLatestReviews(queryDto, member?.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '후기 작성',
    description:
      'COMPLETED 상태의 채팅방에 대해 요청자가 후기를 작성합니다. 채팅방당 1회만 작성 가능하며, 완료 후 채팅방 상태가 REVIEWED로 전환됩니다.',
  })
  @ApiBody({
    type: CreateReviewDto,
    examples: {
      default: {
        summary: '후기 작성 요청',
        value: {
          chatRoomId: 1,
          star: 'FIVE',
          keywords: ['귀여워요', '친절해요', '섬세해요'],
          content: '요청사항을 너무 잘 들어주세요! 정말 만족합니다 :)',
          imageObjectKeys: ['review/1/2026/03/uuid1.jpg'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '후기 작성 성공',
    type: ReviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 상태 또는 이미 작성된 후기',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async createReview(
    @GetUser() member: Member,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.createReview(member, dto);
  }
}
