import { describe, it, expect } from 'vitest';
import { aggregateEvents, formatDuration, formatNumber } from './aggregator.js';
import type { NormalizedEvent } from './types.js';

describe('aggregator', () => {
  const sampleEvents: NormalizedEvent[] = [
    {
      timestamp: new Date('2025-08-15T10:00:00Z'),
      model: 'Opus',
      tokensIn: 1000,
      tokensOut: 2000,
      tokensTotal: 3000,
      durationMs: 15000,
      sessionId: 'S1',
      project: 'proj1'
    },
    {
      timestamp: new Date('2025-08-15T11:00:00Z'),
      model: 'Sonnet',
      tokensIn: 500,
      tokensOut: 1000,
      tokensTotal: 1500,
      durationMs: 8000,
      sessionId: 'S2',
      project: 'proj1'
    },
    {
      timestamp: new Date('2025-08-15T12:00:00Z'),
      model: 'Sonnet',
      tokensIn: 300,
      tokensOut: 700,
      tokensTotal: 1000,
      durationMs: 5000,
      sessionId: 'S3',
      project: 'proj2'
    }
  ];

  describe('aggregateEvents', () => {
    it('should aggregate all-time stats correctly', () => {
      const result = aggregateEvents(sampleEvents, { groupBy: 'all-time' });
      
      if (result instanceof Map) {
        throw new Error('Expected single report for all-time');
      }

      expect(result.grouping).toBe('all-time');
      expect(result.totals.tokens).toBe(5500);
      expect(result.totals.prompts).toBe(3);
      expect(result.totals.durationMs).toBe(28000);

      // Test model-specific stats
      expect(result.models.Opus.tokens).toBe(3000);
      expect(result.models.Opus.prompts).toBe(1);
      expect(result.models.Opus.pctTokens).toBeCloseTo(54.5, 1);
      
      expect(result.models.Sonnet.tokens).toBe(2500);
      expect(result.models.Sonnet.prompts).toBe(2);
      expect(result.models.Sonnet.pctTokens).toBeCloseTo(45.5, 1);
      expect(result.models.Sonnet.pctPrompts).toBeCloseTo(66.7, 1);
    });

    it('should handle empty events', () => {
      const result = aggregateEvents([], { groupBy: 'all-time' });
      
      if (result instanceof Map) {
        throw new Error('Expected single report for all-time');
      }

      expect(result.totals.tokens).toBe(0);
      expect(result.totals.prompts).toBe(0);
      expect(result.totals.durationMs).toBe(0);
      expect(result.models.Opus.pctTokens).toBe(0);
      expect(result.models.Sonnet.pctTokens).toBe(0);
    });

    it('should group by day', () => {
      const multiDayEvents: NormalizedEvent[] = [
        {
          timestamp: new Date('2025-08-15T10:00:00Z'),
          model: 'Opus',
          tokensIn: 1000,
          tokensOut: 2000,
          tokensTotal: 3000,
          durationMs: 15000,
        },
        {
          timestamp: new Date('2025-08-16T10:00:00Z'),
          model: 'Sonnet',
          tokensIn: 500,
          tokensOut: 1000,
          tokensTotal: 1500,
          durationMs: 8000,
        }
      ];

      const result = aggregateEvents(multiDayEvents, { 
        groupBy: 'day',
        timezone: 'UTC'
      });
      
      if (!(result instanceof Map)) {
        throw new Error('Expected Map for daily grouping');
      }

      expect(result.size).toBe(2);
      expect(result.has('2025-08-15')).toBe(true);
      expect(result.has('2025-08-16')).toBe(true);

      const day1 = result.get('2025-08-15')!;
      expect(day1.totals.tokens).toBe(3000);
      expect(day1.models.Opus.tokens).toBe(3000);
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(60000)).toBe('00:01'); // 1 minute
      expect(formatDuration(3660000)).toBe('01:01'); // 1 hour 1 minute
      expect(formatDuration(7380000)).toBe('02:03'); // 2 hours 3 minutes
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with locale separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(42)).toBe('42');
    });
  });
});