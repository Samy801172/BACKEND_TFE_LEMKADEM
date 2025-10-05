import { Entity, PrimaryColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Credential } from './credential.entity';
import { ulid } from 'ulid';

@Entity('token')
export class Token {
  @PrimaryColumn('varchar', { length: 26, default: () => `'${ulid()}'` })
  token_id: string;

  @Column()
  token: string;

  @Column()
  refreshToken: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Credential)
  @JoinColumn({ name: 'credential_id' })
  credential: Credential;
}
