import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum AuditAction {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LOGIN = 'login',
    EXPORT = 'export',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: AuditAction })
    @Index()
    action: AuditAction;

    @Column()
    @Index()
    entity: string;

    @Column({ nullable: true })
    entityId: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    userId: string;

    @Column({ nullable: true })
    userName: string;

    @Column({ type: 'jsonb', nullable: true })
    details: Record<string, any>;

    @Column({ nullable: true })
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @CreateDateColumn()
    timestamp: Date;
}
