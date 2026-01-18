import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ChatRoomStatus } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ChatRoomListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '채팅방 상태 필터',
    enum: ChatRoomStatus,
  })
  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;

  @ApiPropertyOptional({
    description: '미읽음 채팅방만 조회',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  unreadOnly?: boolean;
}
