import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';
import { Post } from '../entities/post.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { AwsService } from '../common/aws/aws.service';
import {
  ChatRoomStatus,
  MemberProvider,
  MemberRole,
  MemberStatus,
  MessageType,
} from '../common/enums';
import { Member } from '../entities/member.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ChatRoomListQueryDto } from './dto/chat-room-list-query.dto';
import { ChatImageUploadRequestDto } from './dto/chat-image-upload-request.dto';
import { MessageListQueryDto } from './dto/message-list-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReadChatDto } from './dto/read-chat.dto';
import { ChatRoomDetailResponseDto } from './dto/chat-room-detail-response.dto';

describe('ChatService', () => {
  let service: ChatService;

  let chatRoomRepository: any;
  let messageRepository: any;
  let postRepository: any;
  let paymentHistoryRepository: any;
  let awsService: any;

  const requester: Member = {
    id: 1,
    email: 'requester@test.com',
    nickname: 'requester',
    provider: MemberProvider.EMAIL,
    status: MemberStatus.ACTIVE,
    role: MemberRole.ROLE_MEMBER,
  } as Member;

  const artist: Member = {
    id: 2,
    email: 'artist@test.com',
    nickname: 'artist',
    provider: MemberProvider.EMAIL,
    status: MemberStatus.ACTIVE,
    role: MemberRole.ROLE_MEMBER,
  } as Member;

  const post: Post = {
    id: 10,
    memberId: artist.id,
    title: 'Post title',
    thumbnailUrl: 'https://cdn.example.com/thumb.png',
  } as Post;

  const buildChatRoomDetail = (
    chatRoomId: number,
    status: ChatRoomStatus = ChatRoomStatus.REQUESTED,
  ): ChatRoomDetailResponseDto => {
    const now = new Date('2026-02-14T00:00:00.000Z');
    return {
      chatRoomId,
      status,
      post: {
        id: post.id,
        title: post.title ?? '',
        thumbnailUrl: post.thumbnailUrl ?? undefined,
      },
      requester: {
        id: requester.id,
        nickname: requester.nickname,
        profileImageUrl: undefined,
      },
      artist: {
        id: artist.id,
        nickname: artist.nickname,
        profileImageUrl: undefined,
      },
      createdAt: now,
      updatedAt: now,
      description: 'detail',
      price: 5000,
      paidAmount: 0,
    };
  };

  beforeEach(async () => {
    chatRoomRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    messageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    postRepository = {
      findOne: jest.fn(),
    };

    paymentHistoryRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    awsService = {
      createPresignedUploadUrl: jest.fn(),
      createPresignedGetUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatRoom),
          useValue: chatRoomRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: messageRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(PaymentHistory),
          useValue: paymentHistoryRepository,
        },
        {
          provide: AwsService,
          useValue: awsService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('서비스가 정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('createChatRoom', () => {
    it('게시글이 없으면 예외를 던져야 한다', async () => {
      postRepository.findOne.mockResolvedValue(null);
      const dto: CreateChatRoomDto = { postId: 999 };

      await expect(service.createChatRoom(requester, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('본인 게시글로 채팅 생성 시 잘못된 요청 예외를 던져야 한다', async () => {
      postRepository.findOne.mockResolvedValue({
        ...post,
        memberId: requester.id,
      });
      const dto: CreateChatRoomDto = { postId: post.id };

      await expect(service.createChatRoom(requester, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('동일 채팅방이 있으면 기존 채팅방을 반환해야 한다', async () => {
      const existingRoom = {
        id: 100,
        postId: post.id,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom;

      const detail = buildChatRoomDetail(existingRoom.id);
      const dto: CreateChatRoomDto = { postId: post.id };

      postRepository.findOne.mockResolvedValue(post);
      chatRoomRepository.findOne.mockResolvedValue(existingRoom);
      jest.spyOn(service, 'getChatRoomDetail').mockResolvedValue(detail);

      const result = await service.createChatRoom(requester, dto);

      expect(result).toEqual({
        isExisting: true,
        chatRoom: detail,
      });
      expect(chatRoomRepository.create).not.toHaveBeenCalled();
    });

    it('신규 채팅방을 만들고 요청 카드 시스템 메시지를 생성해야 한다', async () => {
      const createdRoom = {
        postId: post.id,
        requesterId: requester.id,
        artistId: artist.id,
        description: 'request',
        price: 10000,
        status: ChatRoomStatus.REQUESTED,
      } as ChatRoom;

      const savedRoom = {
        ...createdRoom,
        id: 101,
      } as ChatRoom;

      const detail = buildChatRoomDetail(savedRoom.id);
      const dto: CreateChatRoomDto = {
        postId: post.id,
        description: 'request',
        price: 10000,
      };

      postRepository.findOne.mockResolvedValue(post);
      chatRoomRepository.findOne.mockResolvedValue(null);
      chatRoomRepository.create.mockReturnValue(createdRoom);
      chatRoomRepository.save.mockResolvedValue(savedRoom);
      chatRoomRepository.update.mockResolvedValue(undefined);
      messageRepository.create.mockImplementation((payload: any) => payload);
      messageRepository.save.mockResolvedValue(undefined);
      jest.spyOn(service, 'getChatRoomDetail').mockResolvedValue(detail);

      const result = await service.createChatRoom(requester, dto);

      expect(chatRoomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: post.id,
          requesterId: requester.id,
          artistId: artist.id,
          status: ChatRoomStatus.REQUESTED,
        }),
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRoomId: savedRoom.id,
          senderId: requester.id,
          type: MessageType.SYSTEM,
        }),
      );
      expect(chatRoomRepository.update).toHaveBeenCalledWith(
        savedRoom.id,
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
      expect(result).toEqual({
        isExisting: false,
        chatRoom: detail,
      });
    });
  });

  describe('getChatRoomDetail', () => {
    it('참여자가 아니면 접근 금지 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: 10,
        artistId: 11,
      } as ChatRoom);

      await expect(service.getChatRoomDetail(requester, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('참여자면 채팅방 상세를 반환해야 한다', async () => {
      const now = new Date('2026-02-14T00:00:00.000Z');
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
        postId: post.id,
        status: ChatRoomStatus.REQUESTED,
        description: 'detail',
        price: 5000,
        paidAmount: 0,
        createdAt: now,
        updatedAt: now,
        post,
        requester,
        artist,
      } as ChatRoom);

      const result = await service.getChatRoomDetail(requester, 1);

      expect(result.chatRoomId).toBe(1);
      expect(result.status).toBe(ChatRoomStatus.REQUESTED);
      expect(result.requester.id).toBe(requester.id);
      expect(result.artist.id).toBe(artist.id);
    });
  });

  describe('deleteChatRoom', () => {
    it('삭제 가능한 상태가 아니면 잘못된 요청 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
        status: ChatRoomStatus.REQUESTED,
      } as ChatRoom);

      await expect(service.deleteChatRoom(requester, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('참여자면 메시지와 채팅방을 삭제해야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
        status: ChatRoomStatus.CANCELLED,
      } as ChatRoom);
      messageRepository.delete.mockResolvedValue(undefined);
      chatRoomRepository.delete.mockResolvedValue(undefined);

      await service.deleteChatRoom(requester, 1);

      expect(messageRepository.delete).toHaveBeenCalledWith({ chatRoomId: 1 });
      expect(chatRoomRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getChatRooms', () => {
    it('상태/미읽음 필터를 적용해 목록을 반환해야 한다', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      };

      const now = new Date('2026-02-14T00:00:00.000Z');
      const room = {
        id: 300,
        postId: post.id,
        requesterId: requester.id,
        artistId: artist.id,
        status: ChatRoomStatus.IN_PROGRESS,
        post,
        requester,
        artist,
        updatedAt: now,
      } as ChatRoom;

      qb.getManyAndCount.mockResolvedValue([[room], 1]);
      chatRoomRepository.createQueryBuilder.mockReturnValue(qb);
      messageRepository.findOne.mockResolvedValue({
        id: 999,
        type: MessageType.IMAGE,
        content: null,
        imageUrl: `chat/${room.id}/2026/02/sample.png`,
        sentAt: now,
      } as Message);
      messageRepository.count.mockResolvedValue(2);
      awsService.createPresignedGetUrl.mockResolvedValue(
        'https://signed.example.com/image.png',
      );

      const query: ChatRoomListQueryDto = {
        page: 1,
        limit: 10,
        status: ChatRoomStatus.IN_PROGRESS,
        unreadOnly: true,
      };

      const result = await service.getChatRooms(requester, {
        ...query,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('chatRoom.status = :status', {
        status: ChatRoomStatus.IN_PROGRESS,
      });
      expect(result.total).toBe(1);
      expect(result.data[0].lastMessage?.imageUrl).toBe(
        'https://signed.example.com/image.png',
      );
      expect(result.data[0].unreadCount).toBe(2);
    });
  });

  describe('createImageUpload', () => {
    it('허용되지 않은 콘텐츠 타입이면 잘못된 요청 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 200,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      const dto: ChatImageUploadRequestDto = {
        fileName: 'bad.gif',
        contentType: 'image/gif',
        size: 1000,
      };

      await expect(
        service.createImageUpload(requester, 200, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('정상 요청이면 업로드 URL과 object key를 반환해야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 200,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      awsService.createPresignedUploadUrl.mockResolvedValue(
        'https://upload.example.com',
      );
      const dto: ChatImageUploadRequestDto = {
        fileName: 'sample.png',
        contentType: 'image/png',
        size: 2048,
      };

      const result = await service.createImageUpload(requester, 200, dto);

      expect(awsService.createPresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^chat\/200\/\d{4}\/\d{2}\/.+\.png$/),
        'image/png',
        expect.any(Number),
      );
      expect(result.uploadUrl).toBe('https://upload.example.com');
      expect(result.objectKey.startsWith('chat/200/')).toBe(true);
      expect(new Date(result.expiresAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('getMessages', () => {
    it('이전/이후 기준 값을 함께 보내면 잘못된 요청 예외를 던져야 한다', async () => {
      const query: MessageListQueryDto = {
        beforeId: 10,
        afterId: 20,
      };

      await expect(service.getMessages(requester, 1, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이후 기준 값이 있으면 오름차순으로 메시지를 반환해야 한다', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      const sentAt = new Date('2026-02-14T00:00:00.000Z');
      const messages = [
        {
          id: 2,
          chatRoomId: 1,
          senderId: requester.id,
          type: MessageType.TEXT,
          content: 'hello',
          isRead: false,
          sentAt,
        },
        {
          id: 3,
          chatRoomId: 1,
          senderId: artist.id,
          type: MessageType.TEXT,
          content: 'world',
          isRead: false,
          sentAt,
        },
      ] as Message[];

      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      messageRepository.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue(messages);

      const query: MessageListQueryDto = { afterId: 1, limit: 10 };
      const result = await service.getMessages(requester, 1, query);

      expect(qb.orderBy).toHaveBeenCalledWith('message.id', 'ASC');
      expect(result.data.map((m) => m.id)).toEqual([2, 3]);
    });
  });

  describe('sendMessage', () => {
    it('시스템 메시지 타입이면 잘못된 요청 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      const dto: SendMessageDto = { type: MessageType.SYSTEM };

      await expect(service.sendMessage(requester, 1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('텍스트 메시지 내용이 비어있으면 잘못된 요청 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      const dto: SendMessageDto = {
        type: MessageType.TEXT,
        content: '   ',
      };

      await expect(service.sendMessage(requester, 1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이미지 오브젝트 키가 유효하지 않으면 잘못된 요청 예외를 던져야 한다', async () => {
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      const dto: SendMessageDto = {
        type: MessageType.IMAGE,
        objectKey: 'chat/2/other.png',
        mimeType: 'image/png',
        size: 1024,
      };

      await expect(service.sendMessage(requester, 1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('정상 텍스트 메시지를 전송하면 메시지 DTO를 반환해야 한다', async () => {
      const sentAt = new Date('2026-02-14T00:00:00.000Z');
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      chatRoomRepository.update.mockResolvedValue(undefined);
      messageRepository.create.mockImplementation((payload: any) => payload);
      messageRepository.save.mockResolvedValue({
        id: 11,
        chatRoomId: 1,
        senderId: requester.id,
        type: MessageType.TEXT,
        content: 'hello',
        imageUrl: null,
        isRead: false,
        sentAt,
      } as Message);
      const dto: SendMessageDto = {
        type: MessageType.TEXT,
        content: 'hello',
      };

      const result = await service.sendMessage(requester, 1, dto);

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRoomId: 1,
          senderId: requester.id,
          type: MessageType.TEXT,
          content: 'hello',
        }),
      );
      expect(result.content).toBe('hello');
      expect(result.type).toBe(MessageType.TEXT);
    });

    it('상대 경로 이미지 키면 사전 서명 URL을 반환해야 한다', async () => {
      const sentAt = new Date('2026-02-14T00:00:00.000Z');
      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      chatRoomRepository.update.mockResolvedValue(undefined);
      messageRepository.create.mockImplementation((payload: any) => payload);
      messageRepository.save.mockResolvedValue({
        id: 12,
        chatRoomId: 1,
        senderId: requester.id,
        type: MessageType.IMAGE,
        content: null,
        imageUrl: 'chat/1/2026/02/sample.png',
        isRead: false,
        sentAt,
      } as Message);
      awsService.createPresignedGetUrl.mockResolvedValue(
        'https://signed.example.com/message.png',
      );
      const dto: SendMessageDto = {
        type: MessageType.IMAGE,
        objectKey: 'chat/1/2026/02/sample.png',
        mimeType: 'image/png',
        size: 1000,
      };

      const result = await service.sendMessage(requester, 1, dto);

      expect(awsService.createPresignedGetUrl).toHaveBeenCalled();
      expect(result.imageUrl).toBe('https://signed.example.com/message.png');
    });
  });

  describe('markAsRead', () => {
    it('마지막 읽은 메시지 ID 기준으로 읽음 처리하고 영향을 받은 개수를 반환해야 한다', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      };

      chatRoomRepository.findOne.mockResolvedValue({
        id: 1,
        requesterId: requester.id,
        artistId: artist.id,
      } as ChatRoom);
      messageRepository.createQueryBuilder.mockReturnValue(qb);
      qb.execute.mockResolvedValue({ affected: 3 });
      const dto: ReadChatDto = { lastReadMessageId: 100 };

      const result = await service.markAsRead(requester, 1, dto);

      expect(qb.andWhere).toHaveBeenCalledWith('id <= :lastReadMessageId', {
        lastReadMessageId: 100,
      });
      expect(result).toEqual({ updatedCount: 3 });
    });
  });
});
