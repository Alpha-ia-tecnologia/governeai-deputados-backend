import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';
import { WhatsappConversation } from './whatsapp-conversation.entity';

export enum MessageDirection {
    INBOUND = 'inbound',
    OUTBOUND = 'outbound',
}

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video',
    DOCUMENT = 'document',
    LOCATION = 'location',
    CONTACT = 'contact',
    INTERACTIVE = 'interactive',
    TEMPLATE = 'template',
    STICKER = 'sticker',
    REACTION = 'reaction',
}

export enum DeliveryStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

@Entity('whatsapp_messages')
export class WhatsappMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    conversationId: string;

    @ManyToOne(() => WhatsappConversation, c => c.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: WhatsappConversation;

    @Column({ nullable: true, unique: true })
    @Index()
    wamid: string;

    @Column({
        type: 'enum',
        enum: MessageDirection,
    })
    direction: MessageDirection;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
    })
    type: MessageType;

    @Column({ type: 'text', nullable: true })
    content: string;

    // Media fields
    @Column({ nullable: true })
    mediaId: string;

    @Column({ nullable: true })
    mediaMimeType: string;

    @Column({ nullable: true })
    mediaLocalPath: string;

    @Column({ nullable: true })
    mediaCaption: string;

    // Location fields
    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @Column({ nullable: true })
    locationName: string;

    @Column({ nullable: true })
    locationAddress: string;

    // Delivery status (for outbound)
    @Column({
        type: 'enum',
        enum: DeliveryStatus,
        default: DeliveryStatus.PENDING,
    })
    deliveryStatus: DeliveryStatus;

    // Who sent it (null for inbound customer messages)
    @Column({ nullable: true })
    senderUserId: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'senderUserId' })
    senderUser: User;

    // Raw webhook payload for debugging
    @Column({ type: 'jsonb', nullable: true })
    rawPayload: any;

    @CreateDateColumn()
    createdAt: Date;
}
