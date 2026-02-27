import axios from "axios";
import type { OrderBook } from "../types";

const BASE_URL = "https://clob.polymarket.com";

export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const res = await axios.get(`${BASE_URL}/book`, {
    params: { token_id: tokenId },
  });
  const bids: { price: string; size: string }[] = res.data?.bids || [];
  const asks: { price: string; size: string }[] = res.data?.asks || [];

  // bids: sort highest price first (best bid on top)
  bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  // asks: sort lowest price first (best ask on top)
  asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  return { bids, asks };
}
