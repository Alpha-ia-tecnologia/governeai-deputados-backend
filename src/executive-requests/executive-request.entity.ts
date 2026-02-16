import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum RequestStatus {
    ENVIADO = 'enviado',
    EM_ANALISE = 'em_analise',
    RESPONDIDO = 'respondido',
    ATENDIDO = 'atendido',
    NEGADO = 'negado',
}

export enum RequestType {
    OFICIO = 'oficio',
    INDICACAO = 'indicacao',
    REQUERIMENTO = 'requerimento',
}

@Entity('executive_requests')
export class ExecutiveRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    protocolNumber: string;

    @Column({ type: 'date' })
    date: string;

    @Column({
        type: 'enum',
        enum: RequestType,
        default: RequestType.OFICIO,
    })
    type: RequestType;

    @Column()
    subject: string;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: RequestStatus,
        default: RequestStatus.ENVIADO,
    })
    status: RequestStatus;

    @Column({ type: 'text', nullable: true })
    response: string;

    @Column({ type: 'date', nullable: true })
    responseDate: string;

    @Column({ type: 'date', nullable: true })
    deadline: string;

    @Column({ type: 'simple-array', nullable: true })
    documents: string[];

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
