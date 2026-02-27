import axios from "axios";
import type { PolyEvent } from "../types";

const BASE_URL = "https://gamma-api.polymarket.com";

export const getEvents = async (
  limit = 50,
  offset = 0
): Promise<PolyEvent[]> => {
  const res = await axios.get(
    `${BASE_URL}/events/pagination`,
    {
      params: {
        limit,
        active: true,
        archived: false,
        closed: false,
        order: "startDate",
        ascending: false,
        offset,
        exclude_tag_id: [100639, 102169],
      },
      paramsSerializer: (params) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach((key) => {
          const value = params[key as keyof typeof params];
          if (Array.isArray(value)) {
            value.forEach((item) => {
              searchParams.append(key, String(item));
            });
          } else {
            searchParams.append(key, String(value));
          }
        });
        return searchParams.toString();
      },
    }
  );
  return res.data?.data || [];
};
