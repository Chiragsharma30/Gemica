import { describe, it, expect } from 'vitest';
import { formatPrice, titleCase } from './format';

describe('format', () => {
  it('formats whole rupees without decimals', () => expect(formatPrice(1299)).toBe('₹1,299'));
  it('keeps paise when present', () => expect(formatPrice(1299.5)).toBe('₹1,299.50'));
  it('handles junk input', () => expect(formatPrice('abc')).toBe('₹0'));
  it('titleCases snake status', () => expect(titleCase('refund_pending')).toBe('refund pending'));
});
