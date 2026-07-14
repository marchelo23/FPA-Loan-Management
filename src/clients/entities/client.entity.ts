import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  identificationNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column()
  address: string;

  @Column({ type: 'int' })
  creditScore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  creditLimit: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Loan, (loan) => loan.client)
  loans: Loan[];
}
