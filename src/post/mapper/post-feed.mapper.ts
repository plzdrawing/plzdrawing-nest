import { Injectable } from '@nestjs/common';
import { Post } from '../../entities/post.entity';
import { LatestContentsResponse } from '../dto/latest-contents-response.dto';
import { UploaderDto } from '../dto/uploader.dto';
import { ContentsDto } from '../dto/contents.dto';

type ReviewStat = { reviewCount: number; star: number };

@Injectable()
export class PostFeedMapper {
  toLatestContentsResponse(
    post: Post,
    params: {
      tags: string[];
      likeCount: number;
      profileImageUrl?: string;
      drawingCount: number;
      reviewStat?: ReviewStat;
    },
  ): LatestContentsResponse {
    const reviewStat = params.reviewStat ?? { reviewCount: 0, star: 0 };

    const uploaderDto = new UploaderDto(
      post.member.nickname,
      params.profileImageUrl,
      params.drawingCount,
      reviewStat.reviewCount,
      reviewStat.star,
    );

    const contentsDto = new ContentsDto(
      post.id,
      post.createdAt,
      post.images.map((img) => img.imageUrl),
      params.tags,
      post.content,
      post.timeTaken ?? '',
      post.price ?? 0,
      params.likeCount,
    );

    return new LatestContentsResponse(uploaderDto, contentsDto);
  }

  toMemberContentsDto(
    post: Post,
    params: { tags: string[]; likeCount: number },
  ): ContentsDto {
    return new ContentsDto(
      post.id,
      post.createdAt,
      post.images.map((img) => img.imageUrl),
      params.tags,
      post.content,
      post.timeTaken ?? '',
      post.price ?? 0,
      params.likeCount,
    );
  }
}
