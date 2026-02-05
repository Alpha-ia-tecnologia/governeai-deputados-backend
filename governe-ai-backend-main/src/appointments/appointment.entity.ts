import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  IN_PROGRESS = 'in_progress',
}

export enum AppointmentType {
  COMPROMISSO = 'compromisso',
  ACAO = 'acao',
  REUNIAO = 'reuniao',
  VISITA = 'visita',
  LIGACAO = 'ligacao',
  OUTRO = 'outro',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AppointmentType,
  })
  type: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  time: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  voterId: string;

  @ManyToOne(() => Voter, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voterId' })
  voter: Voter;

  @Column({ nullable: true })
  leaderId: string;

  @ManyToOne(() => Leader, { eager: true, nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: Leader;

  @Column()
  responsibleId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'responsibleId' })
  responsible: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: [] })
  reminders: Array<{
    id: string;
    minutes: number;
    notified?: boolean;
    notifiedAt?: string;
  }>;

  @Column({ default: false })
  completed: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  completedNotes: string;

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
