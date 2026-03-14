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
import { AcceptChatDto } from './dto/accept-chat.dto';
import { RejectChatDto } from './dto/reject-chat.dto';
import { RequestPriceChangeDto } from './dto/request-price-change.dto';
import { PayChatDto } from './dto/pay-chat.dto';
import { PayChatResponseDto } from './dto/pay-chat-response.dto';
import { SendDrawingDto } from './dto/send-drawing.dto';
import { SendDrawingResponseDto } from './dto/send-drawing-response.dto';
import { RevisionRequestDto } from './dto/revision-request.dto';
import { UpdateChatRequestDto } from './dto/update-chat-request.dto';

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
    summary: '이미지 업로드 URL 발급',
    description:
      'S3 presigned 업로드 URL만 발급합니다. 실제 파일 업로드(PUT)는 FE가 uploadUrl로 직접 수행해야 하며, 업로드 완료 후 POST /chats/:id/messages에 type=IMAGE와 objectKey를 전달해 메시지를 전송합니다. 파일 최대 크기는 10MB입니다.',
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

  @Patch(':id/request')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '요청 내용 수정 (요청자)',
    description:
      'REQUESTED 상태에서만 요청자가 요청 내용(description)을 수정합니다. 수정 시 새 REQUEST_CARD 시스템 메시지가 생성됩니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: UpdateChatRequestDto })
  @ApiResponse({
    status: 200,
    description: '요청 내용 수정 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'REQUESTED 상태가 아님' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async updateChatRequest(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateChatRequestDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.updateChatRequest(member, +id, dto);
  }

  @Patch(':id/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '요청 수락 (그림쟁이)',
    description:
      'REQUESTED 상태의 채팅방을 ACCEPTED로 전환하고 PAYMENT_REQUEST 카드를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: AcceptChatDto })
  @ApiResponse({
    status: 200,
    description: '수락 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (그림쟁이만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async acceptChatRoom(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: AcceptChatDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.acceptChatRoom(member, +id, dto);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '요청 거절 (그림쟁이)',
    description: 'REQUESTED 상태의 채팅방을 CANCELLED로 전환합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: RejectChatDto })
  @ApiResponse({
    status: 200,
    description: '거절 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (그림쟁이만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async rejectChatRoom(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: RejectChatDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.rejectChatRoom(member, +id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '요청 취소 (요청자)',
    description:
      'REQUESTED 또는 ACCEPTED 상태의 채팅방을 CANCELLED로 전환합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '취소 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async cancelChatRoom(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.cancelChatRoom(member, +id);
  }

  @Patch(':id/request-price-change')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '견적 수정 요청 (그림쟁이)',
    description:
      'REQUESTED / ACCEPTED 상태에서 금액, 예상 완료일, 수정 횟수를 변경하고 PRICE_CHANGE_REQUEST 카드를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: RequestPriceChangeDto })
  @ApiResponse({
    status: 200,
    description: '견적 수정 요청 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (그림쟁이만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async requestPriceChange(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: RequestPriceChangeDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.requestPriceChange(member, +id, dto);
  }

  @Patch(':id/pay')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '결제 (요청자)',
    description:
      'ACCEPTED 상태에서 결제를 진행하고 PAID 상태로 전환합니다. PaymentHistory가 생성됩니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: PayChatDto })
  @ApiResponse({
    status: 200,
    description: '결제 성공 — feedbackCount 반환',
    type: PayChatResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태 또는 금액 미설정' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async payChatRoom(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: PayChatDto,
  ): Promise<PayChatResponseDto> {
    return this.chatService.payChatRoom(member, +id, dto);
  }

  @Patch(':id/start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '작업 시작 (그림쟁이)',
    description:
      'PAID 상태에서 IN_PROGRESS로 전환하고 WORK_STARTED 시스템 메시지를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '작업 시작 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (그림쟁이만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async startWork(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.startWork(member, +id);
  }

  @Post(':id/send-drawing')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '그림 전송 (그림쟁이)',
    description:
      'IN_PROGRESS 상태에서 DRAFT_SENT로 전환하고 DRAWING_SENT 시스템 메시지를 생성합니다. 이미지 최대 3개.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: SendDrawingDto })
  @ApiResponse({
    status: 201,
    description: '그림 전송 성공 — remainingRevisions 반환',
    type: SendDrawingResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태 또는 objectKey' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (그림쟁이만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async sendDrawing(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: SendDrawingDto,
  ): Promise<SendDrawingResponseDto> {
    return this.chatService.sendDrawing(member, +id, dto);
  }

  @Post(':id/revision')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '수정 요청 (요청자)',
    description:
      'DRAFT_SENT 상태에서 IN_PROGRESS로 복귀하고 REVISION_REQUESTED 시스템 메시지를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiBody({ type: RevisionRequestDto })
  @ApiResponse({
    status: 201,
    description: '수정 요청 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 상태 또는 남은 수정 횟수 없음',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async requestRevision(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: RevisionRequestDto,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.requestRevision(member, +id, dto);
  }

  @Patch(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '최종 확인 / 저장하기 (요청자)',
    description:
      'DRAFT_SENT 상태에서 COMPLETED로 전환하고 WORK_COMPLETED + REVIEW_PROMPT 시스템 메시지를 생성합니다.',
  })
  @ApiParam({ name: 'id', description: '채팅방 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '최종 확인 성공',
    type: ChatRoomDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 상태' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 403, description: '권한 없음 (요청자만 가능)' })
  @ApiResponse({ status: 404, description: '채팅방 없음' })
  async confirmDrawing(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.confirmDrawing(member, +id);
  }
}
