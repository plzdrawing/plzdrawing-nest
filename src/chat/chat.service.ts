import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository, Not } from 'typeorm';
import * as path from 'path';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Post } from '../entities/post.entity';
import { Member } from '../entities/member.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { AwsService } from '../common/aws/aws.service';
import {
  ChatRoomStatus,
  MessageType,
  PaymentStatus,
  PaymentType,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../common/enums';
import {
  CHAT_IMAGE_ALLOWED_CONTENT_TYPES,
  CHAT_IMAGE_DOWNLOAD_EXPIRES_IN_SECONDS,
  CHAT_IMAGE_UPLOAD_EXPIRES_IN_SECONDS,
  MAX_CHAT_IMAGE_SIZE_BYTES,
} from './chat.constants';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
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
import { AcceptChatDto } from './dto/accept-chat.dto';
import { RejectChatDto } from './dto/reject-chat.dto';
import { RequestPriceChangeDto } from './dto/request-price-change.dto';
import { PayChatResponseDto } from './dto/pay-chat-response.dto';
import { SendDrawingDto } from './dto/send-drawing.dto';
import { SendDrawingResponseDto } from './dto/send-drawing-response.dto';
import { RevisionRequestDto } from './dto/revision-request.dto';
import { UpdateChatRequestDto } from './dto/update-chat-request.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly dataSource: DataSource,
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

    if (
      dto.referenceImageObjectKeys &&
      dto.referenceImageObjectKeys.length > 0
    ) {
      dto.referenceImageObjectKeys.forEach((key) =>
        this.assertRequestImageObjectKey(key, member.id),
      );
    }

    const chatRoom = this.chatRoomRepository.create({
      postId: post.id,
      requesterId: member.id,
      artistId,
      description: dto.description,
      referenceImageObjectKeys: dto.referenceImageObjectKeys ?? [],
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

  async createRequestImageUpload(
    member: Member,
    dto: ChatImageUploadRequestDto,
  ): Promise<ChatImageUploadResponseDto> {
    this.assertImageUpload(dto);

    const objectKey = this.buildRequestImageObjectKey(
      member.id,
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

  async deleteChatRoom(member: Member, chatRoomId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    this.assertMember(chatRoom, member.id);

    if (
      chatRoom.status !== ChatRoomStatus.CANCELLED &&
      chatRoom.status !== ChatRoomStatus.REVIEWED
    ) {
      throw new BadRequestException(
        'Can only delete chat room in CANCELLED or REVIEWED status',
      );
    }

    await this.messageRepository.delete({ chatRoomId: chatRoom.id });
    await this.chatRoomRepository.delete(chatRoom.id);
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

  // ── 요청 내용 수정 (REQUESTED 상태, 요청자 전용) ──────────────────────────
  async updateChatRequest(
    member: Member,
    chatRoomId: number,
    dto: UpdateChatRequestDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.requesterId !== member.id) {
      throw new ForbiddenException('Only the requester can update the request');
    }
    if (chatRoom.status !== ChatRoomStatus.REQUESTED) {
      throw new BadRequestException(
        'Can only update request in REQUESTED status',
      );
    }

    chatRoom.description = dto.description;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'REQUEST_CARD',
      postId: chatRoom.post.id,
      title: chatRoom.post.title,
      price: chatRoom.price ?? null,
      description: dto.description,
    });
    await this.touchChatRoom(chatRoomId);

    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 수락 (REQUESTED → ACCEPTED) ──────────────────────────────────────────
  async acceptChatRoom(
    member: Member,
    chatRoomId: number,
    dto: AcceptChatDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.artistId !== member.id) {
      throw new ForbiddenException('Only the artist can accept');
    }
    if (chatRoom.status !== ChatRoomStatus.REQUESTED) {
      throw new BadRequestException('Chat room is not in REQUESTED status');
    }

    chatRoom.status = ChatRoomStatus.ACCEPTED;
    chatRoom.price = dto.price;
    chatRoom.estimatedAt = new Date(dto.estimatedAt);
    chatRoom.feedbackCount = dto.feedbackCount;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'ACCEPTED',
      artistNickname: member.nickname,
    });
    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'PAYMENT_REQUEST',
      price: dto.price,
      estimatedAt: dto.estimatedAt,
      feedbackCount: dto.feedbackCount,
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 거절 (REQUESTED → CANCELLED) ─────────────────────────────────────────
  async rejectChatRoom(
    member: Member,
    chatRoomId: number,
    dto: RejectChatDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.artistId !== member.id) {
      throw new ForbiddenException('Only the artist can reject');
    }
    if (chatRoom.status !== ChatRoomStatus.REQUESTED) {
      throw new BadRequestException('Chat room is not in REQUESTED status');
    }

    chatRoom.status = ChatRoomStatus.CANCELLED;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'REJECTED',
      reasons: dto.reasons ?? [],
      reasonText: dto.reasonText ?? '',
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 요청자 취소 (REQUESTED / ACCEPTED → CANCELLED) ───────────────────────
  async cancelChatRoom(
    member: Member,
    chatRoomId: number,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.requesterId !== member.id) {
      throw new ForbiddenException('Only the requester can cancel');
    }
    if (
      chatRoom.status !== ChatRoomStatus.REQUESTED &&
      chatRoom.status !== ChatRoomStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Can only cancel in REQUESTED or ACCEPTED status',
      );
    }

    chatRoom.status = ChatRoomStatus.CANCELLED;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'CANCELLED_BY_REQUESTER',
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 견적/금액 수정 요청 (REQUESTED / ACCEPTED 상태 유지) ─────────────────
  async requestPriceChange(
    member: Member,
    chatRoomId: number,
    dto: RequestPriceChangeDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.artistId !== member.id) {
      throw new ForbiddenException('Only the artist can change the price');
    }
    if (
      chatRoom.status !== ChatRoomStatus.REQUESTED &&
      chatRoom.status !== ChatRoomStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Can only change price in REQUESTED or ACCEPTED status',
      );
    }

    chatRoom.price = dto.price;
    chatRoom.estimatedAt = new Date(dto.estimatedAt);
    chatRoom.feedbackCount = dto.feedbackCount;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'PRICE_CHANGE_REQUEST',
      price: dto.price,
      estimatedAt: dto.estimatedAt,
      feedbackCount: dto.feedbackCount,
      reason: dto.reason ?? '',
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 결제 (ACCEPTED → PAID) ────────────────────────────────────────────────
  async payChatRoom(
    member: Member,
    chatRoomId: number,
  ): Promise<PayChatResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const chatRoomRepository = queryRunner.manager.getRepository(ChatRoom);
      const walletRepository = queryRunner.manager.getRepository(Wallet);
      const walletTransactionRepository =
        queryRunner.manager.getRepository(WalletTransaction);
      const paymentHistoryRepository =
        queryRunner.manager.getRepository(PaymentHistory);
      const messageRepository = queryRunner.manager.getRepository(Message);

      const chatRoom = await chatRoomRepository.findOne({
        where: { id: chatRoomId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!chatRoom) {
        throw new NotFoundException('Chat room not found');
      }
      if (chatRoom.requesterId !== member.id) {
        throw new ForbiddenException('Only the requester can pay');
      }
      if (chatRoom.status !== ChatRoomStatus.ACCEPTED) {
        throw new BadRequestException('Chat room is not in ACCEPTED status');
      }
      if (!chatRoom.price) {
        throw new BadRequestException('Price is not set');
      }

      const requesterWallet = await walletRepository.findOne({
        where: { memberId: chatRoom.requesterId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!requesterWallet || requesterWallet.balance < chatRoom.price) {
        throw new BadRequestException('Insufficient coin balance');
      }

      let artistWallet = await walletRepository.findOne({
        where: { memberId: chatRoom.artistId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!artistWallet) {
        artistWallet = walletRepository.create({
          memberId: chatRoom.artistId,
          balance: 0,
        });
      }

      requesterWallet.balance -= chatRoom.price;
      artistWallet.balance += chatRoom.price;
      await walletRepository.save(requesterWallet);
      await walletRepository.save(artistWallet);

      chatRoom.status = ChatRoomStatus.PAID;
      chatRoom.paidAmount = chatRoom.price;
      await chatRoomRepository.save(chatRoom);

      await paymentHistoryRepository.save(
        paymentHistoryRepository.create({
          senderId: chatRoom.requesterId,
          receiverId: chatRoom.artistId,
          amount: chatRoom.price,
          method: null,
          status: PaymentStatus.COMPLETED,
          type: PaymentType.SEND,
          chatRoomId,
        }),
      );

      await walletTransactionRepository.save([
        walletTransactionRepository.create({
          memberId: chatRoom.requesterId,
          type: WalletTransactionType.USE,
          coinAmount: -chatRoom.price,
          cashAmount: null,
          status: WalletTransactionStatus.COMPLETED,
          description: `${chatRoom.price}코인 의뢰 결제`,
          sourceType: 'CHAT_PAYMENT',
          sourceId: chatRoom.id,
        }),
        walletTransactionRepository.create({
          memberId: chatRoom.artistId,
          type: WalletTransactionType.EARN,
          coinAmount: chatRoom.price,
          cashAmount: null,
          status: WalletTransactionStatus.COMPLETED,
          description: `${chatRoom.price}코인 작업 수익`,
          sourceType: 'CHAT_PAYMENT',
          sourceId: chatRoom.id,
        }),
      ]);

      const estimatedAtStr = chatRoom.estimatedAt
        ? new Date(chatRoom.estimatedAt).toISOString().slice(0, 10)
        : '';
      await messageRepository.save(
        messageRepository.create({
          chatRoomId,
          senderId: member.id,
          type: MessageType.SYSTEM,
          content: JSON.stringify({
            kind: 'PAYMENT_COMPLETED',
            paidAmount: chatRoom.paidAmount,
            estimatedAt: estimatedAtStr,
            requesterNickname: member.nickname,
          }),
        }),
      );
      await chatRoomRepository.update(chatRoomId, { updatedAt: new Date() });

      await queryRunner.commitTransaction();
      return { feedbackCount: chatRoom.feedbackCount };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 작업 시작 (PAID → IN_PROGRESS) ───────────────────────────────────────
  async startWork(
    member: Member,
    chatRoomId: number,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.artistId !== member.id) {
      throw new ForbiddenException('Only the artist can start work');
    }
    if (chatRoom.status !== ChatRoomStatus.PAID) {
      throw new BadRequestException('Chat room is not in PAID status');
    }

    chatRoom.status = ChatRoomStatus.IN_PROGRESS;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'WORK_STARTED',
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 그림 전송 (IN_PROGRESS → DRAFT_SENT) ─────────────────────────────────
  async sendDrawing(
    member: Member,
    chatRoomId: number,
    dto: SendDrawingDto,
  ): Promise<SendDrawingResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.artistId !== member.id) {
      throw new ForbiddenException('Only the artist can send drawing');
    }
    if (chatRoom.status !== ChatRoomStatus.IN_PROGRESS) {
      throw new BadRequestException('Chat room is not in IN_PROGRESS status');
    }

    for (const key of dto.imageObjectKeys) {
      this.assertImageObjectKey(key, chatRoomId);
    }

    chatRoom.status = ChatRoomStatus.DRAFT_SENT;
    await this.chatRoomRepository.save(chatRoom);

    const remainingRevisions = chatRoom.feedbackCount - chatRoom.feedbackUsed;
    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'DRAWING_SENT',
      imageObjectKeys: dto.imageObjectKeys,
      remainingRevisions,
    });
    await this.touchChatRoom(chatRoomId);

    return { remainingRevisions };
  }

  // ── 수정 요청 (DRAFT_SENT → IN_PROGRESS) ─────────────────────────────────
  async requestRevision(
    member: Member,
    chatRoomId: number,
    dto: RevisionRequestDto,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.requesterId !== member.id) {
      throw new ForbiddenException('Only the requester can request revision');
    }
    if (chatRoom.status !== ChatRoomStatus.DRAFT_SENT) {
      throw new BadRequestException('Chat room is not in DRAFT_SENT status');
    }
    if (chatRoom.feedbackUsed >= chatRoom.feedbackCount) {
      throw new BadRequestException('No remaining revisions');
    }

    chatRoom.feedbackUsed += 1;
    chatRoom.status = ChatRoomStatus.IN_PROGRESS;
    await this.chatRoomRepository.save(chatRoom);

    const remainingRevisions = chatRoom.feedbackCount - chatRoom.feedbackUsed;
    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'REVISION_REQUESTED',
      content: dto.content,
      remainingRevisions,
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
  }

  // ── 최종 확인 / 저장하기 (DRAFT_SENT → COMPLETED) ───────────────────────
  async confirmDrawing(
    member: Member,
    chatRoomId: number,
  ): Promise<ChatRoomDetailResponseDto> {
    const chatRoom = await this.loadChatRoomWithRelations(chatRoomId);
    if (chatRoom.requesterId !== member.id) {
      throw new ForbiddenException('Only the requester can confirm');
    }
    if (chatRoom.status !== ChatRoomStatus.DRAFT_SENT) {
      throw new BadRequestException('Chat room is not in DRAFT_SENT status');
    }

    chatRoom.status = ChatRoomStatus.COMPLETED;
    await this.chatRoomRepository.save(chatRoom);

    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'WORK_COMPLETED',
    });
    await this.createSystemMessage(chatRoomId, member.id, {
      kind: 'REVIEW_PROMPT',
      requesterNickname: member.nickname,
    });
    await this.touchChatRoom(chatRoomId);
    return this.mapChatRoomDetail(chatRoom);
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
      referenceImageObjectKeys: chatRoom.referenceImageObjectKeys ?? [],
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

  private async loadChatRoomWithRelations(
    chatRoomId: number,
  ): Promise<ChatRoom> {
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
    return chatRoom;
  }

  private async createSystemMessage(
    chatRoomId: number,
    senderId: number,
    content: object,
  ): Promise<void> {
    const message = this.messageRepository.create({
      chatRoomId,
      senderId,
      type: MessageType.SYSTEM,
      content: JSON.stringify(content),
    });
    await this.messageRepository.save(message);
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
      referenceImageObjectKeys: chatRoom.referenceImageObjectKeys ?? [],
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

  private buildRequestImageObjectKey(
    memberId: number,
    fileName: string,
    contentType: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = this.resolveImageExtension(fileName, contentType);
    return `chat/request/${memberId}/${year}/${month}/${randomUUID()}${ext}`;
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

  private assertRequestImageObjectKey(
    objectKey: string,
    memberId: number,
  ): void {
    const expectedPrefix = `chat/request/${memberId}/`;
    if (!objectKey.startsWith(expectedPrefix) || objectKey.includes('..')) {
      throw new BadRequestException('Invalid request image object key');
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
