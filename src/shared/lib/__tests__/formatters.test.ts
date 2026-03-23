import { describe, it, expect } from 'vitest';
import { formatAmount, formatAmountPlain, formatDate } from '../formatters';

describe('formatAmountPlain', () => {
  it('returns comma-separated number without 원 suffix', () => {
    expect(formatAmountPlain(10000)).toBe('10,000');
  });

  it('handles zero', () => {
    expect(formatAmountPlain(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatAmountPlain(-5000)).toBe('-5,000');
  });

  it('handles large numbers', () => {
    expect(formatAmountPlain(1234567)).toBe('1,234,567');
  });

  it('handles small numbers without commas', () => {
    expect(formatAmountPlain(999)).toBe('999');
  });
});

describe('formatAmount', () => {
  it('returns comma-separated number with 원 suffix', () => {
    expect(formatAmount(10000)).toBe('10,000원');
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0원');
  });

  it('handles negative numbers', () => {
    expect(formatAmount(-5000)).toBe('-5,000원');
  });
});

describe('formatDate', () => {
  it('formats timestamp to YYYY.MM.DD', () => {
    const ts = new Date(2025, 0, 15).getTime();
    expect(formatDate(ts)).toBe('2025.01.15');
  });
});
