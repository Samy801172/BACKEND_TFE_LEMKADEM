import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nom: string;

  @ApiProperty()
  prenom: string;

  @ApiProperty()
  email: string;
}

export class LastMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  isOutgoing: boolean;
}

export class ConversationDto {
  @ApiProperty()
  contact: ContactDto;

  @ApiProperty()
  lastMessage: LastMessageDto;

  @ApiProperty()
  unreadCount: number;
}

export class ConversationsResponseDto {
  @ApiProperty({ type: [ConversationDto] })
  data: ConversationDto[];
} 