export type Platform = "meta" | "google";

export type FieldKey =
  | "date"
  | "campaign_name"
  | "adset_name"
  | "ad_name"
  | "spend"
  | "impressions"
  | "reach"
  | "clicks"
  | "results"
  | "result_indicator"
  | "profile_visits"
  | "ig_follows"
  | "all_conversions"
  | "conversion_action";

/** Campo do sistema → índice da coluna no arquivo. */
export type Mapping = Partial<Record<FieldKey, number>>;

/** Campo do sistema → nome da coluna no arquivo (é o que se salva por empresa). */
export type NamedMapping = Partial<Record<FieldKey, string>>;

export type CampaignType = "messages_whatsapp" | "profile_visits" | "local_actions" | "other";

export type NormalizedRow = {
  level: "ad" | "ad_group" | "campaign";
  object_key: string;
  date: string;
  campaign_name: string;
  campaign_type: CampaignType;
  adset_name: string | null;
  ad_name: string | null;
  spend: number;
  impressions: number;
  reach: number | null;
  clicks: number;
  results: number | null;
  result_indicator: string | null;
  profile_visits: number | null;
  ig_follows: number | null;
  all_conversions: number | null;
  local_actions: number | null;
  directions: number | null;
  calls: number | null;
  website_clicks: number | null;
  other_interactions: number | null;
};

export type RowError = { line: number; message: string };

export type NormalizeResult = {
  records: NormalizedRow[];
  errors: RowError[];
  /** Linhas em branco ou de totais, ignoradas sem erro. */
  skipped: number;
  /** Linhas de dados lidas (válidas + com erro). */
  rowsRead: number;
  periodStart: string | null;
  periodEnd: string | null;
};
