import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, ManyToMany } from 'typeorm';
import { User } from '../../users/user.entity';
import { WhatsappContact } from './whatsapp-contact.entity';

@Entity('whatsapp_labels')
export class WhatsappLabel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ default: '#3B82F6' })
    color: string;

    @Column()
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @ManyToMany(() => WhatsappContact, contact => contact.labels)
    contacts: WhatsappContact[];
}
