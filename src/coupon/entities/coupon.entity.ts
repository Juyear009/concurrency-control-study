import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', default: 100 })
  stock!: number;

  @VersionColumn()
  version!: number;
}
