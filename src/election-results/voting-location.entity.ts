import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('voting_locations')
@Index(['zone', 'section'], { unique: true })
export class VotingLocation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    zone: number;

    @Column({ type: 'int' })
    section: number;

    @Column({ type: 'varchar', length: 255 })
    neighborhood: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    locationName: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 100, default: 'PARNAÍBA' })
    municipality: string;

    @Column({ type: 'varchar', length: 2, default: 'PI' })
    state: string;
}
