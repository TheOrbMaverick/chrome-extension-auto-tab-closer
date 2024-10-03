// Store for settings like inactivity time limit and maximum open tabs
let userSettings = {
    inactivityLimit: 10000,  // default to 10 seconds
    maxTabs: 4               // default to 4 tabs
};

// Store the last active timestamp and pinned status
let tabActivity = {};
let pinnedTabs = {};

// Event listener for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'togglePin') {
        const { tabId, isPinned } = message;
        togglePin(tabId, isPinned);
    }
});

// When the extension is installed or settings are updated
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated");
    
    // Set up the alarm to check inactive tabs every minute.
    chrome.alarms.create('inactiveTabs', { periodInMinutes: 1 });
    chrome.storage.local.set({ userSettings });

    // Set up the cleanup alarm for closed tabs older than 2 days
    chrome.alarms.create('cleanUpClosedTabs', { periodInMinutes: 1440 }); // 1440 minutes = 24 hours
});

// Update tab activity when a tab becomes active
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log(`Tab activated: ${activeInfo.tabId}`);
    tabActivity[activeInfo.tabId] = Date.now();
});

// Update tab activity when a tab is updated (reloaded, etc.)
chrome.tabs.onUpdated.addListener((tabId) => {
    console.log(`Tab updated: ${tabId}`);
    tabActivity[tabId] = Date.now();
});

// Listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(`Alarm triggered: ${alarm.name}`);
    
    if (alarm.name === 'inactiveTabs') {
        checkAndCloseInactiveTabs();
    }
    
    if (alarm.name === 'cleanUpClosedTabs') {
        cleanUpOldClosedTabs();
    }
});

// Function to check inactive tabs and close them
function checkAndCloseInactiveTabs() {
    const presentTime = Date.now();

    chrome.tabs.query({}, (tabs) => {
        chrome.storage.local.get(['userSettings'], (data) => {
            const { inactivityLimit, maxTabs } = data.userSettings;
            
            console.log(`Checking tabs: ${tabs.length} open, max allowed: ${maxTabs}`);
            
            if (tabs.length > maxTabs) {  // Only proceed if more than maxTabs are open
                // Filter out pinned tabs and sort by inactivity
                const sortedTabs = tabs.filter(tab => !pinnedTabs[tab.id])
                                       .sort((a, b) => (tabActivity[a.id] || 0) - (tabActivity[b.id] || 0));
                
                console.log("Sorted tabs by inactivity: ", sortedTabs.map(tab => tab.title));

                // Close extra tabs based on inactivity
                for (let i = 0; i < tabs.length - maxTabs; i++) {
                    const tab = sortedTabs[i];
                    if (tabActivity[tab.id] && presentTime - tabActivity[tab.id] > inactivityLimit) {
                        console.log(`Tab marked for closure: ${tab.title}`);
                        warnAndCloseTab(tab);
                    } else {
                        console.log(`Tab is still active: ${tab.title}`);
                    }
                }
            }
        });
    });
}

// Function to notify and close a tab
function warnAndCloseTab(tab) {
    console.log(`Warning tab: ${tab.title}`);

    // Show toast message in Chrome with tab title
    showNotification(tab.title);

    // Set a timeout to close the tab after the warning time
    setTimeout(() => closeTab(tab), 10000); // Assuming WARNING_TIME is 10 seconds
}

// Function to display a toast notification with the tab title
function showNotification(tabTitle) {
    const message = `Tab will close in 10 seconds.`;
    const notificationOptions = {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: `${tabTitle} Closing Soon`,
        message: message,
        requireInteraction: false  // Keeps the notification on the screen
    };

    chrome.notifications.create(notificationOptions, () => {
        console.log(`Notification created for: ${tabTitle}`);
    });
}

// Function to close a tab and save its details
function closeTab(tab) {
    console.log(`Closing tab: ${tab.title}`);
    
    chrome.storage.local.get({ closedTabs: [] }, (result) => {
        const closedTabs = result.closedTabs;
        
        // Add the closed tab's title, URL, and time closed
        closedTabs.push({
            title: tab.title,
            url: tab.url,
            timeClosed: Date.now()
        });

        // Save the updated closed tabs array
        chrome.storage.local.set({ closedTabs }, () => {
            console.log(`Closed tab saved: ${tab.title}`);
        });
    });

    // Close the tab
    chrome.tabs.remove(tab.id);
}

// Clean up old closed tabs (remove tabs older than 2 days)
function cleanUpOldClosedTabs() {
    chrome.storage.local.get({ closedTabs: [] }, (result) => {
        const closedTabs = result.closedTabs;
        const now = Date.now();
        
        // Filter out tabs older than 2 days
        const filteredTabs = closedTabs.filter(tab => now - tab.timeClosed < 2 * 24 * 60 * 60 * 1000);
        
        chrome.storage.local.set({ closedTabs: filteredTabs }, () => {
            console.log("Old closed tabs cleaned up");
        });
    });
}

// Toggle pin status of a tab
function togglePin(tabId, isPinned) {
    console.log(`Toggle pin: Tab ID = ${tabId}, Pinned = ${isPinned}`);
    pinnedTabs[tabId] = isPinned;
}
