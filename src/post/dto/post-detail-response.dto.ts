import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import * as moment from 'moment';
import { PostCategory, TagStatus } from '../../common/enums';

export class PostDetailMemberDto {
  @ApiProperty({ description: '회원 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '닉네임', example: '작가님' })
  nickname: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.png',
    nullable: true,
  })
  profileImageUrl: string | null;

  constructor(id: number, nickname: string, profileImageUrl: string | null) {
    this.id = id;
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
  }
}

export class PostDetailImageDto {
  @ApiProperty({ description: '이미지 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '게시글 ID', example: 1 })
  postId: number;

  @ApiProperty({
    description: '이미지 URL',
    example: 'https://example.com/image.png',
    nullable: true,
  })
  imageUrl: string | null;

  constructor(id: number, postId: number, imageUrl: string | null) {
    this.id = id;
    this.postId = postId;
    this.imageUrl = imageUrl;
  }
}

export class PostDetailTagDto {
  @ApiProperty({ description: '태그 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '태그 이름', example: '캐릭터', nullable: true })
  name: string | null;

  constructor(id: number, name: string | null) {
    this.id = id;
    this.name = name;
  }
}

export class PostDetailPostTagDto {
  @ApiProperty({ description: '게시글 태그 연결 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '게시글 ID', example: 1 })
  postId: number;

  @ApiProperty({ description: '태그 ID', example: 1 })
  tagId: number;

  @ApiProperty({ description: '태그 상태', enum: TagStatus, nullable: true })
  status: TagStatus | null;

  @ApiProperty({ description: '태그', type: PostDetailTagDto })
  tag: PostDetailTagDto;

  constructor(
    id: number,
    postId: number,
    tagId: number,
    status: TagStatus | null,
    tag: PostDetailTagDto,
  ) {
    this.id = id;
    this.postId = postId;
    this.tagId = tagId;
    this.status = status;
    this.tag = tag;
  }
}

export class PostDetailCommentDto {
  @ApiProperty({ description: '댓글 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '게시글 ID', example: 1 })
  postId: number;

  @ApiProperty({ description: '작성자 ID', example: 1 })
  memberId: number;

  @ApiProperty({ description: '댓글 내용', example: '멋져요!', nullable: true })
  content: string | null;

  @ApiProperty({ description: '댓글 작성 시각' })
  createdAt: Date;

  @ApiProperty({ description: '댓글 작성자', type: PostDetailMemberDto })
  member: PostDetailMemberDto;

  constructor(
    id: number,
    postId: number,
    memberId: number,
    content: string | null,
    createdAt: Date,
    member: PostDetailMemberDto,
  ) {
    this.id = id;
    this.postId = postId;
    this.memberId = memberId;
    this.content = content;
    this.createdAt = createdAt;
    this.member = member;
  }
}

export class PostDetailResponseDto {
  @ApiProperty({ description: '게시글 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '작성자 ID', example: 1 })
  memberId: number;

  @ApiProperty({
    description: '제목',
    example: '그림 그려주세요',
    nullable: true,
  })
  title: string | null;

  @ApiProperty({
    description: '카테고리',
    enum: PostCategory,
    nullable: true,
  })
  category: PostCategory | null;

  @ApiProperty({
    description: '내용',
    example: '상세 내용입니다.',
    nullable: true,
  })
  content: string | null;

  @ApiProperty({ description: '소요 시간', example: '10분', nullable: true })
  timeTaken: string | null;

  @ApiProperty({ description: '가격', example: 12000, nullable: true })
  price: number | null;

  @ApiProperty({
    description: '썸네일 URL',
    example: 'https://example.com/image.jpg',
    nullable: true,
  })
  thumbnailUrl: string | null;

  @ApiProperty({ description: '작성 시각' })
  @Transform(({ value }) =>
    moment(value as moment.MomentInput).format('YYYY-MM-DD HH:mm:ss'),
  )
  createdAt: Date;

  @ApiProperty({ description: '수정 시각' })
  @Transform(({ value }) =>
    moment(value as moment.MomentInput).format('YYYY-MM-DD HH:mm:ss'),
  )
  updatedAt: Date;

  @ApiProperty({ description: '작성자', type: PostDetailMemberDto })
  member: PostDetailMemberDto;

  @ApiProperty({ description: '이미지 목록', type: [PostDetailImageDto] })
  images: PostDetailImageDto[];

  @ApiProperty({ description: '태그 목록', type: [PostDetailPostTagDto] })
  postTags: PostDetailPostTagDto[];

  @ApiProperty({ description: '댓글 목록', type: [PostDetailCommentDto] })
  comments: PostDetailCommentDto[];

  constructor(
    id: number,
    memberId: number,
    title: string | null,
    category: PostCategory | null,
    content: string | null,
    timeTaken: string | null,
    price: number | null,
    thumbnailUrl: string | null,
    createdAt: Date,
    updatedAt: Date,
    member: PostDetailMemberDto,
    images: PostDetailImageDto[],
    postTags: PostDetailPostTagDto[],
    comments: PostDetailCommentDto[],
  ) {
    this.id = id;
    this.memberId = memberId;
    this.title = title;
    this.category = category;
    this.content = content;
    this.timeTaken = timeTaken;
    this.price = price;
    this.thumbnailUrl = thumbnailUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.member = member;
    this.images = images;
    this.postTags = postTags;
    this.comments = comments;
  }
}
