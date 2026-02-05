import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum ProjectStatus {
  EM_ELABORACAO = 'em_elaboracao',
  PROTOCOLADO = 'protocolado',
  EM_TRAMITACAO = 'em_tramitacao',
  APROVADO = 'aprovado',
  REJEITADO = 'rejeitado',
  ARQUIVADO = 'arquivado',
}

@Entity('law_projects')
export class LawProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  number: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text', nullable: true })
  fullText: string;

  @Column({ type: 'date' })
  protocolDate: Date;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.EM_ELABORACAO,
  })
  status: ProjectStatus;

  @Column({ type: 'jsonb', default: [] })
  timeline: Array<{
    id: string;
    date: string;
    description: string;
    type: 'protocolo' | 'tramitacao' | 'votacao' | 'aprovacao' | 'rejeicao';
  }>;

  @Column({ type: 'jsonb', nullable: true })
  votes: {
    favor: number;
    contra: number;
    abstencoes: number;
  };

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ default: 0 })
  views: number;

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
