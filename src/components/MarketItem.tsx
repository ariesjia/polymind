import { useState, useEffect } from "react";
import { DollarSign, ArrowDownUp, BookOpen, Loader2, Gift } from "lucide-react";
import type { Market, OrderBook, OrderBookEntry } from "../types";
import { safeJsonParse } from "../types";
import { getOrderBook } from "../api/clob";

interface MarketItemProps {
  market: Market;
  obOpenOverride?: boolean;
}

function formatMoney(val: number | string | undefined): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (!num || isNaN(num)) return "$0";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatSize(size: string): string {
  const num = parseFloat(size);
  if (isNaN(num)) return size;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function getMidpoint(ob: OrderBook): number | null {
  const bestBid = ob.bids[0] ? parseFloat(ob.bids[0].price) : null;
  const bestAsk = ob.asks[0] ? parseFloat(ob.asks[0].price) : null;
  if (bestBid !== null && bestAsk !== null) return (bestBid + bestAsk) / 2;
  if (bestBid !== null) return bestBid;
  if (bestAsk !== null) return bestAsk;
  return null;
}

function isInRewardRange(price: number, midpoint: number, maxSpreadCents: number): boolean {
  const spreadCents = Math.abs(price - midpoint) * 100;
  return spreadCents <= maxSpreadCents;
}

export default function MarketItem({ market, obOpenOverride }: MarketItemProps) {
  const outcomes = safeJsonParse<string>(market.outcomes);
  const outcomePrices = safeJsonParse<string>(market.outcomePrices);
  const tokenIds = safeJsonParse<string>(market.clobTokenIds);

  const price0 = parseFloat(outcomePrices[0] || "0");
  const price1 = parseFloat(outcomePrices[1] || "0");
  const pct0 = Math.round(price0 * 100);
  const pct1 = Math.round(price1 * 100);

  const [obYes, setObYes] = useState<OrderBook | null>(null);
  const [obNo, setObNo] = useState<OrderBook | null>(null);
  const [obLoading, setObLoading] = useState(false);
  const [obOpen, setObOpen] = useState(false);
  const [obSide, setObSide] = useState<0 | 1>(0);

  useEffect(() => {
    if (obOpenOverride !== undefined) setObOpen(obOpenOverride);
  }, [obOpenOverride]);

  const dailyRate = market.clobRewards?.[0]?.rewardsDailyRate ?? 0;
  const hasRewards = dailyRate > 0;
  const maxSpread = market.rewardsMaxSpread ?? 0;
  const minSize = market.rewardsMinSize ?? 0;

  useEffect(() => {
    if (!obOpen || obYes || !tokenIds[0]) return;
    setObLoading(true);
    const empty: OrderBook = { bids: [], asks: [] };
    Promise.all([
      getOrderBook(tokenIds[0]).catch(() => empty),
      tokenIds[1] ? getOrderBook(tokenIds[1]).catch(() => empty) : Promise.resolve(empty),
    ])
      .then(([yes, no]) => {
        setObYes(yes);
        setObNo(no);
      })
      .finally(() => setObLoading(false));
  }, [obOpen, obYes, tokenIds]);

  const activeOb = obSide === 0 ? obYes : obNo;
  const topBids = activeOb?.bids.slice(0, 5) || [];
  const topAsks = activeOb?.asks.slice(0, 5) || [];

  const midpoint = activeOb ? getMidpoint(activeOb) : null;

  const rewardBidMin = midpoint !== null && hasRewards ? midpoint - maxSpread / 100 : null;
  const rewardAskMax = midpoint !== null && hasRewards ? midpoint + maxSpread / 100 : null;

  const label0 = outcomes[0] || "Yes";
  const label1 = outcomes[1] || "No";

  function renderOBRow(entry: OrderBookEntry, type: "bid" | "ask", idx: number) {
    const p = parseFloat(entry.price);
    const inRange =
      hasRewards && midpoint !== null && isInRewardRange(p, midpoint, maxSpread);
    const colorCls = type === "bid" ? "text-emerald-400" : "text-rose-400";

    return (
      <tr
        key={idx}
        className={`border-t border-white/[0.03] ${inRange ? "bg-amber-500/[0.06]" : ""}`}
      >
        <td className={`py-1.5 font-mono font-medium ${colorCls}`}>
          {p.toFixed(2)}
          {inRange && (
            <Gift size={9} className="ml-1 inline text-amber-400/70" />
          )}
        </td>
        <td className="py-1.5 text-right text-zinc-400">
          {formatSize(entry.size)}
        </td>
        <td className="py-1.5 text-right text-zinc-500">
          ${(p * parseFloat(entry.size)).toFixed(0)}
        </td>
      </tr>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-zinc-200">
          {market.question}
        </p>
        {hasRewards && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            <Gift size={10} />
            ${dailyRate}/d
          </span>
        )}
      </div>

      {/* Probability bar */}
      <div className="relative h-7 overflow-hidden rounded-md">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500/25 transition-all duration-500"
          style={{ width: `${Math.max(pct0, 2)}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-rose-500/25 transition-all duration-500"
          style={{ width: `${Math.max(pct1, 2)}%` }}
        />
        <div className="relative flex h-full items-center justify-between px-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-zinc-300">{label0}</span>
            <span className="font-bold text-emerald-400">{pct0}%</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-rose-400">{pct1}%</span>
            <span className="font-medium text-zinc-300">{label1}</span>
          </span>
        </div>
      </div>

      {/* Reward eligible range */}
      {obOpen &&
        !obLoading &&
        hasRewards &&
        midpoint !== null &&
        rewardBidMin !== null &&
        rewardAskMax !== null && (
          <div className="mt-2 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-2">
            <div className="flex items-center gap-2 text-[11px]">
              <Gift size={12} className="shrink-0 text-amber-400" />
              <span className="font-semibold text-amber-300">
                挂单奖励 ${dailyRate}/天
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400">
                中间价{" "}
                <span className="font-mono font-medium text-zinc-300">
                  {midpoint.toFixed(3)}
                </span>
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400">
                ±{maxSpread}¢ 内有效
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400">
                最小{" "}
                <span className="font-medium text-zinc-300">
                  {minSize}
                </span>{" "}
                股
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[10px]">
              <span className="text-zinc-500">奖励区间:</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono font-medium text-emerald-400">
                Bid ≥ {Math.max(0, rewardBidMin).toFixed(2)}
              </span>
              <span className="text-zinc-600">—</span>
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono font-medium text-rose-400">
                Ask ≤ {Math.min(1, rewardAskMax).toFixed(2)}
              </span>
            </div>
          </div>
        )}

      {/* Stats row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/[0.04] pt-2.5 text-[11px] text-zinc-500">
        {market.volume && parseFloat(market.volume) > 0 && (
          <div className="flex items-center gap-1.5" title="Trading Volume">
            <DollarSign size={11} className="text-zinc-600" />
            <span>Vol {formatMoney(market.volume)}</span>
          </div>
        )}
        {(market.liquidityNum > 0 || parseFloat(market.liquidity) > 0) && (
          <div className="flex items-center gap-1.5" title="Liquidity">
            <ArrowDownUp size={11} className="text-zinc-600" />
            <span>
              Liq {formatMoney(market.liquidityNum || market.liquidity)}
            </span>
          </div>
        )}
        {market.spread != null && market.spread > 0 && (
          <div className="flex items-center gap-1.5" title="Spread">
            <span className="text-zinc-600">Spread</span>
            <span
              className={
                market.spread <= 0.02
                  ? "text-emerald-500/80"
                  : market.spread <= 0.05
                    ? "text-amber-500/80"
                    : "text-rose-500/80"
              }
            >
              {(market.spread * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {tokenIds[0] && (
          <button
            onClick={() => setObOpen(!obOpen)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1 font-medium text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
          >
            <BookOpen size={11} />
            {obOpen ? "Hide" : "Order Book"}
          </button>
        )}
      </div>

      {/* Order book mini-table */}
      {obOpen && (
        <div className="mt-2.5 rounded-lg border border-white/[0.04] bg-black/20 p-3">
          {/* Yes / No tab */}
          <div className="mb-3 flex items-center gap-1 rounded-md bg-white/[0.04] p-0.5">
            <button
              onClick={() => setObSide(0)}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                obSide === 0
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label0}
            </button>
            <button
              onClick={() => setObSide(1)}
              className={`flex-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                obSide === 1
                  ? "bg-rose-500/20 text-rose-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label1}
            </button>
          </div>

          {obLoading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
              <Loader2 size={12} className="animate-spin" />
              Loading order book...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Bids (Buy) */}
              <div>
                <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                  Buy (Bid)
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-zinc-600">
                      <th className="pb-1.5 text-left font-medium">Price</th>
                      <th className="pb-1.5 text-right font-medium">Size</th>
                      <th className="pb-1.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {topBids.length > 0 ? (
                      topBids.map((bid, i) => renderOBRow(bid, "bid", i))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-1.5 text-center text-zinc-600"
                        >
                          —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Asks (Sell) */}
              <div>
                <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-rose-500/70">
                  Sell (Ask)
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] text-zinc-600">
                      <th className="pb-1.5 text-left font-medium">Price</th>
                      <th className="pb-1.5 text-right font-medium">Size</th>
                      <th className="pb-1.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {topAsks.length > 0 ? (
                      topAsks.map((ask, i) => renderOBRow(ask, "ask", i))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-1.5 text-center text-zinc-600"
                        >
                          —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
