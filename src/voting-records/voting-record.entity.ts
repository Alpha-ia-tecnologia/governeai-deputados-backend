import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum VoteChoice {
    FAVORAVEL = 'favoravel',
    CONTRARIO = 'contrario',
    ABSTENCAO = 'abstencao',
    AUSENTE = 'ausente',
    OBSTRUCAO = 'obstrucao',
}

export enum VoteResult {
    APROVADO = 'aprovado',
    REJEITADO = 'rejeitado',
    ADIADO = 'adiado',
}

@Entity('voting_records')
export class VotingRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    billId: string;

    @Column({ nullable: true })
    billNumber: string;

    @Column()
    session: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'text' })
    subject: string;

    @Column({ type: 'enum', enum: VoteChoice })
    vote: VoteChoice;

    @Column({ type: 'enum', enum: VoteResult })
    result: VoteResult;

    @Column({ type: 'text', nullable: true })
    notes: string;

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
