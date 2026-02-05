import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum AmendmentStatus {
  APROVADA = 'aprovada',
  EM_EXECUCAO = 'em_execucao',
  EXECUTADA = 'executada',
  CANCELADA = 'cancelada',
}

@Entity('amendments')
export class Amendment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @Column()
  destination: string;

  @Column({ type: 'text' })
  objective: string;

  @Column({
    type: 'enum',
    enum: AmendmentStatus,
    default: AmendmentStatus.APROVADA,
  })
  status: AmendmentStatus;

  @Column({ type: 'int', default: 0 })
  executionPercentage: number;

  @Column({ type: 'simple-array', nullable: true })
  documents: string[];

  @Column({ type: 'simple-array', nullable: true })
  photos: string[];

  // Multitenancy: referência ao vereador dono deste registro
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
