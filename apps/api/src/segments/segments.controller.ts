import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SegmentsService } from './segments.service';

@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

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
      page,
      pageSize,
    });
  }
}
