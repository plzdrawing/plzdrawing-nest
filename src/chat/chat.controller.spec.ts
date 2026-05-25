import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRoomStatus, MessageType } from '../common/enums';
import { Member } from '../entities/member.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ChatRoomListQueryDto } from './dto/chat-room-list-query.dto';
import { MessageListQueryDto } from './dto/message-list-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatImageUploadRequestDto } from './dto/chat-image-upload-request.dto';
import { ReadChatDto } from './dto/read-chat.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: {
    createChatRoom: jest.Mock;
    getChatRooms: jest.Mock;
    getChatRoomDetail: jest.Mock;
    deleteChatRoom: jest.Mock;
    getMessages: jest.Mock;
    sendMessage: jest.Mock;
    createImageUpload: jest.Mock;
    createRequestImageUpload: jest.Mock;
    markAsRead: jest.Mock;
  };

  beforeEach(async () => {
    chatService = {
      createChatRoom: jest.fn(),
      getChatRooms: jest.fn(),
      getChatRoomDetail: jest.fn(),
      deleteChatRoom: jest.fn(),
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      createImageUpload: jest.fn(),
      createRequestImageUpload: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('채팅방 생성 요청을 서비스로 위임해야 한다', async () => {
    const member = { id: 1 } as Member;
    const dto: CreateChatRoomDto = {
      postId: 10,
      description: 'request',
      price: 1000,
    };
    const expected = { isExisting: false, chatRoom: { chatRoomId: 1 } };
    chatService.createChatRoom.mockResolvedValue(expected);

    const result = await controller.createChatRoom(member, dto);

    expect(chatService.createChatRoom).toHaveBeenCalledWith(member, dto);
    expect(result).toEqual(expected);
  });

  it('채팅방 목록 조회 요청을 서비스로 위임해야 한다', async () => {
    const member = { id: 1 } as Member;
    const query: ChatRoomListQueryDto = {
      page: 1,
      limit: 10,
      status: ChatRoomStatus.REQUESTED,
    };
    const expected = { data: [], total: 0, page: 1, limit: 10 };
    chatService.getChatRooms.mockResolvedValue(expected);

    const result = await controller.getChatRooms(member, query);

    expect(chatService.getChatRooms).toHaveBeenCalledWith(member, query);
    expect(result).toEqual(expected);
  });

  it('채팅방 상세 조회 시 식별자를 숫자로 변환해야 한다', async () => {
    const member = { id: 1 } as Member;
    const expected = { chatRoomId: 30 };
    chatService.getChatRoomDetail.mockResolvedValue(expected);

    const result = await controller.getChatRoomDetail(member, '30');

    expect(chatService.getChatRoomDetail).toHaveBeenCalledWith(member, 30);
    expect(result).toEqual(expected);
  });

  it('채팅방 삭제 시 식별자를 변환해 서비스로 전달해야 한다', async () => {
    const member = { id: 1 } as Member;
    chatService.deleteChatRoom.mockResolvedValue(undefined);

    await controller.deleteChatRoom(member, '30');

    expect(chatService.deleteChatRoom).toHaveBeenCalledWith(member, 30);
  });

  it('메시지 목록 조회 시 식별자를 변환해 서비스로 전달해야 한다', async () => {
    const member = { id: 1 } as Member;
    const query: MessageListQueryDto = { afterId: 10, limit: 20 };
    const expected = { data: [{ id: 11 }] };
    chatService.getMessages.mockResolvedValue(expected);

    const result = await controller.getMessages(member, '5', query);

    expect(chatService.getMessages).toHaveBeenCalledWith(member, 5, query);
    expect(result).toEqual(expected);
  });

  it('메시지 전송 시 식별자를 변환해 서비스로 전달해야 한다', async () => {
    const member = { id: 1 } as Member;
    const dto: SendMessageDto = { type: MessageType.TEXT, content: 'hello' };
    const expected = { id: 100, content: 'hello' };
    chatService.sendMessage.mockResolvedValue(expected);

    const result = await controller.sendMessage(member, '9', dto);

    expect(chatService.sendMessage).toHaveBeenCalledWith(member, 9, dto);
    expect(result).toEqual(expected);
  });

  it('이미지 업로드 URL 발급 요청을 서비스로 위임해야 한다', async () => {
    const member = { id: 1 } as Member;
    const dto: ChatImageUploadRequestDto = {
      fileName: 'image.png',
      contentType: 'image/png',
      size: 1024,
    };
    const expected = {
      uploadUrl: 'https://upload.example.com',
      objectKey: 'chat/9/2026/02/sample.png',
      expiresAt: new Date().toISOString(),
    };
    chatService.createImageUpload.mockResolvedValue(expected);

    const result = await controller.sendImageMessage(member, '9', dto);

    expect(chatService.createImageUpload).toHaveBeenCalledWith(member, 9, dto);
    expect(result).toEqual(expected);
  });

  it('요청 참고 이미지 업로드 URL 발급 요청을 서비스로 위임해야 한다', async () => {
    const member = { id: 1 } as Member;
    const dto: ChatImageUploadRequestDto = {
      fileName: 'reference.png',
      contentType: 'image/png',
      size: 1024,
    };
    const expected = {
      uploadUrl: 'https://upload.example.com',
      objectKey: 'chat/request/1/2026/02/sample.png',
      expiresAt: new Date().toISOString(),
    };
    chatService.createRequestImageUpload.mockResolvedValue(expected);

    const result = await controller.createRequestImageUpload(member, dto);

    expect(chatService.createRequestImageUpload).toHaveBeenCalledWith(
      member,
      dto,
    );
    expect(result).toEqual(expected);
  });

  it('읽음 처리 요청 시 식별자를 변환해 서비스로 전달해야 한다', async () => {
    const member = { id: 1 } as Member;
    const dto: ReadChatDto = { lastReadMessageId: 77 };
    const expected = { updatedCount: 4 };
    chatService.markAsRead.mockResolvedValue(expected);

    const result = await controller.markAsRead(member, '12', dto);

    expect(chatService.markAsRead).toHaveBeenCalledWith(member, 12, dto);
    expect(result).toEqual(expected);
  });
});
