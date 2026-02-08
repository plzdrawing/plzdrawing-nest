import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UpdateChatRoomStatusDto } from './dto/update-chat-room-status.dto';
import { ChatRoomListQueryDto } from './dto/chat-room-list-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatImageUploadRequestDto } from './dto/chat-image-upload-request.dto';
import { ChatImageUploadResponseDto } from './dto/chat-image-upload-response.dto';
import { MessageListQueryDto } from './dto/message-list-query.dto';
import { ReadChatDto } from './dto/read-chat.dto';
import { ChatRoomCreateResponseDto } from './dto/chat-room-create-response.dto';
import { ChatRoomListResponseDto } from './dto/chat-room-list-response.dto';
import { ChatRoomDetailResponseDto } from './dto/chat-room-detail-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageListResponseDto } from './dto/message-list-response.dto';

@ApiTags('Chat')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '채팅방 생성',
    description:
      '게시글 기반으로 채팅방을 생성합니다. 동일한 조합(게시글/요청자/작가)이 이미 존재하면 기존 채팅방을 반환합니다.',
  })
  @ApiBody({
    type: CreateChatRoomDto,
    examples: {
      default: {
        summary: '채팅방 생성 요청',
        value: {
          postId: 1,
          description: '강아지 그림 요청드립니다.',
          price: 5000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '채팅방 생성 성공',
    type: ChatRoomCreateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (본인 게시글로 채팅 생성 시도 등)',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async createChatRoom(
    @GetUser() member: Member,
    @Body() dto: CreateChatRoomDto,
  ): Promise<ChatRoomCreateResponseDto> {
    return this.chatService.createChatRoom(member, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '내 채팅방 목록',
    description:
      '참여 중인 채팅방 목록을 최신 업데이트 순으로 조회합니다. status/unreadOnly/page/limit 파라미터를 지원합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '채팅방 목록 조회 성공',
    type: ChatRoomListResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getChatRooms(
    @GetUser() member: Member,
    @Query() query: ChatRoomListQueryDto,
  ): Promise<ChatRoomListResponseDto> {
    return this.chatService.getChatRooms(member, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '채팅방 상세 조회',
    description: '채팅방 상세 정보(게시글/참여자/금액/상태)를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '채팅방 상세 조회 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async getChatRoomDetail(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.getChatRoomDetail(member, +id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '채팅방 상태 변경',
    description:
      '채팅방 상태를 변경하고 시스템 메시지(STATUS_CHANGED)를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({
    type: UpdateChatRoomStatusDto,
    examples: {
      default: {
        summary: '상태 변경 요청',
        value: { status: 'IN_PROGRESS' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '채팅방 상태 변경 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async updateChatRoomStatus(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateChatRoomStatusDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.updateChatRoomStatus(member, +id, dto);
  }

  @Get(':id/messages')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '채팅 메시지 목록 조회',
    description:
      '채팅 메시지를 조회합니다. beforeId/afterId는 동시에 사용할 수 없습니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '메시지 목록 조회 성공',
    type: MessageListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (beforeId와 afterId 동시 사용 등)',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async getMessages(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Query() query: MessageListQueryDto,
  ): Promise<MessageListResponseDto> {
    return this.chatService.getMessages(member, +id, query);
  }

  @Post(':id/messages')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '메시지 전송',
    description:
      '텍스트 또는 이미지 메시지를 전송하고 채팅방 updatedAt을 갱신합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({
    type: SendMessageDto,
    examples: {
      text: {
        summary: '텍스트 메시지 전송',
        value: { type: 'TEXT', content: '안녕하세요 :)' },
      },
      image: {
        summary: '이미지 메시지 전송',
        value: {
          type: 'IMAGE',
          objectKey: 'chat/12/2026/02/uuid.png',
          size: 5242880,
          mimeType: 'image/png',
          width: 1200,
          height: 900,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '메시지 전송 성공',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async sendMessage(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.chatService.sendMessage(member, +id, dto);
  }

  @Post(':id/messages/image-upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '이미지 메시지 전송',
    description:
      '이미지 파일(필수)을 업로드하여 IMAGE 타입 메시지를 전송합니다. 파일 최대 크기는 10MB입니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({
    type: ChatImageUploadRequestDto,
    examples: {
      default: {
        summary: '업로드 준비 요청',
        value: {
          fileName: 'dog.png',
          contentType: 'image/png',
          size: 5242880,
          width: 1200,
          height: 900,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '업로드 URL 발급 성공',
    type: ChatImageUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: '이미지 파일 누락' })
  @ApiResponse({ status: 413, description: '파일 크기 초과 (최대 10MB)' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          description: '전송할 이미지 파일(필수), 최대 10MB',
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async sendImageMessage(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: ChatImageUploadRequestDto,
  ): Promise<ChatImageUploadResponseDto> {
    return this.chatService.createImageUpload(member, +id, dto);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '메시지 읽음 처리',
    description:
      '상대방이 보낸 미읽음 메시지를 읽음 처리합니다. lastReadMessageId를 지정하면 해당 ID 이하만 처리합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({
    type: ReadChatDto,
    examples: {
      default: {
        summary: '읽음 처리',
        value: { lastReadMessageId: 10 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '읽음 처리 성공',
    schema: {
      example: { updatedCount: 3 },
    },
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '채팅방 접근 권한 없음' })
  @ApiResponse({ status: 404, description: '채팅방을 찾을 수 없음' })
  async markAsRead(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: ReadChatDto,
  ): Promise<{ updatedCount: number }> {
    return this.chatService.markAsRead(member, +id, dto);
  }
}
