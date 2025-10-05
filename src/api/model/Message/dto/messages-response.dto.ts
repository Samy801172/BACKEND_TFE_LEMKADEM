import { ApiProperty } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

export class PaginationMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pageCount: number;

  @ApiProperty({ required: false })
  unreadMarked?: number;
}

export class PaginatedMessagesDto {
  @ApiProperty({ type: [Message] })
  data: Message[];

  @ApiProperty()
  meta: PaginationMetaDto;
} 