export type SerpOrganicResult = {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
};

export type SerpSearchResult = {
  keyword: string;
  organic: SerpOrganicResult[];
  relatedSearches: string[];
  peopleAlsoAsk: string[];
  configured: boolean;
  provider: string;
  error?: string;
};

export type SerpKeywordMetrics = {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  configured: boolean;
  provider: string;
  error?: string;
};

export type SerpProvider = {
  name: string;
  isConfigured(): boolean;
  searchKeyword(keyword: string, opts?: { num?: number }): Promise<SerpSearchResult>;
  getTopResults(keyword: string, opts?: { num?: number }): Promise<SerpOrganicResult[]>;
  getKeywordMetrics(keyword: string): Promise<SerpKeywordMetrics>;
  getCompetitorRankings(
    keyword: string,
    competitorDomains: string[],
  ): Promise<
    { domain: string; position: number | null; url: string | null }[]
  >;
};
