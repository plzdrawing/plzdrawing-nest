import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { Member } from '../entities/member.entity';
import { Profile } from '../entities/profile.entity';
import {
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
import { PublicProfileResponseDto } from './dto/public-profile-response.dto';
import {
  PublicReviewSummaryResponseDto,
  ReviewKeywordCountDto,
} from './dto/public-review-summary-response.dto';
import {
  PublicReviewListItemDto,
  PublicReviewListResponseDto,
} from './dto/public-review-list-response.dto';
import { MemberQueryService } from './member-query.service';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);
  private static readonly PROFILE_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  private static readonly PROFILE_IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ]);

  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly awsService: AwsService,
    private readonly tagService: TagService,
    private readonly memberQueryService: MemberQueryService,
  ) {}

  async create(data: Partial<Member>): Promise<Member> {
    const normalizedEmail = data.email?.trim().toLowerCase();
    const normalizedNickname = data.nickname?.trim();

    if (normalizedEmail) {
      const existingMemberByEmail = await this.memberRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingMemberByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (normalizedNickname) {
      const existingMemberByNickname = await this.memberRepository.findOne({
        where: { nickname: normalizedNickname },
      });
      if (existingMemberByNickname) {
        throw new ConflictException('Nickname already exists');
      }
    }

    const member = this.memberRepository.create({
      status: MemberStatus.ACTIVE,
      role: MemberRole.ROLE_MEMBER,
      ...data,
      email: normalizedEmail ?? data.email,
      nickname: normalizedNickname ?? data.nickname,
    });
    return await this.memberRepository.save(member);
  }

  async findByEmail(email: string): Promise<Member | null> {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    return await this.memberRepository.findOne({
      where: { email: normalizedEmail },
    });
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
    this.validateProfileImage(file);

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

    const normalizedHashTags = this.normalizeHashTags(dto.hashTag);
    if (normalizedHashTags) {
      await this.tagService.syncMemberTags(member, normalizedHashTags);
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

    const normalizedNickname = dto.nickname?.trim();
    if (normalizedNickname) {
      const duplicatedMember = await this.memberRepository.findOne({
        where: { nickname: normalizedNickname },
      });
      if (duplicatedMember && duplicatedMember.id !== memberId) {
        throw new ConflictException('Nickname already exists');
      }

      member.nickname = normalizedNickname;
      await this.memberRepository.save(member);
    }
    this.validateProfileImage(file);

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

    const normalizedHashTags = this.normalizeHashTags(dto.hashTag);
    if (normalizedHashTags) {
      await this.tagService.syncMemberTags(member, normalizedHashTags);
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
    const member =
      await this.memberQueryService.findActiveMemberWithProfileAndTags(
        memberId,
      );
    if (!member) throw new NotFoundException('Member not found');

    const activeTags = member.memberTags
      .filter((mt) => mt.status === TagStatus.ACTIVE)
      .map((mt) => mt.tag.name);
    const drawingCount = await this.memberQueryService.countMemberPosts(
      member.id,
    );

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
    const exists = await this.memberQueryService.existsActiveMember(memberId);
    if (!exists) throw new NotFoundException('Member not found');

    const reviews =
      await this.memberQueryService.findReceiverReviewStars(memberId);

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

    const completedWorkCount =
      await this.memberQueryService.countCompletedWorks(memberId);

    let topKeywords: ReviewKeywordCountDto[] = [];
    if (reviews.length > 0) {
      const reviewIds = reviews.map((review) => review.id);
      const maps =
        await this.memberQueryService.findKeywordMapsByReviewIds(reviewIds);

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
    const exists = await this.memberQueryService.existsActiveMember(memberId);
    if (!exists) throw new NotFoundException('Member not found');

    const { page = 1, limit = 10 } = paginationDto;
    const [reviews, total] = await this.memberQueryService.findPublicReviews(
      memberId,
      page,
      limit,
    );

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

    const deletedSuffix = `${member.id}-${Date.now()}`;
    member.status = MemberStatus.INACTIVE;
    member.isDeleted = true;
    member.email = `deleted-${deletedSuffix}@example.invalid`;
    member.nickname = `deleted-member-${deletedSuffix}`;
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
    const normalizedNickname = nickname?.trim();
    if (!normalizedNickname) {
      throw new BadRequestException('Nickname is required');
    }

    const member = await this.memberRepository.findOne({
      where: { nickname: normalizedNickname },
    });
    return !!member;
  }

  private validateProfileImage(file?: Express.Multer.File): void {
    if (!file) {
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !MemberService.PROFILE_IMAGE_MIME_TYPES.has(file.mimetype) ||
      !MemberService.PROFILE_IMAGE_EXTENSIONS.has(ext)
    ) {
      throw new BadRequestException(
        'Profile image must be jpg, jpeg, png, or webp',
      );
    }
  }

  private normalizeHashTags(hashTags?: string[]): string[] | undefined {
    if (!hashTags) {
      return undefined;
    }

    return [
      ...new Set(
        hashTags
          .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
          .filter(Boolean),
      ),
    ];
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
