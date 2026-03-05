import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

export enum BotFlowStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export enum BotStepType {
    GREETING = 'greeting',
    MENU = 'menu',
    TEXT_RESPONSE = 'text_response',
    COLLECT_INFO = 'collect_info',
    TRANSFER_TO_HUMAN = 'transfer_to_human',
    SEND_TEMPLATE = 'send_template',
    END = 'end',
}

/**
 * Passo de um fluxo de bot.
 * Cada step pode ter opções/botões e uma próxima ação.
 */
export interface BotStep {
    id: string;
    type: BotStepType;
    message: string;
    options?: Array<{
        label: string;
        value: string;
        nextStepId: string;
    }>;
    nextStepId?: string;
    collectField?: string; // nome do campo a coletar (nome, cpf, etc.)
    templateName?: string; // para type SEND_TEMPLATE
}

@Entity('whatsapp_bot_flows')
export class WhatsappBotFlow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: BotFlowStatus,
        default: BotFlowStatus.INACTIVE,
    })
    status: BotFlowStatus;

    @Column({ type: 'jsonb', default: [] })
    steps: BotStep[];

    @Column({ nullable: true })
    entryStepId: string;

    @Column({ type: 'jsonb', default: [] })
    triggerKeywords: string[];

    @Column({ default: false })
    isDefault: boolean;

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
