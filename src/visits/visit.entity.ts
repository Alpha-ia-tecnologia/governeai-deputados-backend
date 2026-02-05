import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  voterId: string;

  @ManyToOne(() => Voter, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voterId' })
  voter: Voter;

  @Column({ nullable: true })
  leaderId: string;

  @ManyToOne(() => Leader, { eager: true, nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: Leader;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'text' })
  objective: string;

  @Column({ type: 'text', nullable: true })
  result: string;

  @Column({ type: 'text', nullable: true })
  nextSteps: string;

  @Column({ type: 'simple-array', nullable: true })
  photos: string[];

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Multitenancy: referência ao vereador dono deste registro
  // Nullable para permitir migração de dados existentes
  @Column({ nullable: true })
  @Index()
  vereadorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'vereadorId' })
  vereador: User;

  @CreateDateColumn()
  createdAt: Date;
}
