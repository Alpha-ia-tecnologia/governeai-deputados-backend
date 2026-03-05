import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { User } from '../../users/user.entity';
import { WhatsappContact } from './whatsapp-contact.entity';
import { WhatsappMessage } from './whatsapp-message.entity';
import { WhatsappInternalNote } from './whatsapp-internal-note.entity';

export enum ConversationStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    RESOLVED = 'resolved',
}

@Entity('whatsapp_conversations')
export class WhatsappConversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    contactId: string;

    @ManyToOne(() => WhatsappContact)
    @JoinColumn({ name: 'contactId' })
    contact: WhatsappContact;

    @Column()
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @Column({ nullable: true })
    @Index()
    assignedToId: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assignedToId' })
    assignedTo: User;

    @Column({
        type: 'enum',
        enum: ConversationStatus,
        default: ConversationStatus.PENDING,
    })
    @Index()
    status: ConversationStatus;

    @Column({ type: 'timestamp', nullable: true })
    lastClientMessageAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @Column({ nullable: true })
    resolvedById: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'resolvedById' })
    resolvedBy: User;

    @Column({ default: true })
    isBotActive: boolean;

    @Column({ nullable: true })
    botCurrentStepId: string;

    @OneToMany(() => WhatsappMessage, m => m.conversation)
    messages: WhatsappMessage[];

    @OneToMany(() => WhatsappInternalNote, n => n.conversation)
    internalNotes: WhatsappInternalNote[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
