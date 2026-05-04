import { Controller, Post, Body, Param } from '@nestjs/common';
import { CouponService } from './coupon.service';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post(':id/issue/no-lock')
  async issueCouponWithNoLock(@Param('id') id: string) {
    return await this.couponService.issueWithNoLock(Number(id));
  }

  @Post(':id/issue/pessimistic-lock')
  async issueCouponWithPessimisticLock(@Param('id') id: string) {
    return await this.couponService.issueWithPessimisticLock(Number(id));
  }

  @Post(':id/issue/optimistic-lock')
  async issueCouponWithOptimisticLock(@Param('id') id: string) {
    return this.couponService.issueWithOptimisticLock(Number(id));
  }

  @Post(':id/issue/redis-lock')
  issueCouponWithRedisLock(@Param('id') id: string) {
    return this.couponService.issueWithRedisLock(Number(id));
  }
}
