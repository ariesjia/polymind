import axios from "axios";
import type { PolyEvent } from "../types";

const BASE_URL = "/api/polymarket";

const arrayParamsSerializer = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

export interface GetEventsOptions {
  order?: string;
  ascending?: boolean;
}

export const getEvents = async (
  limit = 50,
  offset = 0,
  options?: GetEventsOptions
): Promise<PolyEvent[]> => {
  const res = await axios.get(`${BASE_URL}/events/pagination`, {
    params: {
      limit,
      active: true,
      archived: false,
      closed: false,
      order: options?.order ?? "startDate",
      ascending: options?.ascending ?? false,
      offset,
      exclude_tag_id: [100639, 102169],
    },
    paramsSerializer: arrayParamsSerializer,
  });
  return res.data?.data || [];
};

export const getEventBySlug = async (
  slug: string
): Promise<PolyEvent | null> => {
  try {
    const res = await axios.get(`${BASE_URL}/events`, {
      params: { slug },
    });
    return res.data ?? null;
  } catch {
    return null;
  }
};

export const searchEvents = async (
  query: string,
  limit = 10
): Promise<PolyEvent[]> => {
  if (!query.trim()) return [];
  const res = await axios.get(`${BASE_URL}/events/pagination`, {
    params: {
      limit,
      active: true,
      archived: false,
      closed: false,
      order: "startDate",
      ascending: false,
      title: query,
    },
    paramsSerializer: arrayParamsSerializer,
  });
  return res.data?.data || [];
};
