import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { ScrapService } from './scrap.service';
import { ScrapStatusResponseDto } from './dto/scrap-status-response.dto';

@ApiTags('Scrap')
@Controller('posts')
export class ScrapController {
  constructor(private readonly scrapService: ScrapService) {}

  @Post(':postId/scrap')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '게시글 찜' })
  @ApiParam({ name: 'postId', description: '게시글 ID', example: 1 })
  @ApiResponse({
    status: 201,
    description: '찜 성공 (멱등)',
    type: ScrapStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  scrapPost(
    @GetUser() member: Member,
    @Param('postId') postId: string,
  ): Promise<ScrapStatusResponseDto> {
    return this.scrapService.scrapPost(member.id, +postId);
  }

  @Delete(':postId/scrap')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '게시글 찜 해제' })
  @ApiParam({ name: 'postId', description: '게시글 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '찜 해제 성공 (멱등)',
    type: ScrapStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  unscrapPost(
    @GetUser() member: Member,
    @Param('postId') postId: string,
  ): Promise<ScrapStatusResponseDto> {
    return this.scrapService.unscrapPost(member.id, +postId);
  }
}
