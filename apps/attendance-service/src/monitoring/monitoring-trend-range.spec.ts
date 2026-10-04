import { monitoringTrendRange } from './monitoring-trend-range';

describe('monitoringTrendRange', () => {
  it('returns every inclusive calendar date for a valid range', () => {
    expect(monitoringTrendRange('2026-10-02', '2026-10-05')?.dates).toEqual([
      '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
    ]);
  });

  it('accepts up to 92 days and rejects invalid, reversed, or longer ranges', () => {
    expect(monitoringTrendRange('2026-01-01', '2026-04-02')?.dates).toHaveLength(92);
    expect(monitoringTrendRange('2026-01-01', '2026-04-03')).toBeNull();
    expect(monitoringTrendRange('2026-10-05', '2026-10-02')).toBeNull();
    expect(monitoringTrendRange('2026-02-30', '2026-03-01')).toBeNull();
  });
});
