import { Module } from '@nestjs/common';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { SegmentationModule } from '../segmentation/segmentation.module';

@Module({
  imports: [SegmentationModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
})
export class SegmentsModule {}
