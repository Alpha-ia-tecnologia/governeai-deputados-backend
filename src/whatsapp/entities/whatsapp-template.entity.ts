import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

export enum TemplateCategory {
    UTILITY = 'UTILITY',
    MARKETING = 'MARKETING',
    AUTHENTICATION = 'AUTHENTICATION',
}

export enum TemplateStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

@Entity('whatsapp_templates')
export class WhatsappTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    metaTemplateId: string;

    @Column()
    @Index()
    name: string;

    @Column({ default: 'pt_BR' })
    language: string;

    @Column({
        type: 'enum',
        enum: TemplateCategory,
        default: TemplateCategory.UTILITY,
    })
    category: TemplateCategory;

    @Column({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.PENDING,
    })
    status: TemplateStatus;

    @Column({ type: 'jsonb' })
    components: any[];

    @Column()
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
