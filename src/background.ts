chrome.runtime.onInstalled.addListener(() => {
  console.log("HitSpooner extension installed");
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
  return new Promise((resolve, reject) => {
    const updatedListener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === "complete") {
        cleanup();
        resolve(tab);
      }
    };

    const removedListener = (tabId: number) => {
      if (tabId === tab.id) {
        cleanup();
        reject(new Error("Mturk tab was closed before it finished loading"));
      }
    };

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(updatedListener);
      chrome.tabs.onRemoved.removeListener(removedListener);
    };

    chrome.tabs.onUpdated.addListener(updatedListener);
    chrome.tabs.onRemoved.addListener(removedListener);
  });
};

const executeReturnHit = async (
  tabId: number,
  hitSetId: string,
  taskId: string,
  assignmentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Executing return hit script on tab:", tabId);
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (hitSetId: string, taskId: string, assignmentId: string) => {
        try {
          const getCsrfToken = (): string | null => {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            return metaTag?.getAttribute('content') || null;
          };

          const csrfToken = getCsrfToken();
          if (!csrfToken) {
            return JSON.stringify({
              success: false,
              status: 403,
              error: 'CSRF token not found',
              url: 'N/A'
            });
          }

          const returnUrl = `https://worker.mturk.com/projects/${hitSetId}/tasks/${taskId}?assignment_id=${assignmentId}&ref=w_wp_rtrn_top`;
          
          const allButtons = document.querySelectorAll('button');
          let returnButton: HTMLButtonElement | null = null;
          
          for (let i = 0; i < allButtons.length; i++) {
            const button = allButtons[i];
            const buttonText = button.textContent || button.innerText || '';
            if (buttonText.trim().toLowerCase().includes('return')) {
              returnButton = button as HTMLButtonElement;
              break;
            }
          }

          if (returnButton) {
            returnButton.click();
            return JSON.stringify({
              success: true,
              status: 200,
              url: returnUrl
            });
          }

          const returnForm = document.querySelector('form[action*="return"]') || 
                            document.querySelector('form[method="post"]');
          
          if (returnForm) {
            (returnForm as HTMLFormElement).submit();
            return JSON.stringify({
              success: true,
              status: 200,
              url: returnUrl
            });
          }

          window.location.href = returnUrl;
          return JSON.stringify({
            success: true,
            status: 200,
            url: returnUrl
          });
          
        } catch (error) {
          return JSON.stringify({
            success: false,
            status: 500,
            error: `Network error: ${String(error)}`,
            url: 'N/A'
          });
        }
      },
      args: [hitSetId, taskId, assignmentId],
    });

    if (!result || !Array.isArray(result) || result.length === 0) {
      return { success: false, error: 'No result from script - empty result array' };
    }

    if (!result[0].result) {
      return { success: false, error: 'Script returned no data' };
    }

    const parsedResult = JSON.parse(result[0].result || '{}');
    
    if (parsedResult.success) {
      return { success: true };
    } else {
      const errorMessage = parsedResult.error || (parsedResult.status ? `HTTP ${parsedResult.status}` : 'Unknown error');
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error("Error executing return hit script:", error);
    return { success: false, error: `Script execution failed: ${String(error)}` };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RETURN_HIT") {
    (async () => {
      let createdTabId: number | null = null;

      try {
        console.log("Processing RETURN_HIT request:", message.payload);
        let tab = await getMturkTab();
        if (!tab?.id) {
          tab = await createMturkTab();
          createdTabId = tab.id!;
        }

        const { hitSetId, taskId, assignmentId } = message.payload;
        const response = await executeReturnHit(tab.id!, hitSetId, taskId, assignmentId);
        console.log("Return HIT response:", response);

        if (createdTabId) {
          try {
            await chrome.tabs.remove(createdTabId);
          } catch {
          }
        }

        sendResponse(response);
      } catch (error) {
        console.error("Error processing RETURN_HIT message:", error);
        if (createdTabId) {
          try {
            await chrome.tabs.remove(createdTabId);
          } catch {
          }
        }

        sendResponse({ success: false, error: String(error) });
      }
    })();
    return true;
  }
});