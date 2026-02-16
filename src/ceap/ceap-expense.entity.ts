import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum ExpenseCategory {
    PASSAGENS_AEREAS = 'passagens_aereas',
    TELEFONIA = 'telefonia',
    SERVICOS_POSTAIS = 'servicos_postais',
    MANUTENCAO_ESCRITORIO = 'manutencao_escritorio',
    CONSULTORIA = 'consultoria',
    DIVULGACAO = 'divulgacao',
    COMBUSTIVEL = 'combustivel',
    HOSPEDAGEM = 'hospedagem',
    ALIMENTACAO = 'alimentacao',
    LOCACAO_VEICULOS = 'locacao_veiculos',
    SEGURANCA = 'seguranca',
    OUTROS = 'outros',
}

@Entity('ceap_expenses')
export class CeapExpense {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'enum', enum: ExpenseCategory })
    category: ExpenseCategory;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    value: number;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    supplier: string;

    @Column({ nullable: true })
    supplierCnpj: string;

    @Column({ nullable: true })
    documentNumber: string;

    @Column({ nullable: true })
    receiptUrl: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

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
