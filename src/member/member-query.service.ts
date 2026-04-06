import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChatRoomStatus, MemberStatus } from '../common/enums';
import { ChatRoom } from '../entities/chat-room.entity';
import { Member } from '../entities/member.entity';
import { Post } from '../entities/post.entity';
import { Review } from '../entities/review.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';

@Injectable()
export class MemberQueryService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewKeywordMap)
    private readonly reviewKeywordMapRepository: Repository<ReviewKeywordMap>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
  ) {}

  findActiveMemberWithProfileAndTags(memberId: number): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { id: memberId, isDeleted: false, status: MemberStatus.ACTIVE },
      relations: ['profile', 'memberTags', 'memberTags.tag'],
    });
  }

  async existsActiveMember(memberId: number): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, isDeleted: false, status: MemberStatus.ACTIVE },
      select: ['id'],
    });
    return !!member;
  }

  countMemberPosts(memberId: number): Promise<number> {
    return this.postRepository.count({
      where: { memberId },
    });
  }

  findReceiverReviewStars(
    receiverId: number,
  ): Promise<Array<Pick<Review, 'id' | 'star'>>> {
    return this.reviewRepository.find({
      where: { receiverId },
      select: ['id', 'star'],
    });
  }

  countCompletedWorks(artistId: number): Promise<number> {
    return this.chatRoomRepository.count({
      where: {
        artistId,
        status: In([ChatRoomStatus.COMPLETED, ChatRoomStatus.REVIEWED]),
      },
    });
  }

  findKeywordMapsByReviewIds(reviewIds: number[]): Promise<ReviewKeywordMap[]> {
    if (reviewIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.reviewKeywordMapRepository.find({
      where: { reviewId: In(reviewIds) },
      relations: ['keyword'],
    });
  }

  findPublicReviews(
    receiverId: number,
    page: number,
    limit: number,
  ): Promise<[Review[], number]> {
    return this.reviewRepository.findAndCount({
      where: { receiverId },
      relations: [
        'writer',
        'writer.profile',
        'reviewKeywordMaps',
        'reviewKeywordMaps.keyword',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
