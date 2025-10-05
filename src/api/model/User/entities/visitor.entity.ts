import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ip_address: string;

  @Column()
  derniere_visite: Date;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;
} 