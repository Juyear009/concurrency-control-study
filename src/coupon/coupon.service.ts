import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Coupon } from './entities/coupon.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';

@Injectable()
export class CouponService implements OnModuleInit {
  private redis: Redis;

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    private readonly dataSource: DataSource,
  ) {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  async onModuleInit() {
    const initialCoupon = this.couponRepository.create({
      id: 1,
      stock: 100,
      version: 1,
    });

    await this.couponRepository.save(initialCoupon);
  }

  async issueWithNoLock(id: number) {
    const couponEntity = await this.couponRepository.findOneBy({ id });
    console.log(couponEntity);

    if (!couponEntity) {
      throw new NotFoundException('해당 쿠폰을 찾을 수 없습니다.');
    }

    if (couponEntity.stock <= 0) {
      throw new BadRequestException('해당 쿠폰의 재고가 모두 소진되었습니다.');
    }

    couponEntity.stock -= 1;

    return await this.couponRepository.save(couponEntity);
  }

  async issueWithPessimisticLock(id: number): Promise<Coupon> {
    return await this.dataSource.transaction(async (manager) => {
      const couponEntity = await manager.findOne(Coupon, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!couponEntity) {
        throw new NotFoundException('해당 쿠폰을 찾을 수 없습니다.');
      }

      if (couponEntity.stock <= 0) {
        throw new BadRequestException(
          '해당 쿠폰의 재고가 모두 소진되었습니다.',
        );
      }

      couponEntity.stock -= 1;
      console.log(couponEntity);
      return await manager.save(couponEntity);
    });
  }

  async issueWithOptimisticLock(id: number) {
    const couponEntity = await this.couponRepository.findOne({
      where: { id },
    });

    if (!couponEntity) {
      throw new NotFoundException('해당 쿠폰을 찾을 수 없습니다.');
    }

    if (couponEntity.stock <= 0) {
      throw new BadRequestException('해당 쿠폰의 재고가 모두 소진되었습니다.');
    }

    const result = await this.couponRepository
      .createQueryBuilder()
      .update(Coupon)
      .set({ stock: () => 'stock - 1', version: () => 'version + 1' })
      .where('id = :id AND version = :version', {
        id: couponEntity.id,
        version: couponEntity.version,
      })
      .execute();

    if (result.affected === 0) {
      throw new ConflictException(
        '다른 사용자가 먼저 쿠폰을 발급받았습니다. 다시 시도해 주세요',
      );
    }

    const updatedCoupon = await this.couponRepository.findOne({
      where: { id },
    });

    return updatedCoupon;
  }

  async issueWithRedisLock(id: number): Promise<Coupon> {
    const lockKey = `lock:coupon:${id}`;
    const ttl = 5000;
    const acquireTime = Date.now() + ttl;

    const result = await this.redis.set(
      lockKey,
      acquireTime.toString(),
      'PX',
      ttl,
      'NX',
    );

    const isLocked = result === 'OK';

    if (!isLocked) {
      throw new ConflictException(
        '현재 다른 사용자가 쿠폰을 발급받고 있습니다. 잠시 후 다시 시도해 주세요.',
      );
    }

    try {
      const couponEntity = await this.couponRepository.findOne({
        where: { id },
      });
      if (!couponEntity) {
        throw new NotFoundException('해당 쿠폰을 찾을 수 없습니다.');
      }

      if (couponEntity.stock <= 0) {
        throw new BadRequestException(
          '해당 쿠폰의 재고가 모두 소진되었습니다.',
        );
      }

      couponEntity.stock -= 1;
      console.log(couponEntity);
      return await this.couponRepository.save(couponEntity);
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
