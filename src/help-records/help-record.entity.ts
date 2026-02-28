import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

export enum HelpStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum HelpCategory {
  SAUDE = 'saude',
  EDUCACAO = 'educacao',
  ASSISTENCIA_SOCIAL = 'assistencia_social',
  INFRAESTRUTURA = 'infraestrutura',
  EMPREGO = 'emprego',
  DOCUMENTACAO = 'documentacao',
  OUTROS = 'outros',
}

@Entity('help_records')
export class HelpRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  voterId: string;

  @ManyToOne(() => Voter, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voterId' })
  voter: Voter;

  @Column({ nullable: true })
  leaderId: string;

  @ManyToOne(() => Leader, { eager: true })
  @JoinColumn({ name: 'leaderId' })
  leader: Leader;

  @Column({
    type: 'enum',
    enum: HelpCategory,
    default: HelpCategory.OUTROS,
    nullable: true,
  })
  category: HelpCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: HelpStatus,
    default: HelpStatus.PENDING,
  })
  status: HelpStatus;

  @Column({ nullable: true })
  responsibleId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'responsibleId' })
  responsible: User;

  @Column({ type: 'simple-array', nullable: true })
  documents: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  completedAt: Date;

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

  @UpdateDateColumn()
  updatedAt: Date;
}
