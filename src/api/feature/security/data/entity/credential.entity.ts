import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ulid } from 'ulid';
import { Token } from './token.entity';

@Entity('credential')
export class Credential {
  @PrimaryColumn('varchar', { length:26, default: () => `'${ulid()}'` })
  credential_id: string;
  @Column({nullable: false, unique: true})
  username: string;
  @Column({nullable: true})
  password: string;
  @Column({nullable: false, unique: true})
  mail: string;
  @Column({nullable: true, unique: false})
  facebookHash: string;
  @Column({nullable: true, unique: false})
  googleHash: string;
  @Column({default:false})
  isAdmin:boolean;
  @Column({default: true})
  active: boolean;
  @CreateDateColumn()
  created: Date;
  @UpdateDateColumn()
  updated: Date;
  @Column({ nullable: true })
  resetToken: string;
  @Column({ nullable: true, type: 'timestamp' })
  resetTokenExpires: Date;

  @OneToMany(() => Token, token => token.credential)
  tokens: Token[];
}
