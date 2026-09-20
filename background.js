chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    let messageToSend = null;

    if (request.type === "READ_REAL_TAB") {
        messageToSend = { type: "GET_REAL_TEXT" };
    }

    if (request.type === "READ_REAL_POLLS") {
        messageToSend = { type: "GET_REAL_POLLS" };
    }

    if (request.type === "READ_FD_TAB") {
        messageToSend = { type: "GET_FD_TEXT" };
    }

    if (request.type === "READ_FD_ML") {
        messageToSend = {
            type: "GET_FD_ML",
            teamName: request.teamName,
            teamNames: request.teamNames
        };
    }

    if (request.type === "READ_REAL_DOTD") {
        messageToSend = { type: "GET_REAL_DOTD" };
    }

    // If it's not a read request we care about, ignore it
    if (!messageToSend) return;

    const tabId = request.tabId;
    if (tabId === undefined || tabId === null) {
        sendResponse({ text: [], error: "Invalid tab ID" });
        return;
    }

    chrome.tabs.sendMessage(tabId, messageToSend, (response) => {

        if (chrome.runtime.lastError) {
            sendResponse({
                text: [],
                error: chrome.runtime.lastError.message
            });
            return;
        }

        const validText = Array.isArray(response?.text) || typeof response?.text === "string";
        if (!response || !validText) {
            sendResponse({
                text: [],
                error: "No response from content script"
            });
            return;
        }

        sendResponse({
            text: response.text,
            teamName: response.teamName || [],
            ufc: response.ufc || false,
            mTabs: response.mTabs || []
        });
    });

    return true; // keep message channel open
});
