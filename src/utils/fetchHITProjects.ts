import { IHitProject, IHitSearchFilter } from "@hit-spooner/api";

const FETCH_TIMEOUT_MS = 15000;
const PAGE_DELAY_MS = 50;

const fetchWithTimeout = async (url: string, timeout: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const fetchHITProjects = async (
  filters: IHitSearchFilter
): Promise<IHitProject[]> => {
  let allHITs: IHitProject[] = [];
  let pageNumber = 1;
  const pageSize = filters.pageSize || "50";
  const maxPages = 10;

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    while (pageNumber <= maxPages) {
      const params = new URLSearchParams({
        "filters[qualified]": filters.qualified ? "true" : "false",
        "filters[masters]": filters.masters ? "true" : "false",
        "filters[min_reward]": filters.minReward || "0",
        "filters[page_size]": pageSize,
        page_number: pageNumber.toString(),
        sort: filters.sort,
        format: "json",
      });

      const baseUrl = "https://worker.mturk.com/?";
      const url = `${baseUrl}${params.toString()}`;

      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[HitSpooner] Rate limited, waiting before retry...");
          await delay(2000);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.results || !Array.isArray(data.results)) {
        break;
      }

      allHITs = allHITs.concat(data.results);

      if (data.results.length < parseInt(pageSize)) {
        break;
      }

      pageNumber += 1;
      await delay(PAGE_DELAY_MS);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[HitSpooner] Fetch timeout");
    } else {
      console.error("[HitSpooner] Error fetching HITs:", error);
    }
    throw error;
  }

  return allHITs;
};
