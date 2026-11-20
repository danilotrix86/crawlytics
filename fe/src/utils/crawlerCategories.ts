import { CHART_COLORS } from '../theme/chartTheme';

/** Why a crawler visits. Keys match the backend's enrichment/crawlers.json */
export const CATEGORY_LABELS: Record<string, string> = {
  training: 'AI training',
  ai_search: 'AI search',
  user_action: 'User-triggered fetch',
  search_engine: 'Search engine',
  seo: 'SEO tool',
  other: 'Other',
  uncategorized: 'Uncategorized',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  training: 'Collects content to train AI models. Blocking it has no effect on search visibility.',
  ai_search: 'Indexes pages so they can be cited in AI search answers.',
  user_action: 'Fetches a page live because a person asked an AI assistant about it.',
  search_engine: 'Classic search engine crawler.',
  seo: 'Commercial SEO and marketing tools.',
  other: 'Monitoring, advertising and generic tools.',
  uncategorized: 'Custom patterns without metadata.',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'AI training': CHART_COLORS.danger,
  'AI search': CHART_COLORS.primary,
  'User-triggered fetch': CHART_COLORS.success,
  'Search engine': CHART_COLORS.teal,
  'SEO tool': CHART_COLORS.warning,
  'Other': CHART_COLORS.neutral,
  'Uncategorized': CHART_COLORS.gray,
};

export const categoryLabel = (category: string | null | undefined): string =>
  CATEGORY_LABELS[category || 'uncategorized'] ?? category ?? 'Uncategorized';
