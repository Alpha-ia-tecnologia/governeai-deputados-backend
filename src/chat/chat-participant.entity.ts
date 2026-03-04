import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { ChatConversation } from './chat-conversation.entity';

export enum ParticipantRole {
    ADMIN = 'admin',
    MEMBER = 'member',
}

@Entity('chat_participants')
@Unique(['conversationId', 'userId'])
export class ChatParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    conversationId: string;

    @ManyToOne(() => ChatConversation, c => c.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: ChatConversation;

    @Column()
    @Index()
    userId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'enum', enum: ParticipantRole, default: ParticipantRole.MEMBER })
    role: ParticipantRole;

    @CreateDateColumn()
    joinedAt: Date;
}
