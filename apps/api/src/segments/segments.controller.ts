import { Controller, Get, Post, Query, Param, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentationService } from '../segmentation/segmentation.service';

@Controller('segments')
export class SegmentsController {
  constructor(
    private readonly segmentsService: SegmentsService,
    private readonly segmentationService: SegmentationService,
  ) {}

  @Get('customers')
  getCustomers(
    @Query('minSpend') minSpend?: string,
    @Query('maxSpend') maxSpend?: string,
    @Query('tierId', new DefaultValuePipe(0), ParseIntPipe) tierId?: number,
    @Query('recency') recency?: string,
    @Query('minVisits') minVisits?: string,
    @Query('maxVisits') maxVisits?: string,
    @Query('minPoints') minPoints?: string,
    @Query('maxPoints') maxPoints?: string,
    @Query('store') store?: string,
    @Query('region') region?: string,
    @Query('enrolledAfter') enrolledAfter?: string,
    @Query('enrolledBefore') enrolledBefore?: string,
    @Query('isActive') isActive?: string,
    @Query('status') status?: string,
    @Query('neverRedeemed') neverRedeemed?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.segmentsService.getCustomers({
      minSpend: minSpend ? parseFloat(minSpend) : undefined,
      maxSpend: maxSpend ? parseFloat(maxSpend) : undefined,
      tierId: tierId || undefined,
      recency: recency || undefined,
      minVisits: minVisits ? parseInt(minVisits, 10) : undefined,
      maxVisits: maxVisits ? parseInt(maxVisits, 10) : undefined,
      minPoints: minPoints ? parseInt(minPoints, 10) : undefined,
      maxPoints: maxPoints ? parseInt(maxPoints, 10) : undefined,
      store: store || undefined,
      region: region || undefined,
      enrolledAfter: enrolledAfter || undefined,
      enrolledBefore: enrolledBefore || undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      status: status || undefined,
      neverRedeemed: neverRedeemed === 'true' ? true : undefined,
      page,
      pageSize,
    });
  }

  @Get('customers/:id/segment-explain')
  explainSegment(@Param('id', ParseUUIDPipe) id: string) {
    return this.segmentationService.explainForCustomer(id);
  }

  @Post('recalculate')
  async recalculate(@Query('customerId') customerId?: string) {
    if (customerId) {
      const explain = await this.segmentationService.updateCustomerSegment(customerId);
      return { updated: 1, explain };
    }
    return this.segmentationService.recalculateAll();
  }
}
