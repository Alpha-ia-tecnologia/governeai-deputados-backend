import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('whatsapp_contacts')
export class WhatsappContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    phone: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    profileName: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    cpf: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ nullable: true })
    companyName: string;

    @Column({ nullable: true })
    linkedVoterId: string;

    @Column()
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @ManyToMany(() => WhatsappLabel, label => label.contacts)
    @JoinTable({ name: 'whatsapp_contact_labels' })
    labels: WhatsappLabel[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// Forward reference - actual entity below
import { WhatsappLabel } from './whatsapp-label.entity';
