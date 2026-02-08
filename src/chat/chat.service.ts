import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, Not } from 'typeorm';
import * as path from 'path';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Post } from '../entities/post.entity';
import { Member } from '../entities/member.entity';
import { AwsService } from '../common/aws/aws.service';
import { ChatRoomStatus, MessageType } from '../common/enums';
import {
  CHAT_IMAGE_ALLOWED_CONTENT_TYPES,
  CHAT_IMAGE_DOWNLOAD_EXPIRES_IN_SECONDS,
  CHAT_IMAGE_UPLOAD_EXPIRES_IN_SECONDS,
  MAX_CHAT_IMAGE_SIZE_BYTES,
} from './chat.constants';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomStatusDto } from './dto/update-chat-room-status.dto';
import { ChatRoomListQueryDto } from './dto/chat-room-list-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageListQueryDto } from './dto/message-list-query.dto';
import { ReadChatDto } from './dto/read-chat.dto';
import { ChatImageUploadRequestDto } from './dto/chat-image-upload-request.dto';
import { ChatImageUploadResponseDto } from './dto/chat-image-upload-response.dto';
import { ChatRoomCreateResponseDto } from './dto/chat-room-create-response.dto';
import { ChatRoomDetailResponseDto } from './dto/chat-room-detail-response.dto';
import { ChatRoomListResponseDto } from './dto/chat-room-list-response.dto';
import { ChatRoomListItemDto } from './dto/chat-room-list-item.dto';
import { ChatUserDto } from './dto/chat-user.dto';
import { ChatRoomPostDto } from './dto/chat-room-post.dto';
import { LastMessageDto } from './dto/last-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageListResponseDto } from './dto/message-list-response.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly awsService: AwsService,
  ) {}

  async createChatRoom(
    member: Member,
    dto: CreateChatRoomDto,
  ): Promise<ChatRoomCreateResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id: dto.postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const artistId = post.memberId;
    if (artistId === member.id) {
      throw new BadRequestException('Cannot create chat with yourself');
    }

    const existing = await this.chatRoomRepository.findOne({
      where: {
        postId: post.id,
        requesterId: member.id,
        artistId,
      },
    });
    if (existing) {
      const chatRoom = await this.getChatRoomDetail(member, existing.id);
      return { isExisting: true, chatRoom };
    }

    const chatRoom = this.chatRoomRepository.create({
      postId: post.id,
      requesterId: member.id,
      artistId,
      description: dto.description,
      price: dto.price,
      status: ChatRoomStatus.REQUESTED,
    });
    const saved = await this.chatRoomRepository.save(chatRoom);

    await this.createRequestCardMessage(saved, member, post);
    await this.touchChatRoom(saved.id);

    return {
      isExisting: false,
      chatRoom: await this.getChatRoomDetail(member, saved.id),
    };
  }

  async getChatRooms(
    member: Member,
    query: ChatRoomListQueryDto,
  ): Promise<ChatRoomListResponseDto> {
    const { page = 1, limit = 10, status, unreadOnly } = query;

    const qb = this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .leftJoinAndSelect('chatRoom.post', 'post')
      .leftJoinAndSelect('chatRoom.requester', 'requester')
      .leftJoinAndSelect('requester.profile', 'requesterProfile')
      .leftJoinAndSelect('chatRoom.artist', 'artist')
      .leftJoinAndSelect('artist.profile', 'artistProfile')
      .where(
        new Brackets((subQb) => {
          subQb
            .where('chatRoom.requesterId = :memberId', { memberId: member.id })
            .orWhere('chatRoom.artistId = :memberId', { memberId: member.id });
        }),
      );

    if (status) {
      qb.andWhere('chatRoom.status = :status', { status });
    }

    if (unreadOnly) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM message m
          WHERE m.chat_room_id = chatRoom.id
            AND m.is_read = false
            AND m.sender_id != :memberId
        )`,
        { memberId: member.id },
      );
    }

    qb.orderBy('chatRoom.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [chatRooms, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      chatRooms.map(async (chatRoom) =>
        this.mapChatRoomListItem(chatRoom, member.id),
      ),
    );

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getChatRoomDetail(
    member: Member,
    chatRoomId: number,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: [
        'post',
        'requester',
        'requester.profile',
        'artist',
        'artist.profile',
      ],
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    return this.mapChatRoomDetail(chatRoom);
  }

  async updateChatRoomStatus(
    member: Member,
    chatRoomId: number,
    dto: UpdateChatRoomStatusDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: [
        'post',
        'requester',
        'requester.profile',
        'artist',
        'artist.profile',
      ],
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    chatRoom.status = dto.status;
    await this.chatRoomRepository.save(chatRoom);

    const message = this.messageRepository.create({
      chatRoomId: chatRoom.id,
      senderId: member.id,
      type: MessageType.SYSTEM,
      content: JSON.stringify({
        kind: 'STATUS_CHANGED',
        status: dto.status,
      }),
    });
    await this.messageRepository.save(message);
    await this.touchChatRoom(chatRoom.id);

    return this.mapChatRoomDetail(chatRoom);
  }

  async createImageUpload(
    member: Member,
    chatRoomId: number,
    dto: ChatImageUploadRequestDto,
  ): Promise<ChatImageUploadResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    this.assertImageUpload(dto);

    const objectKey = this.buildImageObjectKey(
      chatRoom.id,
      dto.fileName,
      dto.contentType,
    );
    const uploadUrl = await this.awsService.createPresignedUploadUrl(
      objectKey,
      dto.contentType,
      CHAT_IMAGE_UPLOAD_EXPIRES_IN_SECONDS,
    );
    const expiresAt = new Date(
      Date.now() + CHAT_IMAGE_UPLOAD_EXPIRES_IN_SECONDS * 1000,
    ).toISOString();

    return { uploadUrl, objectKey, expiresAt };
  }

  async getMessages(
    member: Member,
    chatRoomId: number,
    query: MessageListQueryDto,
  ): Promise<MessageListResponseDto> {
    const { beforeId, afterId, limit = 30 } = query;
    if (beforeId && afterId) {
      throw new BadRequestException(
        'beforeId and afterId cannot be used together',
      );
    }

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatRoomId = :chatRoomId', { chatRoomId });

    if (beforeId) {
      qb.andWhere('message.id < :beforeId', { beforeId });
    }
    if (afterId) {
      qb.andWhere('message.id > :afterId', { afterId });
    }

    qb.orderBy('message.id', afterId ? 'ASC' : 'DESC').take(limit);

    const messages = await qb.getMany();
    const ordered = afterId ? messages : messages.reverse();

    const data = await Promise.all(
      ordered.map((message) => this.mapMessage(message)),
    );
    return { data };
  }

  async sendMessage(
    member: Member,
    chatRoomId: number,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    const type = dto.type ?? MessageType.TEXT;
    if (type === MessageType.SYSTEM) {
      throw new BadRequestException('Unsupported message type');
    }

    if (type === MessageType.TEXT) {
      if (!dto.content || dto.content.trim().length === 0) {
        throw new BadRequestException('Message content is required');
      }
    } else if (type === MessageType.IMAGE) {
      if (!dto.objectKey) {
        throw new BadRequestException('objectKey is required');
      }
      this.assertImageObjectKey(dto.objectKey, chatRoom.id);
      if (
        dto.mimeType &&
        !CHAT_IMAGE_ALLOWED_CONTENT_TYPES.includes(dto.mimeType)
      ) {
        throw new BadRequestException('Unsupported image content type');
      }
      if (dto.size && dto.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
        throw new BadRequestException('Image is too large');
      }
    }

    const message = this.messageRepository.create({
      chatRoomId: chatRoom.id,
      senderId: member.id,
      type,
      content: type === MessageType.TEXT ? dto.content : null,
      imageUrl: type === MessageType.IMAGE ? dto.objectKey : null,
    });
    const saved = await this.messageRepository.save(message);
    await this.touchChatRoom(chatRoom.id);

    return this.mapMessage(saved);
  }

  async markAsRead(
    member: Member,
    chatRoomId: number,
    dto: ReadChatDto,
  ): Promise<{ updatedCount: number }> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    const qb = this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('chat_room_id = :chatRoomId', { chatRoomId })
      .andWhere('sender_id != :memberId', { memberId: member.id })
      .andWhere('is_read = false');

    if (dto.lastReadMessageId) {
      qb.andWhere('id <= :lastReadMessageId', {
        lastReadMessageId: dto.lastReadMessageId,
      });
    }

    const result = await qb.execute();
    return { updatedCount: result.affected ?? 0 };
  }

  private async createRequestCardMessage(
    chatRoom: ChatRoom,
    member: Member,
    post: Post,
  ): Promise<void> {
    const content = JSON.stringify({
      kind: 'REQUEST_CARD',
      postId: post.id,
      title: post.title,
      price: chatRoom.price ?? null,
      description: chatRoom.description ?? null,
    });

    const message = this.messageRepository.create({
      chatRoomId: chatRoom.id,
      senderId: member.id,
      type: MessageType.SYSTEM,
      content,
      imageUrl: post.thumbnailUrl ?? null,
    });
    await this.messageRepository.save(message);
  }

  private async touchChatRoom(chatRoomId: number): Promise<void> {
    await this.chatRoomRepository.update(chatRoomId, {
      updatedAt: new Date(),
    });
  }

  private assertMember(chatRoom: ChatRoom, memberId: number): void {
    if (chatRoom.requesterId !== memberId && chatRoom.artistId !== memberId) {
      throw new ForbiddenException('Chat room access denied');
    }
  }

  private mapChatRoomDetail(chatRoom: ChatRoom): ChatRoomDetailResponseDto {
    return {
      chatRoomId: chatRoom.id,
      status: chatRoom.status,
      post: this.mapPost(chatRoom.post),
      requester: this.mapUser(chatRoom.requester),
      artist: this.mapUser(chatRoom.artist),
      description: chatRoom.description ?? undefined,
      price: chatRoom.price ?? undefined,
      paidAmount: chatRoom.paidAmount ?? undefined,
      createdAt: chatRoom.createdAt,
      updatedAt: chatRoom.updatedAt,
    };
  }

  private async mapChatRoomListItem(
    chatRoom: ChatRoom,
    memberId: number,
  ): Promise<ChatRoomListItemDto> {
    const counterpart =
      chatRoom.requesterId === memberId ? chatRoom.artist : chatRoom.requester;

    const lastMessage = await this.messageRepository.findOne({
      where: { chatRoomId: chatRoom.id },
      order: { id: 'DESC' },
    });

    const unreadCount = await this.messageRepository.count({
      where: {
        chatRoomId: chatRoom.id,
        senderId: Not(memberId),
        isRead: false,
      },
    });

    const lastMessageDto = lastMessage
      ? await this.mapLastMessage(lastMessage)
      : undefined;

    return {
      chatRoomId: chatRoom.id,
      postId: chatRoom.postId,
      title: chatRoom.post?.title ?? '',
      thumbnailUrl: chatRoom.post?.thumbnailUrl ?? undefined,
      status: chatRoom.status,
      counterpart: this.mapUser(counterpart),
      lastMessage: lastMessageDto,
      unreadCount,
      price: chatRoom.price ?? undefined,
      paidAmount: chatRoom.paidAmount ?? undefined,
      updatedAt: chatRoom.updatedAt,
    };
  }

  private mapUser(member: Member): ChatUserDto {
    return {
      id: member.id,
      nickname: member.nickname,
      profileImageUrl: member.profile?.profileUrl ?? undefined,
    };
  }

  private mapPost(post: Post): ChatRoomPostDto {
    return {
      id: post.id,
      title: post.title ?? '',
      thumbnailUrl: post.thumbnailUrl ?? undefined,
    };
  }

  private async mapLastMessage(message: Message): Promise<LastMessageDto> {
    const imageUrl = await this.resolveMessageImageUrl(message);
    return {
      id: message.id,
      type: message.type,
      content: message.content ?? undefined,
      imageUrl,
      sentAt: message.sentAt,
    };
  }

  private async mapMessage(message: Message): Promise<MessageResponseDto> {
    const imageUrl = await this.resolveMessageImageUrl(message);
    return {
      id: message.id,
      chatRoomId: message.chatRoomId,
      senderId: message.senderId,
      type: message.type,
      content: message.content ?? undefined,
      imageUrl,
      isRead: message.isRead,
      sentAt: message.sentAt,
    };
  }

  private assertImageUpload(dto: ChatImageUploadRequestDto): void {
    if (!CHAT_IMAGE_ALLOWED_CONTENT_TYPES.includes(dto.contentType)) {
      throw new BadRequestException('Unsupported image content type');
    }
    if (dto.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image is too large');
    }
  }

  private buildImageObjectKey(
    chatRoomId: number,
    fileName: string,
    contentType: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = this.resolveImageExtension(fileName, contentType);
    return `chat/${chatRoomId}/${year}/${month}/${randomUUID()}${ext}`;
  }

  private resolveImageExtension(fileName: string, contentType: string): string {
    const extFromType = this.getImageExtension(contentType);
    if (!extFromType) {
      throw new BadRequestException('Unsupported image content type');
    }
    const extFromName = path.extname(fileName).toLowerCase();
    if (extFromName && extFromName !== extFromType) {
      return extFromType;
    }
    return extFromType;
  }

  private getImageExtension(contentType: string): string {
    switch (contentType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private assertImageObjectKey(objectKey: string, chatRoomId: number): void {
    const expectedPrefix = `chat/${chatRoomId}/`;
    if (!objectKey.startsWith(expectedPrefix) || objectKey.includes('..')) {
      throw new BadRequestException('Invalid object key');
    }
  }

  private async resolveMessageImageUrl(
    message: Message,
  ): Promise<string | undefined> {
    if (!message.imageUrl) return undefined;
    if (message.type !== MessageType.IMAGE) return message.imageUrl;
    if (this.isAbsoluteUrl(message.imageUrl)) return message.imageUrl;
    return this.awsService.createPresignedGetUrl(
      message.imageUrl,
      CHAT_IMAGE_DOWNLOAD_EXPIRES_IN_SECONDS,
    );
  }

  private isAbsoluteUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
  }
}
