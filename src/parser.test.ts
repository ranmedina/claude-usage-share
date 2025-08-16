import { describe, it, expect } from 'vitest';
import { normalizeModel, extractTimestamp, extractTokens, isValidEvent, normalizeEvent } from './parser.js';
import type { RawEvent } from './types.js';

describe('parser', () => {
  describe('normalizeModel', () => {
    it('should normalize opus models', () => {
      expect(normalizeModel('opus-4.1')).toBe('Opus');
      expect(normalizeModel('OPUS-3.5')).toBe('Opus');
      expect(normalizeModel('opus')).toBe('Opus');
    });

    it('should normalize sonnet models', () => {
      expect(normalizeModel('sonnet-4.1')).toBe('Sonnet');
      expect(normalizeModel('SONNET-3.5')).toBe('Sonnet');
      expect(normalizeModel('sonnet')).toBe('Sonnet');
    });

    it('should classify unknown models as Other', () => {
      expect(normalizeModel('gpt-4')).toBe('Other');
      expect(normalizeModel('claude-1')).toBe('Other');
      expect(normalizeModel('unknown')).toBe('Other');
    });
  });

  describe('extractTimestamp', () => {
    it('should extract ISO string timestamps', () => {
      const raw: RawEvent = { ts: '2025-08-15T13:45:21.532Z' };
      const result = extractTimestamp(raw);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-08-15T13:45:21.532Z');
    });

    it('should extract numeric timestamps', () => {
      const raw: RawEvent = { timestamp: 1723720930000 };
      const result = extractTimestamp(raw);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(1723720930000);
    });

    it('should handle multiple timestamp fields', () => {
      const raw: RawEvent = { 
        ts: '2025-08-15T13:45:21.532Z',
        timestamp: 1723720930000,
        created_at: '2025-08-15T14:00:00.000Z'
      };
      const result = extractTimestamp(raw);
      expect(result?.toISOString()).toBe('2025-08-15T13:45:21.532Z');
    });

    it('should return null for invalid timestamps', () => {
      const raw: RawEvent = { ts: 'invalid-date' };
      expect(extractTimestamp(raw)).toBeNull();
    });
  });

  describe('extractTokens', () => {
    it('should extract direct token fields', () => {
      const raw: RawEvent = { tokens_in: 100, tokens_out: 200 };
      const result = extractTokens(raw);
      expect(result).toEqual({ tokensIn: 100, tokensOut: 200 });
    });

    it('should extract from usage object', () => {
      const raw: RawEvent = { 
        usage: { 
          input_tokens: 150, 
          completion_tokens: 250 
        } 
      };
      const result = extractTokens(raw);
      expect(result).toEqual({ tokensIn: 150, tokensOut: 250 });
    });

    it('should handle alternative field names', () => {
      const raw: RawEvent = { 
        input_tokens: 75,
        output_tokens: 125
      };
      const result = extractTokens(raw);
      expect(result).toEqual({ tokensIn: 75, tokensOut: 125 });
    });

    it('should default to 0 for missing tokens', () => {
      const raw: RawEvent = {};
      const result = extractTokens(raw);
      expect(result).toEqual({ tokensIn: 0, tokensOut: 0 });
    });
  });

  describe('isValidEvent', () => {
    it('should validate complete events', () => {
      const raw: RawEvent = {
        ts: '2025-08-15T13:45:21.532Z',
        model: 'opus-4.1',
        tokens_in: 100,
        tokens_out: 200
      };
      expect(isValidEvent(raw)).toBe(true);
    });

    it('should validate completion events', () => {
      const raw: RawEvent = {
        ts: '2025-08-15T13:45:21.532Z',
        model: 'opus-4.1',
        event: 'completion'
      };
      expect(isValidEvent(raw)).toBe(true);
    });

    it('should reject events without model', () => {
      const raw: RawEvent = {
        ts: '2025-08-15T13:45:21.532Z',
        tokens_in: 100,
        tokens_out: 200
      };
      expect(isValidEvent(raw)).toBe(false);
    });

    it('should reject events without timestamp', () => {
      const raw: RawEvent = {
        model: 'opus-4.1',
        tokens_in: 100,
        tokens_out: 200
      };
      expect(isValidEvent(raw)).toBe(false);
    });
  });

  describe('normalizeEvent', () => {
    it('should normalize valid events', () => {
      const raw: RawEvent = {
        ts: '2025-08-15T13:45:21.532Z',
        project: '/Users/test/project',
        session_id: 'S1',
        model: 'opus-4.1',
        tokens_in: 1423,
        tokens_out: 2109,
        latency_ms: 18234
      };
      
      const result = normalizeEvent(raw);
      expect(result).toEqual({
        timestamp: new Date('2025-08-15T13:45:21.532Z'),
        model: 'Opus',
        tokensIn: 1423,
        tokensOut: 2109,
        tokensTotal: 3532,
        durationMs: 18234,
        sessionId: 'S1',
        project: '/Users/test/project'
      });
    });

    it('should return null for invalid events', () => {
      const raw: RawEvent = {
        tokens_in: 100,
        tokens_out: 200
      };
      expect(normalizeEvent(raw)).toBeNull();
    });
  });
});