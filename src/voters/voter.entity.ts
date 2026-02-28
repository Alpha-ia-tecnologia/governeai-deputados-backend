import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

@Entity('voters')
export class Voter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  cpf: string;

  @Column({ nullable: true })
  voterRegistration: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column()
  phone: string;

  // Campos de endereço
  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  number: string;

  @Column({ nullable: true })
  complement: string;

  @Column({ nullable: true })
  neighborhood: string;

  @Column({ nullable: true })
  cep: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  // Coordenadas para mapa de calor
  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ default: 0 })
  votesCount: number;

  @Column({ nullable: true })
  leaderId: string;

  @ManyToOne(() => Leader, { eager: true, nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: Leader;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Campos do Gabinete Social
  @Column({ nullable: true })
  zona: string;

  @Column({ nullable: true })
  localidade: string;

  @Column({ nullable: true })
  tipoSuporte: string;

  @Column({ nullable: true })
  articulador: string;

  @Column({ type: 'int', nullable: true })
  idade: number;

  // Multitenancy: referência ao vereador dono deste registro
  // Nullable para permitir migração de dados existentes
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
