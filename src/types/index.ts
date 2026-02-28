export interface Market {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string; // JSON string: ["Yes", "No"]
  outcomePrices: string; // JSON string: ["0.85", "0.15"]
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
  liquidityNum: number;
  bestBid: number;
  bestAsk: number;
  spread: number;
  orderMinSize: number;
  competitive: number;
  clobTokenIds: string; // JSON string: ["tokenId0", "tokenId1"]
  clobRewards: { id: string; rewardsDailyRate: number; startDate: string; endDate: string }[];
  rewardsMaxSpread: number; // max spread from midpoint in cents
  rewardsMinSize: number; // min order size in shares
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  description: string;
}

export interface OrderBookEntry {
  price: string;
  size: string;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface PolyEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  liquidity: number;
  volume: number;
  markets: Market[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  promptTemplate: string;
  tavilyApiKey: string;
}

export const DEFAULT_PROMPT_TEMPLATE = `<role>
你的任务是根据市场信息，对每个market进行分析，每个market有2个可选项，分析他们可能性
不要参考polymarket 或类似平台的赔率，只考虑从专业的知识以及新闻信息，政府材料中判断可能性
获取前周期的历史数据加以辅助分析，但是最重要的是考虑当下实时情况
需要告诉我最可能和最不可能的分组，并给出理由
用中文回复我
参考 event-rule 的规则，分析选项的可能性
</role>
<event>
\${event.title}
</event>
<event-rule>
\${event.description}
</event-rule>
<markets>
question|option1|option2
\${marketsText}
</markets>`;

export const DEFAULT_AI_CONFIG: AIConfig = {
  baseUrl: "https://api.openai.com/",
  apiKey: "",
  model: "gpt-5",
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  tavilyApiKey: "",
};

export interface AIHistoryEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  content: string;
  model: string;
  timestamp: number;
}

export function safeJsonParse<T>(json: string, fallback: T[] = []): T[] {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function buildPrompt(
  promptTemplate: string,
  event: PolyEvent,
  markets: Market[]
): string {
  const marketsText = (markets || [])
    .filter((market) => market.active === true && !market.closed)
    .map((market) => {
      const outcomes = safeJsonParse<string>(market.outcomes);
      return `${market.question}|${outcomes[0]}|${outcomes[1]}`;
    })
    .join("\n");

  let result = promptTemplate.replace(/\$\{marketsText\}/g, marketsText);

  result = result.replace(/\$\{event\.(\w+)\}/g, (_match, key: string) => {
    const value = event[key as keyof PolyEvent];
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });

  return result;
}
