import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import {
  ChatRoomStatus,
  MemberRole,
  MemberStatus,
  ReviewStar,
  TagStatus,
} from '../common/enums';
import { AwsService } from '../common/aws/aws.service';
import { TagService } from '../tag/tag.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileInfoResponse } from './dto/profile-info-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Post } from '../entities/post.entity';
import { Review } from '../entities/review.entity';
import { ReviewKeywordMap } from '../entities/review-keyword-map.entity';
import { ChatRoom } from '../entities/chat-room.entity';
import { PublicProfileResponseDto } from './dto/public-profile-response.dto';
import {
  PublicReviewSummaryResponseDto,
  ReviewKeywordCountDto,
} from './dto/public-review-summary-response.dto';
import {
  PublicReviewListItemDto,
  PublicReviewListResponseDto,
} from './dto/public-review-list-response.dto';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewKeywordMap)
    private readonly reviewKeywordMapRepository: Repository<ReviewKeywordMap>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    private readonly awsService: AwsService,
    private readonly tagService: TagService,
  ) {}

  async create(data: Partial<Member>): Promise<Member> {
    const member = this.memberRepository.create({
      status: MemberStatus.ACTIVE,
      role: MemberRole.ROLE_MEMBER,
      ...data,
    });
    return await this.memberRepository.save(member);
  }

  async findByEmail(email: string): Promise<Member | null> {
    return await this.memberRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<Member | null> {
    return await this.memberRepository.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<Member>): Promise<Member> {
    await this.memberRepository.update(id, data);
    return this.findById(id);
  }

  async uploadProfile(
    memberId: number,
    file: Express.Multer.File,
    dto: UpsertProfileDto,
  ): Promise<boolean> {
    const member = await this.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');

    let profileUrl = null;
    if (file) {
      profileUrl = await this.awsService.uploadFile(file, 'profile');
    }

    let profile = await this.profileRepository.findOne({
      where: { memberId },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        memberId,
        profileUrl,
        introduction: dto.introduce,
      });
    } else {
      if (profileUrl) {
        if (profile.profileUrl) {
          await this.awsService.deleteFile(profile.profileUrl);
        }
        profile.profileUrl = profileUrl;
      }
      if (dto.introduce !== undefined) {
        profile.introduction = dto.introduce;
      }
    }
    await this.profileRepository.save(profile);

    if (dto.hashTag !== undefined) {
      await this.tagService.syncMemberTags(member, dto.hashTag);
    }

    if (member.role === MemberRole.ROLE_TEMP) {
      member.role = MemberRole.ROLE_MEMBER;
      await this.memberRepository.save(member);
    }

    return true;
  }

  async updateProfile(
    memberId: number,
    file: Express.Multer.File,
    dto: UpdateProfileDto,
  ): Promise<boolean> {
    const member = await this.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');

    if (dto.nickname) {
      member.nickname = dto.nickname;
      await this.memberRepository.save(member);
    }

    let profileUrl = null;
    if (file) {
      profileUrl = await this.awsService.uploadFile(file, 'profile');
    }

    let profile = await this.profileRepository.findOne({
      where: { memberId },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        memberId,
        profileUrl,
        introduction: dto.introduce,
      });
    } else {
      if (profileUrl) {
        if (profile.profileUrl) {
          await this.awsService.deleteFile(profile.profileUrl);
        }
        profile.profileUrl = profileUrl;
      }
      if (dto.introduce !== undefined) {
        profile.introduction = dto.introduce;
      }
    }
    await this.profileRepository.save(profile);

    if (dto.hashTag !== undefined) {
      await this.tagService.syncMemberTags(member, dto.hashTag);
    }

    return true;
  }

  async getMyProfile(memberId: number): Promise<ProfileInfoResponse> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['profile', 'memberTags', 'memberTags.tag'],
    });
    if (!member) throw new NotFoundException('Member not found');

    const activeTags = member.memberTags
      .filter((mt) => mt.status === TagStatus.ACTIVE)
      .map((mt) => mt.tag.name);

    return new ProfileInfoResponse(
      member.nickname,
      member.email,
      member.profile ? member.profile.profileUrl : null,
      member.profile ? member.profile.introduction : null,
      activeTags,
    );
  }

  async getPublicProfile(memberId: number): Promise<PublicProfileResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, isDeleted: false, status: MemberStatus.ACTIVE },
      relations: ['profile', 'memberTags', 'memberTags.tag'],
    });
    if (!member) throw new NotFoundException('Member not found');

    const activeTags = member.memberTags
      .filter((mt) => mt.status === TagStatus.ACTIVE)
      .map((mt) => mt.tag.name);
    const drawingCount = await this.postRepository.count({
      where: { memberId: member.id },
    });

    return new PublicProfileResponseDto(
      member.id,
      member.nickname,
      member.profile ? member.profile.profileUrl : null,
      member.profile ? member.profile.introduction : null,
      activeTags,
      drawingCount,
    );
  }

  async getPublicReviewSummary(
    memberId: number,
  ): Promise<PublicReviewSummaryResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, isDeleted: false, status: MemberStatus.ACTIVE },
      select: ['id'],
    });
    if (!member) throw new NotFoundException('Member not found');

    const reviews = await this.reviewRepository.find({
      where: { receiverId: memberId },
      select: ['id', 'star'],
    });

    const reviewCount = reviews.length;
    const averageStar =
      reviewCount > 0
        ? Number(
            (
              reviews.reduce(
                (sum, review) => sum + this.convertStarToNumber(review.star),
                0,
              ) / reviewCount
            ).toFixed(2),
          )
        : 0;

    const completedWorkCount = await this.chatRoomRepository.count({
      where: {
        artistId: memberId,
        status: In([ChatRoomStatus.COMPLETED, ChatRoomStatus.REVIEWED]),
      },
    });

    let topKeywords: ReviewKeywordCountDto[] = [];
    if (reviews.length > 0) {
      const reviewIds = reviews.map((review) => review.id);
      const maps = await this.reviewKeywordMapRepository.find({
        where: { reviewId: In(reviewIds) },
        relations: ['keyword'],
      });

      const keywordCounter = new Map<string, number>();
      maps.forEach((map) => {
        if (!map.keyword || !map.keyword.keyword || !map.keyword.isActive) {
          return;
        }
        const prev = keywordCounter.get(map.keyword.keyword) ?? 0;
        keywordCounter.set(map.keyword.keyword, prev + 1);
      });

      topKeywords = [...keywordCounter.entries()]
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0], 'ko');
        })
        .slice(0, 5)
        .map(([keyword, count]) => new ReviewKeywordCountDto(keyword, count));
    }

    return new PublicReviewSummaryResponseDto(
      averageStar,
      reviewCount,
      completedWorkCount,
      topKeywords,
    );
  }

  async getPublicReviews(
    memberId: number,
    paginationDto: PaginationDto,
  ): Promise<PublicReviewListResponseDto> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, isDeleted: false, status: MemberStatus.ACTIVE },
      select: ['id'],
    });
    if (!member) throw new NotFoundException('Member not found');

    const { page = 1, limit = 10 } = paginationDto;
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { receiverId: memberId },
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

    const data = reviews.map((review) => {
      const keywords = review.reviewKeywordMaps
        ? review.reviewKeywordMaps
            .filter((map) => map.keyword && map.keyword.isActive)
            .map((map) => map.keyword.keyword)
        : [];

      return new PublicReviewListItemDto(
        review.id,
        this.convertStarToNumber(review.star),
        review.content ?? '',
        keywords,
        review.imageObjectKeys ?? [],
        review.writerId,
        review.writer ? review.writer.nickname : '',
        review.writer && review.writer.profile
          ? review.writer.profile.profileUrl
          : null,
        review.createdAt,
      );
    });

    return { data, total, page, limit };
  }

  async withdraw(memberId: number): Promise<void> {
    const member = await this.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');

    member.status = MemberStatus.INACTIVE;
    member.isDeleted = true;
    await this.memberRepository.save(member);
  }

  async findProfileImageUrlByMemberIds(
    memberIds: number[],
  ): Promise<Map<number, string>> {
    if (memberIds.length === 0) return new Map();

    const members = await this.memberRepository.find({
      where: { id: In(memberIds) },
      relations: ['profile'],
    });

    const map = new Map<number, string>();
    members.forEach((member) => {
      if (member.profile && member.profile.profileUrl) {
        map.set(member.id, member.profile.profileUrl);
      }
    });
    return map;
  }

  async checkNickname(nickname: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({ where: { nickname } });
    return !!member;
  }

  async updatePassword(
    email: string,
    oldPassword?: string,
    newPassword?: string,
  ): Promise<void> {
    const member = await this.findByEmail(email);
    if (!member) throw new NotFoundException('Member not found');

    if (oldPassword) {
      const isMatch = await bcrypt.compare(oldPassword, member.password);
      if (!isMatch) {
        throw new BadRequestException('Existing password does not match');
      }
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      member.password = hashedPassword;
      await this.memberRepository.save(member);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Running Cron Job: Delete expired TEMP members');

    // 24시간 전 (어제 이 시간)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await this.memberRepository.delete({
      role: MemberRole.ROLE_TEMP,
      status: MemberStatus.ACTIVE,
      createdAt: LessThan(yesterday),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Deleted ${result.affected} expired TEMP members.`);
    }
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
