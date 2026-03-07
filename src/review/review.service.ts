import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Review } from '../entities/review.entity';
import { ReviewKeyword } from '../entities/review-keyword.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Member } from '../entities/member.entity';
import { ChatRoomStatus, MessageType, ReviewStar } from '../common/enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewKeyword)
    private readonly reviewKeywordRepository: Repository<ReviewKeyword>,
    @InjectRepository(ReviewKeywordMap)
    private readonly reviewKeywordMapRepository: Repository<ReviewKeywordMap>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async findSellingMemberStats(
    memberIds: number[],
  ): Promise<Map<number, { reviewCount: number; star: number }>> {
    if (memberIds.length === 0) return new Map();

    const reviews = await this.reviewRepository.find({
      where: { receiverId: In(memberIds) },
    });

    const stats = new Map<number, { count: number; sum: number }>();

    reviews.forEach((review) => {
      const starValue = this.convertStarToNumber(review.star);
      if (!stats.has(review.receiverId)) {
        stats.set(review.receiverId, { count: 0, sum: 0 });
      }
      const stat = stats.get(review.receiverId);
      stat.count++;
      stat.sum += starValue;
    });

    const result = new Map<number, { reviewCount: number; star: number }>();
    stats.forEach((val, key) => {
      result.set(key, {
        reviewCount: val.count,
        star: val.count > 0 ? val.sum / val.count : 0,
      });
    });

    return result;
  }

  async createReview(
    member: Member,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: dto.chatRoomId },
      relations: ['post'],
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    if (chatRoom.requesterId !== member.id) {
      throw new ForbiddenException('Only the requester can write a review');
    }
    if (chatRoom.status !== ChatRoomStatus.COMPLETED) {
      throw new BadRequestException('Chat room is not in COMPLETED status');
    }

    const existing = await this.reviewRepository.findOne({
      where: { chatRoomId: dto.chatRoomId },
    });
    if (existing) {
      throw new BadRequestException('Review already exists for this chat room');
    }

    const review = await this.reviewRepository.save(
      this.reviewRepository.create({
        chatRoomId: dto.chatRoomId,
        writerId: member.id,
        receiverId: chatRoom.artistId,
        postId: chatRoom.postId,
        star: dto.star,
        content: dto.content ?? null,
        imageObjectKeys: dto.imageObjectKeys ?? [],
      }),
    );

    const keywords: string[] = [];
    if (dto.keywords && dto.keywords.length > 0) {
      const keywordEntities = await this.reviewKeywordRepository.find({
        where: { keyword: In(dto.keywords), isActive: true },
      });
      const maps = keywordEntities.map((k) =>
        this.reviewKeywordMapRepository.create({
          reviewId: review.id,
          keywordId: k.id,
        }),
      );
      if (maps.length > 0) {
        await this.reviewKeywordMapRepository.save(maps);
      }
      keywordEntities.forEach((k) => keywords.push(k.keyword));
    }

    // 채팅방 상태 REVIEWED로 전환
    await this.chatRoomRepository.update(dto.chatRoomId, {
      status: ChatRoomStatus.REVIEWED,
    });

    // REVIEW_RECEIVED 시스템 메시지
    const message = this.messageRepository.create({
      chatRoomId: dto.chatRoomId,
      senderId: member.id,
      type: MessageType.SYSTEM,
      content: JSON.stringify({
        kind: 'REVIEW_RECEIVED',
        star: dto.star,
      }),
    });
    await this.messageRepository.save(message);

    return {
      id: review.id,
      chatRoomId: review.chatRoomId,
      star: review.star,
      content: review.content ?? undefined,
      keywords,
      imageObjectKeys: review.imageObjectKeys ?? [],
      writerId: review.writerId,
      receiverId: review.receiverId,
      createdAt: review.createdAt,
    };
  }

  private convertStarToNumber(star: ReviewStar): number {
    switch (star) {
      case ReviewStar.ONE:
        return 1;
      case ReviewStar.TWO:
        return 2;
      case ReviewStar.THREE:
        return 3;
      case ReviewStar.FOUR:
        return 4;
      case ReviewStar.FIVE:
        return 5;
      default:
        return 0;
    }
  }
}
