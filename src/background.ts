chrome.runtime.onInstalled.addListener(() => {
  console.log("HitSpooner Extension Installed");
});

const getMturkTab = async (): Promise<chrome.tabs.Tab | null> => {
  const tabs = await chrome.tabs.query({ url: "https://worker.mturk.com/*" });
  const validTab = tabs.find(
    (tab) => tab.url && !tab.url.includes("/hit-spooner")
  );
  return validTab || null;
};

const createMturkTab = async (): Promise<chrome.tabs.Tab> => {
  const tab = await chrome.tabs.create({
    url: "https://worker.mturk.com/tasks",
    active: false,
  });
  return new Promise((resolve) => {
    const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
};

const executeReturnHit = async (
  tabId: number,
  hitSetId: string,
  taskId: string,
  assignmentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (hitSetId: string, taskId: string, assignmentId: string) => {
        const getCsrfToken = (): string | null => {
          const metaTag = document.querySelector('meta[name="csrf-token"]');
          return metaTag?.getAttribute('content') || null;
        };

        const csrfToken = getCsrfToken();
        const returnUrl = `https://worker.mturk.com/projects/${hitSetId}/tasks/${taskId}?assignment_id=${assignmentId}&ref=w_wp_rtrn_top`;
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', returnUrl, false);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr.send(`_method=delete&authenticity_token=${encodeURIComponent(csrfToken || '')}`);
        
        return JSON.stringify({
          success: xhr.status >= 200 && xhr.status < 400,
          status: xhr.status,
          url: returnUrl
        });
      },
      args: [hitSetId, taskId, assignmentId],
    });

    console.log("[HitSpooner Background] executeScript result:", result);
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      return { success: false, error: 'No result from script - empty result array' };
    }
    
    const parsedResult = JSON.parse(result[0].result || '{}');
    return parsedResult.success 
      ? { success: true }
      : { success: false, error: `HTTP ${parsedResult.status}` };
  } catch (error) {
    console.error("[HitSpooner Background] executeScript error:", error);
    return { success: false, error: `Script execution failed: ${String(error)}` };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RETURN_HIT") {
    (async () => {
      let createdTabId: number | null = null;
      
      try {
        let tab = await getMturkTab();
        if (!tab?.id) {
          tab = await createMturkTab();
          createdTabId = tab.id!;
        }
        
        const { hitSetId, taskId, assignmentId } = message.payload;
        const response = await executeReturnHit(tab.id!, hitSetId, taskId, assignmentId);
        
        if (createdTabId) {
          try {
            await chrome.tabs.remove(createdTabId);
          } catch {
            // Tab already closed
          }
        }
        
        sendResponse(response);
      } catch (error) {
        console.error("[HitSpooner Background] Return HIT error:", error);
        
        if (createdTabId) {
          try {
            await chrome.tabs.remove(createdTabId);
          } catch {
            // Tab already closed
          }
        }
        
        sendResponse({ success: false, error: String(error) });
      }
    })();
    return true;
  }
});
