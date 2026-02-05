import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  VEREADOR = 'vereador',
  LIDERANCA = 'lideranca',
  ASSESSOR = 'assessor',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  cpf: string;

  @Column()
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ASSESSOR,
  })
  role: UserRole;

  @Column({ nullable: true })
  region: string;

  // Cidade e estado de atuação do vereador (para mapa de calor)
  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ default: true })
  active: boolean;

  // Multitenancy: vereadorId referencia o usuário vereador ao qual este usuário pertence
  // Se o usuário for VEREADOR, vereadorId aponta para si mesmo
  // Se for ASSESSOR ou LIDERANCA, aponta para o vereador responsável
  // Se for ADMIN, pode ser null (acesso total)
  @Column({ nullable: true })
  vereadorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'vereadorId' })
  vereador: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
