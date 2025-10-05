import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { Event } from '../../Event/entities/event.entity';

export enum DocumentType {
  PRESENTATION = 'PRESENTATION',
  SUPPORT = 'SUPPORT',
  CERTIFICATE = 'CERTIFICATE',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE'
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  file_url: string;

  @Column({
    type: 'enum',
    enum: DocumentType
  })
  type: DocumentType;

  @ManyToOne(() => Event, { nullable: true })
  event: Event;

  @ManyToOne(() => User)
  uploader: User;

  @Column({ default: false })
  is_public: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
} 