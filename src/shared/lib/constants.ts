export const PASTEL_COLORS = ['pink', 'lavender', 'mint', 'sky', 'peach'] as const;
export type PastelColor = (typeof PASTEL_COLORS)[number];

export const LIMITS = {
  SESSION_AMOUNT_MAX: 100_000_000,
  ALCOHOL_UNIT_PRICE_MAX: 10_000_000,
  ALCOHOL_QUANTITY_MAX: 999,
  SETTLEMENT_AMOUNT_MAX: 1_000_000_000,
  MEMBER_NAME_MAX_LENGTH: 10,
  ARRAY_MAX_LENGTH: 100,
  STRING_MAX_LENGTH: 200,
} as const;
