import { Module } from '@nestjs/common';
import { PointsExpiryJob } from './points-expiry.job';
import { BirthdayJob } from './birthday.job';
import { ForensicAlertJob } from './forensic-alert.job';
import { TierRecalcJob } from './tier-recalc.job';
import { NotificationProcessorsModule } from '../processors/notification-processors.module';

@Module({
  imports: [NotificationProcessorsModule],
  providers: [PointsExpiryJob, BirthdayJob, ForensicAlertJob, TierRecalcJob],
})
export class JobsModule {}
