import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Transform } from 'class-transformer';
import * as moment from 'moment';

export abstract class BaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  @Transform(({ value }) =>
    moment(value as moment.MomentInput).format('YYYY-MM-DD HH:mm:ss'),
  )
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Transform(({ value }) =>
    moment(value as moment.MomentInput).format('YYYY-MM-DD HH:mm:ss'),
  )
  updatedAt: Date;
}
