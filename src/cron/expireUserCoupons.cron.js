import cron from 'node-cron';
import { expireUserCouponsService } from '../services/expireUserCoupons.service.js';

export const registerExpireUserCouponsCron = () => {
  // 매일 새벽 3시 (KST)
  cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        const { expiredCount, executedAt } =
          await expireUserCouponsService();

        console.log(
          `[CRON] expired coupons=${expiredCount} at ${executedAt.toISOString()}`
        );
      } catch (error) {
        console.error('[CRON] expireUserCoupons failed', error);
      }
    },
    {
      timezone: 'Asia/Seoul',
    }
  );
};
