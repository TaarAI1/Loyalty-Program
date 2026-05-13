import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('filters')
  getFilterOptions() {
    return this.reportsService.getFilterOptions();
  }

  @Get('customer-tier')
  customerTierWise(
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('tierId', new DefaultValuePipe(0), ParseIntPipe) tierId?: number,
    @Query('gender') gender?: string,
    @Query('ageFrom', new DefaultValuePipe(0), ParseIntPipe) ageFrom?: number,
    @Query('ageTo', new DefaultValuePipe(0), ParseIntPipe) ageTo?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month?: number,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.reportsService.customerTierWise({
      region, store,
      tierId: tierId || undefined,
      gender,
      ageFrom: ageFrom || undefined,
      ageTo: ageTo || undefined,
      dateFrom, dateTo,
      month: month || undefined,
      year: year || undefined,
      page, pageSize,
    });
  }

  @Get('birthday-response')
  birthdayResponse(
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('month', new DefaultValuePipe(0), ParseIntPipe) month?: number,
    @Query('year', new DefaultValuePipe(0), ParseIntPipe) year?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.reportsService.birthdayResponse({
      region, store,
      month: month || undefined,
      year: year || undefined,
      page, pageSize,
    });
  }

  @Get('top-customers')
  topCustomers(
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('tierId', new DefaultValuePipe(0), ParseIntPipe) tierId?: number,
    @Query('gender') gender?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    return this.reportsService.topCustomers({
      region, store,
      tierId: tierId || undefined,
      gender, dateFrom, dateTo, limit,
    });
  }

  @Get('loyalty-sales')
  loyaltySalesDetail(
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.reportsService.loyaltySalesDetail({ region, store, dateFrom, dateTo, page, pageSize });
  }

  @Get('forensic')
  forensicReport(
    @Query('region') region?: string,
    @Query('store') store?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    return this.reportsService.forensicReport({ region, store, dateFrom, dateTo, page, pageSize });
  }
}
