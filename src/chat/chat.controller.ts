import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
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
  @ApiOperation({ summary: '채팅방 생성' })
  @ApiResponse({
    status: 201,
    description: '채팅방 생성 성공',
    type: ChatRoomCreateResponseDto,
  })
  async createChatRoom(
    @GetUser() member: Member,
    @Body() dto: CreateChatRoomDto,
  ): Promise<ChatRoomCreateResponseDto> {
    return this.chatService.createChatRoom(member, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 채팅방 목록' })
  @ApiResponse({
    status: 200,
    description: '채팅방 목록 조회 성공',
    type: ChatRoomListResponseDto,
  })
  async getChatRooms(
    @GetUser() member: Member,
    @Query() query: ChatRoomListQueryDto,
  ): Promise<ChatRoomListResponseDto> {
    return this.chatService.getChatRooms(member, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '채팅방 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '채팅방 상세 조회 성공',
    type: ChatRoomDetailResponseDto,
  })
  async getChatRoomDetail(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<ChatRoomDetailResponseDto> {
    return this.chatService.getChatRoomDetail(member, +id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '채팅방 상태 변경' })
  @ApiResponse({
    status: 200,
    description: '채팅방 상태 변경 성공',
    type: ChatRoomDetailResponseDto,
  })
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
  @ApiOperation({ summary: '채팅 메시지 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '메시지 목록 조회 성공',
    type: MessageListResponseDto,
  })
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
  @ApiOperation({ summary: '텍스트 메시지 전송' })
  @ApiResponse({
    status: 201,
    description: '메시지 전송 성공',
    type: MessageResponseDto,
  })
  async sendMessage(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.chatService.sendMessage(member, +id, dto);
  }

  @Post(':id/messages/image')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '이미지 메시지 전송' })
  @ApiResponse({
    status: 201,
    description: '이미지 메시지 전송 성공',
    type: MessageResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async sendImageMessage(
    @GetUser() member: Member,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MessageResponseDto> {
    return this.chatService.sendImageMessage(member, +id, file);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '메시지 읽음 처리' })
  @ApiResponse({
    status: 200,
    description: '읽음 처리 성공',
    schema: {
      example: { updatedCount: 3 },
    },
  })
  async markAsRead(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: ReadChatDto,
  ): Promise<{ updatedCount: number }> {
    return this.chatService.markAsRead(member, +id, dto);
  }
}
