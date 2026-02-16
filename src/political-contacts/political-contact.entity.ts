import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum PoliticalRole {
    PREFEITO = 'prefeito',
    VEREADOR = 'vereador',
    LIDERANCA_COMUNITARIA = 'lideranca_comunitaria',
    SECRETARIO = 'secretario',
    DEPUTADO_ESTADUAL = 'deputado_estadual',
    SENADOR = 'senador',
    OUTRO = 'outro',
}

export enum Relationship {
    ALIADO = 'aliado',
    NEUTRO = 'neutro',
    OPOSICAO = 'oposicao',
}

@Entity('political_contacts')
export class PoliticalContact {
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

    @Column({ type: 'enum', enum: PoliticalRole })
    politicalRole: PoliticalRole;

    @Column({ nullable: true })
    party: string;

    @Column()
    city: string;

    @Column()
    state: string;

    @Column({ nullable: true })
    region: string;

    @Column({ type: 'enum', enum: Relationship, default: Relationship.NEUTRO })
    relationship: Relationship;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'date', nullable: true })
    lastContactDate: Date;

    @Column({ default: true })
    active: boolean;

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
