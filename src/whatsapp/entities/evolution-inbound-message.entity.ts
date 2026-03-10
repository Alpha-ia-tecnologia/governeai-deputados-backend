import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('evolution_inbound_messages')
@Index(['instanceName', 'remoteJid'])
@Index(['messageId'], { unique: true })
export class EvolutionInboundMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    messageId: string; // key.id from Evolution API

    @Column()
    instanceName: string;

    @Column()
    remoteJid: string; // sender@s.whatsapp.net

    @Column({ nullable: true })
    pushName: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ default: 'text' })
    messageType: string; // conversation, imageMessage, audioMessage, etc.

    @Column({ type: 'bigint' })
    messageTimestamp: number;

    @Column({ default: false })
    fromMe: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
