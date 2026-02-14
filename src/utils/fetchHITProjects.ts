import { IHitProject, IHitSearchFilter } from "@hit-spooner/api";

/**
 * Fetches a list of HITs (Human Intelligence Tasks) from the MTurk API based on
 * the provided filters. Continues fetching subsequent pages until fewer than
 * `pageSize` HITs are returned or no HITs are found.
 *
 * @param {IHitSearchFilter} filters - The filters to apply to the HIT search.
 * @returns {Promise<IHitProject[]>} A promise that resolves to an array of HITs.
 */
export const fetchHITProjects = async (
  filters: IHitSearchFilter
): Promise<IHitProject[]> => {
  let allHITs: IHitProject[] = [];
  let pageNumber = 1;
  const pageSize = filters.pageSize || "50";

  const debounce = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    while (true) {
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

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      allHITs = allHITs.concat(data.results);

      if (data.results.length < parseInt(pageSize)) {
        break;
      }

      pageNumber += 1;
      await debounce(20);
    }
  } catch (error) {
    console.error("Error fetching HITs:", error);
    return [];
  }

  return allHITs;
};
