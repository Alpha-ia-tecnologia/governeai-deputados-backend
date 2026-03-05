import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';
import { WhatsappConversation } from './whatsapp-conversation.entity';

@Entity('whatsapp_internal_notes')
export class WhatsappInternalNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    conversationId: string;

    @ManyToOne(() => WhatsappConversation, c => c.internalNotes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: WhatsappConversation;

    @Column()
    authorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'authorId' })
    author: User;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn()
    createdAt: Date;
}
