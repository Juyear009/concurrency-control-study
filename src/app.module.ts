import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CouponModule } from './coupon/coupon.module';
import { Coupon } from './coupon/entities/coupon.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '0000',
      database: 'concurrency_study',
      entities: [Coupon],
      synchronize: true,
      logging: true,
    }),
    CouponModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
