chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-selector') return;
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) return;
  // The shortcut counts as a user gesture, so we can bring up the side panel that shows the results.
  chrome.sidePanel?.open?.({tabId: tab.id}).catch(() => {});
  chrome.tabs.sendMessage(tab.id, {type: 'toggle'}).catch(() => {});
});

// The content script cannot take screenshots itself; it asks us for a PNG of the visible tab.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'capture' || !sender.tab) return false;
  chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'})
    .then((url) => sendResponse({url}))
    .catch((error) => sendResponse({error: String(error?.message || error)}));
  return true;
});

// Open the side panel when the toolbar icon is clicked (Chrome). Firefox uses sidebar_action instead.
if (chrome.sidePanel?.setPanelBehavior) chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch(() => {});
else if (chrome.sidebarAction?.toggle) chrome.action.onClicked.addListener(() => chrome.sidebarAction.toggle());
