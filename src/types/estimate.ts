export type EstimateLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  /** Expert Mode: code- and safety-informed recommendation for this line. */
  proRecommendation: string;
  /** True when labor hours were auto-calculated; false when contractor explicitly stated hours. */
  isEstimated?: boolean;
};

export type EstimateResult = {
  lineItems: EstimateLineItem[];
  total: number;
  notes: string;
};
