import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('whatsapp_settings')
export class WhatsappSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    // ─── Credenciais da API ───
    @Column({ nullable: true })
    accessToken: string;

    @Column({ nullable: true })
    phoneNumberId: string;

    @Column({ nullable: true })
    businessAccountId: string;

    @Column({ nullable: true })
    verifyToken: string;

    @Column({ default: 'v21.0' })
    apiVersion: string;

    // ─── Configurações do Bot ───
    @Column({ default: true })
    botEnabled: boolean;

    @Column({ nullable: true })
    welcomeMessage: string;

    @Column({ nullable: true })
    offlineMessage: string;

    // ─── Configurações de Atendimento ───
    @Column({ default: '08:00' })
    businessHoursStart: string;

    @Column({ default: '18:00' })
    businessHoursEnd: string;

    @Column({ default: 'segunda a sexta' })
    businessDays: string;

    @Column({ default: true })
    autoAssignEnabled: boolean;

    @Column({ default: 5 })
    maxConcurrentChats: number;

    // ─── Notificações ───
    @Column({ default: true })
    notifyNewConversation: boolean;

    @Column({ default: true })
    notifyTransfer: boolean;

    @Column({ default: true })
    soundEnabled: boolean;

    // ─── Webhook URL ───
    @Column({ nullable: true })
    webhookUrl: string;

    // ─── Evolution API ───
    @Column({ nullable: true })
    evolutionApiUrl: string;

    @Column({ nullable: true })
    evolutionApiKey: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
