import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { Event } from '../../Event/entities/event.entity';
import { Min, Max } from 'class-validator';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column()
  @Min(1)
  @Max(5)
  rating: number;

  @ManyToOne(() => User)
  author: User;

  @ManyToOne(() => Event)
  event: Event;

  @CreateDateColumn()
  createdAt: Date;
} 