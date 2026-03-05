import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

export enum ChannelStatus {
    CREATED = 'CREATED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED',
}

@Entity('whatsapp_channels')
export class WhatsappChannel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @Column()
    instanceName: string;

    @Column({ nullable: true })
    instanceId: string;

    @Column({ type: 'varchar', default: ChannelStatus.CREATED })
    status: ChannelStatus;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    profileName: string;

    @Column({ nullable: true })
    profilePictureUrl: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
