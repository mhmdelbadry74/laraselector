chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-selector') return;
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (tab?.id) chrome.tabs.sendMessage(tab.id, {type: 'toggle'}).catch(() => {});
});

// The content script cannot take screenshots itself; it asks us for a PNG of the visible tab.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'capture' || !sender.tab) return false;
  chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'})
    .then((url) => sendResponse({url}))
    .catch((error) => sendResponse({error: String(error?.message || error)}));
  return true;
});
