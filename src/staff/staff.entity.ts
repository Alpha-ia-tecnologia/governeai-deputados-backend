import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('staff_members')
export class StaffMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    cpf: string;

    @Column()
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column()
    role: string;

    @Column()
    position: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    salary: number;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ nullable: true })
    department: string;

    @Column({ default: true })
    active: boolean;

    // Multitenancy: referência ao vereador dono deste registro
    @Column({ nullable: true })
    @Index()
    vereadorId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'vereadorId' })
    vereador: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
