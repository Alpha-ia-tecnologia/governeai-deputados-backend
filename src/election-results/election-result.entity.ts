import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('election_results')
export class ElectionResult {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    electionYear: number;

    @Column()
    round: number; // 1 ou 2 (turno)

    @Column()
    @Index()
    zone: number; // NR_ZONA

    @Column()
    @Index()
    section: number; // NR_SECAO

    @Column({ nullable: true })
    @Index()
    position: string; // DS_CARGO (VEREADOR, PREFEITO)

    @Column({ nullable: true })
    candidateNumber: string; // NR_VOTAVEL

    @Column({ nullable: true })
    @Index()
    candidateName: string; // NM_VOTAVEL

    @Column({ nullable: true })
    partyNumber: string; // NR_PARTIDO

    @Column({ nullable: true })
    partyAcronym: string; // SG_PARTIDO

    @Column({ nullable: true })
    partyName: string; // NM_PARTIDO

    @Column()
    votes: number; // QT_VOTOS

    // Campos extras para contexto
    @Column({ default: 'PARNAÍBA' })
    municipality: string;

    @Column({ default: 'PI' })
    state: string;

    @CreateDateColumn()
    createdAt: Date;
}
