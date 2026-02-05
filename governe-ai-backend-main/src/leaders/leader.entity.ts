import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('leaders')
export class Leader {
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

  @Column({ nullable: true })
  region: string;

  @Column({ default: 0 })
  votersCount: number;

  @Column({ default: 0 })
  votersGoal: number;

  @Column({ default: true })
  active: boolean;

  // Multitenancy: referência ao vereador dono deste registro
  // Nullable para permitir migração de dados existentes
  @Column({ nullable: true })
  @Index()
  vereadorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'vereadorId' })
  vereador: User;

  // Referência ao usuário do sistema (quando a liderança também é um usuário)
  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
