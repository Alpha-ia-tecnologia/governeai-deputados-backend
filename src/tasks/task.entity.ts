import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum TaskStatus {
    PENDENTE = 'pendente',
    EM_ANDAMENTO = 'em_andamento',
    CONCLUIDA = 'concluida',
    ATRASADA = 'atrasada',
}

export enum TaskPriority {
    BAIXA = 'baixa',
    MEDIA = 'media',
    ALTA = 'alta',
    URGENTE = 'urgente',
}

@Entity('gabinete_tasks')
export class GabineteTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column()
    assigneeId: string;

    @Column()
    assigneeName: string;

    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.PENDENTE,
    })
    status: TaskStatus;

    @Column({
        type: 'enum',
        enum: TaskPriority,
        default: TaskPriority.MEDIA,
    })
    priority: TaskPriority;

    @Column({ type: 'date' })
    dueDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    // Multitenancy
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
