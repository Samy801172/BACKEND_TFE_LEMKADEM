import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  image_url: string;

  @Column()
  criteria: string;

  @ManyToMany(() => User)
  @JoinTable()
  users: User[];

  @Column({ default: false })
  is_certification: boolean;

  @Column({ nullable: true })
  validity_period: number; // en jours

  @CreateDateColumn()
  createdAt: Date;
} 