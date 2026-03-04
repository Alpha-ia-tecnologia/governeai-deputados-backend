import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    content: string;

    @Column()
    @Index()
    senderId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @Column()
    @Index()
    conversationId: string;

    @ManyToOne(() => ChatConversation, c => c.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: ChatConversation;

    @Column({ nullable: true })
    attachmentUrl: string;

    @Column({ nullable: true })
    attachmentName: string;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
