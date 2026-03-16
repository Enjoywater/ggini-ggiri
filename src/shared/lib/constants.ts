export const PASTEL_COLORS = ['pink', 'lavender', 'mint', 'sky', 'peach'] as const;
export type PastelColor = (typeof PASTEL_COLORS)[number];
