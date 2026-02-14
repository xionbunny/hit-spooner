import { IHitProject, IHitSearchFilter, IHitAssignment } from "@hit-spooner/api";
import { debounce } from "lodash";
import { create } from "zustand";
import {
  darkTheme,
  lightTheme,
  pinkTheme,
  greenTheme,
  purpleTheme,
  steelTheme,
  newsTheme,
  blueTheme,
} from "../../styles/themes";
import { fetchDashboardData, fetchHITProjects, announceHitCaught, SoundType } from "../../utils";
import { useIndexedDb, loadHits as loadHitsFromDb } from "../useIndexedDb";
import { IHitSpoonerStoreState } from "./IHitSpoonerStoreState";
import { LocalStorageKeys } from "./LocalStorageKeys";

const MTURK_FETCH_DEBOUNCE_TIME = 80;
const QUEUE_REFRESH_INTERVAL = 2000;

const defaultHitFilters: IHitSearchFilter = {
  qualified: true,
  masters: false,
  minReward: "0.01",
  sort: "updated_desc",
  pageSize: "50",
  currentPage: 1,
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
  blue: blueTheme,
  pink: pinkTheme,
  green: greenTheme,
  purple: purpleTheme,
  steel: steelTheme,
  news: newsTheme,
};

const safeParseInt = (value: string | null, defaultValue: number): number => {
  const parsed = parseInt(value || "");
  return isNaN(parsed) ? defaultValue : parsed;
};

export const useStore = create<IHitSpoonerStoreState>((set, get) => {
  const { addOrUpdateHit, addOrUpdateHits, loadHitsByPage, deleteHitFromIndexedDb } =
    useIndexedDb();
  let hitsIntervalRef: ReturnType<typeof setInterval> | null = null;
  let autoAcceptIntervalRef: ReturnType<typeof setInterval> | null = null;
  let dashboardIntervalRef: ReturnType<typeof setInterval> | null = null;
  let queueIntervalRef: ReturnType<typeof setInterval> | null = null;

  const clearIntervals = () => {
    if (hitsIntervalRef) clearInterval(hitsIntervalRef);
    if (autoAcceptIntervalRef) clearInterval(autoAcceptIntervalRef);
    if (dashboardIntervalRef) clearInterval(dashboardIntervalRef);
    if (queueIntervalRef) clearInterval(queueIntervalRef);
  };

  const debouncedAcceptHit = debounce(async (hit: IHitProject) => {
    if (get().paused) return;

    try {
      const response = await fetch(
        `${hit.accept_project_task_url}&format=json`,
        { credentials: "include" }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data?.state === "Assigned") {
        if (get().config.soundEnabled) {
          announceHitCaught(get().config.soundType as SoundType);
        }
        hit.unavailable = true;
        await addOrUpdateHit(hit);
        get().removeHitFromAccept(hit.hit_set_id);
      }
    } catch (error) {
      console.error("[debouncedAcceptHit] Error:", error);
    }
  }, MTURK_FETCH_DEBOUNCE_TIME);

  return {
    hits: {
      data: null,
      loading: true,
      error: null,
      currentPage: 1,
      total: 0,
    },
    dashboard: {
      data: null,
      loading: true,
      error: null,
    },
    queue: [],
    loadingQueue: false,
    blockedRequesters: JSON.parse(
      localStorage.getItem(LocalStorageKeys.BlockedRequesters) || "[]"
    ),
    favoriteRequesters: JSON.parse(
      localStorage.getItem(LocalStorageKeys.FavoriteRequesters) || "[]"
    ),
    filters: JSON.parse(
      localStorage.getItem(LocalStorageKeys.HitSearchFilters) ??
        JSON.stringify(defaultHitFilters)
    ),
    paused: false,
    hitsToAccept: [],

    config: {
      theme: localStorage.getItem(LocalStorageKeys.Theme) || "light",
      themes,
      setTheme: (newTheme) => {
        localStorage.setItem(LocalStorageKeys.Theme, newTheme);
        chrome.storage.sync.set({ theme: newTheme });
        set((state) => ({
          config: { ...state.config, theme: newTheme },
        }));
      },
      workspacePanelSizes: JSON.parse(
        localStorage.getItem(LocalStorageKeys.WorkspacePanelSizes) || "[0.3, 0.7]"
      ),
      setWorkspacePanelSizes: debounce((sizes: number[]) => {
        localStorage.setItem(LocalStorageKeys.WorkspacePanelSizes, JSON.stringify(sizes));
        set((state) => ({
          config: { ...state.config, workspacePanelSizes: sizes },
        }));
      }, 100),

      workspaceListSizes: JSON.parse(
        localStorage.getItem(LocalStorageKeys.WorkspaceListSizes) || "[0.5, 0.5]"
      ),
      setWorkspaceListSizes: debounce((sizes: number[]) => {
        localStorage.setItem(LocalStorageKeys.WorkspaceListSizes, JSON.stringify(sizes));
        set((state) => ({
          config: { ...state.config, workspaceListSizes: sizes },
        }));
      }, 100),

      hitTaskViewPanelSizes: JSON.parse(
        localStorage.getItem(LocalStorageKeys.TaskViewPanelSizes) || "[0.8, 0.2]"
      ),
      setHitTaskViewPanelSizes: debounce((sizes: number[]) => {
        localStorage.setItem(LocalStorageKeys.TaskViewPanelSizes, JSON.stringify(sizes));
        set((state) => ({
          config: { ...state.config, hitTaskViewPanelSizes: sizes },
        }));
      }, 100),

      workspaceAvailableColumns: safeParseInt(
        localStorage.getItem(LocalStorageKeys.WorkspaceAvailableColumns),
        3
      ),
      setWorkspaceAvailableColumns: (columns: number) => {
        localStorage.setItem(LocalStorageKeys.WorkspaceAvailableColumns, columns.toString());
        set((state) => ({
          config: { ...state.config, workspaceAvailableColumns: columns },
        }));
      },

      workspaceUnavailableColumns: safeParseInt(
        localStorage.getItem(LocalStorageKeys.WorkspaceUnavailableColumns),
        3
      ),
      setWorkspaceUnavailableColumns: (columns: number) => {
        localStorage.setItem(LocalStorageKeys.WorkspaceUnavailableColumns, columns.toString());
        set((state) => ({
          config: { ...state.config, workspaceUnavailableColumns: columns },
        }));
      },

      requesterModalColumns: safeParseInt(
        localStorage.getItem(LocalStorageKeys.RequesterModalColumns),
        3
      ),
      setRequesterModalColumns: (columns: number) => {
        localStorage.setItem(LocalStorageKeys.RequesterModalColumns, columns.toString());
        set((state) => ({
          config: { ...state.config, requesterModalColumns: columns },
        }));
      },

      updateInterval: safeParseInt(
        localStorage.getItem(LocalStorageKeys.UpdateInterval),
        1200
      ),
      setUpdateInterval: (interval: number) => {
        localStorage.setItem(LocalStorageKeys.UpdateInterval, interval.toString());
        set((state) => ({
          config: { ...state.config, updateInterval: interval },
        }));
        clearIntervals();
        get().startUpdateIntervals();
      },

      soundEnabled: localStorage.getItem(LocalStorageKeys.SoundEnabled) !== "false",
      setSoundEnabled: (enabled: boolean) => {
        localStorage.setItem(LocalStorageKeys.SoundEnabled, String(enabled));
        set((state) => ({
          config: { ...state.config, soundEnabled: enabled },
        }));
      },

      soundType: localStorage.getItem(LocalStorageKeys.SoundType) || "chime",
      setSoundType: (soundType: string) => {
        localStorage.setItem(LocalStorageKeys.SoundType, soundType);
        set((state) => ({
          config: { ...state.config, soundType: soundType },
        }));
      },
    },

    setFilters: (newFilters: IHitSearchFilter) => {
      set({ filters: newFilters });
      localStorage.setItem(
        LocalStorageKeys.HitSearchFilters,
        JSON.stringify(newFilters)
      );
    },

    blockRequester: (requesterId: string) => {
      set((state) => {
        const updatedBlockedRequesters = [
          ...state.blockedRequesters,
          requesterId,
        ];
        localStorage.setItem(
          LocalStorageKeys.BlockedRequesters,
          JSON.stringify(updatedBlockedRequesters)
        );
        return { blockedRequesters: updatedBlockedRequesters };
      });
    },

    toggleFavoriteRequester: (requesterId: string, requesterName: string) => {
      set((state) => {
        const isAlreadyFavorite = state.favoriteRequesters.some(
          (r) => r.id === requesterId
        );

        let updatedFavorites;
        if (isAlreadyFavorite) {
          updatedFavorites = state.favoriteRequesters.filter(
            (r) => r.id !== requesterId
          );
        } else {
          updatedFavorites = [
            ...state.favoriteRequesters,
            { id: requesterId, name: requesterName },
          ];
        }

        localStorage.setItem(
          LocalStorageKeys.FavoriteRequesters,
          JSON.stringify(updatedFavorites)
        );

        return { favoriteRequesters: updatedFavorites };
      });
    },

    togglePause: () => {
      set((state) => ({
        paused: !state.paused,
      }));
    },

    fetchAndUpdateHits: debounce(async (page = 1) => {
      if (get().paused) return;

      const filters = get().filters;
      const pageSize = filters.pageSize ? parseInt(filters.pageSize) : 50;

      set((state) => ({
        hits: { ...state.hits, loading: true },
      }));

      try {
        const fetchedHits = await fetchHITProjects(filters);
        const fetchedHitIds = new Set(fetchedHits.map((h) => h.hit_set_id));
        
        const allCachedHits = await loadHitsFromDb(filters);
        
        for (const cachedHit of allCachedHits) {
          if (!fetchedHitIds.has(cachedHit.hit_set_id) && !cachedHit.unavailable) {
            cachedHit.unavailable = true;
            await addOrUpdateHit(cachedHit);
          }
        }
        
        if (fetchedHits.length > 0) {
          await addOrUpdateHits(fetchedHits);
        }

        const [newHits, totalHits] = await loadHitsByPage(
          page,
          pageSize,
          filters
        );
        
        const blockedRequesters = get().blockedRequesters;

        const filteredNewHits = newHits.filter(
          (hit: IHitProject) => !blockedRequesters.includes(hit.requester_id)
        );

        const existingHits = get().hits.data || [];
        const updatedHits =
          page === 1 ? filteredNewHits : [...existingHits, ...filteredNewHits];

        set({
          hits: {
            data: updatedHits,
            loading: false,
            error: null,
            pageSize: filters.pageSize ? parseInt(filters.pageSize) : 50,
            currentPage: page,
            total: totalHits,
          },
        });
      } catch (error) {
        set({
          hits: {
            data: null,
            loading: false,
            pageSize: 0,
            currentPage: 0,
            total: 0,
            error: "Failed to fetch HITs",
          },
        });
      }
    }, MTURK_FETCH_DEBOUNCE_TIME),

    setHitsPage: async (page: number) => {
      const state = get();
      const { pageSize } = state.hits;
      const filters = state.filters;

      set({ hits: { ...state.hits, loading: true, currentPage: page } });

      try {
        const [paginatedHits, totalHits] = await loadHitsByPage(
          page,
          pageSize ?? 50,
          filters
        );
        set({
          hits: {
            ...state.hits,
            data: paginatedHits,
            loading: false,
            total: totalHits,
          },
        });
      } catch (error) {
        set({
          hits: { ...state.hits, loading: false, error: "Failed to load page" },
        });
      }
    },

    fetchAndUpdateHitsQueue: debounce(async () => {
      const state = get();
      const previousQueueLength = state.queue.length;
      set({ loadingQueue: true });

      try {
        const response = await fetch("https://worker.mturk.com/tasks/?format=json", {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch queue data.");

        const data = await response.json();
        const newQueue = data.tasks || [];

        if (newQueue.length > previousQueueLength && state.config.soundEnabled) {
          announceHitCaught(state.config.soundType as SoundType);
        }

        set({ queue: newQueue, loadingQueue: false });
      } catch (error) {
        console.error("Error fetching queue data:", error);
        set({ loadingQueue: false });
      }
    }, MTURK_FETCH_DEBOUNCE_TIME),

    fetchAndUpdateDashboard: debounce(async () => {
      set((state) => ({
        dashboard: { ...state.dashboard, loading: true },
      }));

      try {
        const dashboardData = await fetchDashboardData();
        set({
          dashboard: { data: dashboardData, loading: false, error: null },
        });
      } catch (error) {
        set({
          dashboard: {
            data: null,
            loading: false,
            error: "Failed to fetch dashboard data",
          },
        });
      }
    }, MTURK_FETCH_DEBOUNCE_TIME),

    addOrUpdateHit: debounce(async (hit: IHitProject) => {
      if (get().paused) return;

      const hits = get().hits.data || [];
      const updatedHits = hits.map((h) =>
        h.hit_set_id === hit.hit_set_id ? hit : h
      );

      set({
        hits: { data: updatedHits, loading: false, error: null },
      });

      await addOrUpdateHit(hit);
    }, MTURK_FETCH_DEBOUNCE_TIME),

    addHitToAccept: debounce((hit: IHitProject) => {
      if (get().paused) return;

      set((state) => {
        const existing = state.hitsToAccept.find(
          (h) => h.hit_set_id === hit.hit_set_id
        );
        if (!existing) {
          return {
            hitsToAccept: [...state.hitsToAccept, hit],
          };
        }
        return state;
      });
    }, MTURK_FETCH_DEBOUNCE_TIME),

    removeHitFromAccept: debounce((hit_set_id: string) => {
      set((state) => ({
        hitsToAccept: state.hitsToAccept.filter(
          (h) => h.hit_set_id !== hit_set_id
        ),
      }));
    }, MTURK_FETCH_DEBOUNCE_TIME),

    handleAutomaticAcceptance: debounce(async () => {
      const state = get();
      if (state.paused) return;

      const hitsToAccept = state.hitsToAccept;
      if (hitsToAccept.length === 0) return;

      const hitToProcess = hitsToAccept[0];
      const { hit_set_id, accept_project_task_url } = hitToProcess;

      const currentHit = state.hits.data?.find((h) => h.hit_set_id === hit_set_id);
      if (!currentHit?.scoop) {
        get().removeHitFromAccept(hit_set_id);
        return;
      }

      const rotateQueue = () => {
        const rotated = [...hitsToAccept.slice(1), hitToProcess];
        set({ hitsToAccept: rotated });
      };

      try {
        const response = await fetch(`${accept_project_task_url}&format=json`, {
          credentials: "include",
        });

        const data = await response.json().catch(() => null);

        if (data?.state === "Assigned") {
          if (state.config.soundEnabled && currentHit) {
            announceHitCaught(state.config.soundType as SoundType);
          }
          
          if (currentHit.scoop === "scoop") {
            get().removeHitFromAccept(hit_set_id);
            currentHit.scoop = undefined;
            currentHit.unavailable = true;
            await addOrUpdateHit(currentHit);
          } else if (currentHit.scoop === "shovel") {
            currentHit.unavailable = true;
            await addOrUpdateHit(currentHit);
            rotateQueue();
          } else {
            get().removeHitFromAccept(hit_set_id);
          }
        } else {
          rotateQueue();
        }
      } catch (error) {
        rotateQueue();
      }
    }, MTURK_FETCH_DEBOUNCE_TIME),

    acceptHit: (hit: IHitProject) => {
      debouncedAcceptHit(hit);
      return Promise.resolve();
    },

    deleteHit: async (hitId: string) => {
      set((state) => ({
        hits: {
          ...state.hits,
          data:
            state.hits.data?.filter((hit) => hit.hit_set_id !== hitId) || [],
        },
      }));

      await deleteHitFromIndexedDb(hitId);
    },

    returnHit: async (assignment: IHitAssignment) => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "RETURN_HIT",
          payload: {
            hitSetId: assignment.project.hit_set_id,
            taskId: assignment.task_id,
            assignmentId: assignment.assignment_id,
          },
        });

        if (response?.success) {
          set((state) => ({
            queue: state.queue.filter((a) => a.assignment_id !== assignment.assignment_id),
          }));
        } else {
          console.error("[HitSpooner] Return HIT failed:", response?.error);
        }
      } catch (error) {
        console.error("[HitSpooner] Return HIT error:", error);
      }
    },

    startUpdateIntervals: () => {
      clearIntervals();

      const state = get();
      const interval = state.config.updateInterval;

      hitsIntervalRef = setInterval(() => {
        if (!get().paused) {
          state.fetchAndUpdateHits();
        }
      }, interval);

      autoAcceptIntervalRef = setInterval(() => {
        if (!get().paused) {
          state.handleAutomaticAcceptance();
        }
      }, interval);

      dashboardIntervalRef = setInterval(() => {
        state.fetchAndUpdateDashboard();
      }, interval * 6);

      queueIntervalRef = setInterval(state.fetchAndUpdateHitsQueue, QUEUE_REFRESH_INTERVAL);
    },
  };
});
