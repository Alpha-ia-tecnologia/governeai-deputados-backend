import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum BillType {
    PL = 'PL',
    PEC = 'PEC',
    PLP = 'PLP',
    PDL = 'PDL',
    MPV = 'MPV',
    REQ = 'REQ',
    INC = 'INC',
}

export enum BillStatus {
    EM_TRAMITACAO = 'em_tramitacao',
    APROVADO = 'aprovado',
    REJEITADO = 'rejeitado',
    ARQUIVADO = 'arquivado',
    RETIRADO = 'retirado',
}

export enum BillAuthorship {
    PROPRIO = 'proprio',
    COAUTORIA = 'coautoria',
    ACOMPANHAMENTO = 'acompanhamento',
}

@Entity('legislative_bills')
export class LegislativeBill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    number: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    summary: string;

    @Column({ type: 'enum', enum: BillType })
    type: BillType;

    @Column({ type: 'enum', enum: BillStatus, default: BillStatus.EM_TRAMITACAO })
    status: BillStatus;

    @Column({ type: 'enum', enum: BillAuthorship, default: BillAuthorship.ACOMPANHAMENTO })
    authorship: BillAuthorship;

    @Column()
    area: string;

    @Column({ type: 'date' })
    presentedDate: Date;

    @Column({ type: 'date', nullable: true })
    lastUpdate: Date;

    @Column({ nullable: true })
    committee: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', default: [] })
    documents: string[];

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
