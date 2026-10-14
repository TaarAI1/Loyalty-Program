import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCustomerSegment, DEFAULT_SEGMENT_CONFIG } from './segmentation';

const cfg = DEFAULT_SEGMENT_CONFIG;
const recent = new Date('2026-10-01T12:00:00Z');
const asOf = new Date('2026-10-10T12:00:00Z');

describe('computeCustomerSegment', () => {
  it('high spend diamond with few txs is not potential', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 3,
        lifetimeSale: 6_071_625,
        lastVisitDate: recent,
        firstVisitDate: new Date('2026-08-01'),
        tierName: 'Diamond',
        asOfDate: asOf,
      },
      cfg,
    );
    assert.notEqual(r.segment, 'potential');
    assert.equal(r.segment, 'champion');
  });

  it('four purchases of Rs 10 each is not loyal', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 4,
        lifetimeSale: 40,
        lastVisitDate: recent,
        firstVisitDate: new Date('2026-09-01'),
        asOfDate: asOf,
      },
      cfg,
    );
    assert.notEqual(r.segment, 'loyal');
  });

  it('high spend frequent recent gets strong classification', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 12,
        lifetimeSale: 800_000,
        lastVisitDate: recent,
        firstVisitDate: new Date('2026-01-01'),
        tierName: 'Gold',
        asOfDate: asOf,
      },
      cfg,
    );
    assert.ok(r.segment === 'champion' || r.segment === 'loyal');
  });

  it('high historical spend but long inactivity is at_risk', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 10,
        lifetimeSale: 2_000_000,
        lastVisitDate: new Date('2026-06-01'),
        firstVisitDate: new Date('2025-01-01'),
        asOfDate: asOf,
      },
      cfg,
    );
    assert.equal(r.segment, 'at_risk');
  });

  it('zero completed txs is new', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 0,
        lifetimeSale: 0,
        lastVisitDate: null,
        firstVisitDate: null,
        asOfDate: asOf,
      },
      cfg,
    );
    assert.equal(r.segment, 'new');
  });

  it('missing last visit does not assign loyal', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 5,
        lifetimeSale: 100_000,
        lastVisitDate: null,
        firstVisitDate: null,
        asOfDate: asOf,
      },
      cfg,
    );
    assert.notEqual(r.segment, 'loyal');
  });

  it('vip by spend with low tx count', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 2,
        lifetimeSale: 1_062_730,
        lastVisitDate: recent,
        firstVisitDate: new Date('2026-09-15'),
        tierName: 'Diamond',
        asOfDate: asOf,
      },
      cfg,
    );
    assert.equal(r.segment, 'champion');
  });

  it('dormant after 180+ days', () => {
    const r = computeCustomerSegment(
      {
        completedTxCount: 5,
        lifetimeSale: 50_000,
        lastVisitDate: new Date('2025-01-01'),
        firstVisitDate: new Date('2024-06-01'),
        asOfDate: asOf,
      },
      cfg,
    );
    assert.equal(r.segment, 'dormant');
  });
});
