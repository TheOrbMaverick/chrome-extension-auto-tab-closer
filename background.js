// Constants: Define the time limit for inactivity and warning time before closure
const INACTIVITY_LIMIT = 10000; // 10 seconds
const WARNING_TIME = 10000; // 10 seconds

// Store the last active timestamp
let tabActivity = {}

// When the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set up the alarm Alarm to check inactive tabs every minute.
  chrome.alarms.create('inactiveTabs', {periodInMinutes: 1});
});

// Event listener triggered when the alarm goes off (every minute)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'inactiveTabs') {
        // Call function to close inactive tabs
        checkAndCloseInactiveTabs();
    }
});

// Update tab activity when a tab becomes active (e.g., user clicks on a tab)
chrome.tabs.onActivated.addListener((activeInfo) => {
    tabActivity[activeInfo.tabId] = Date.now();
});

// Update tab activity when a tab is updated (reloaded, URL changes, etc.)
chrome.tabs.onUpdated.addListener((tabId) => {
    tabActivity[tabId] = Date.now()
});

// Function to check inactive tabs and close them if inactive for too long
function checkAndCloseInactiveTabs() {
    const presentTime = Date.now();

    //Get all open tabs
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // If the tab has been inactive for longer than the INACTIVITY_LIMIT, warn and close it
            if (tabActivity[tab.id] && presentTime - tabActivity[tab.id] > INACTIVITY_LIMIT) {
                warnAndCloseTab(tab);
            }
        });
    });
}

// Function to notify the user before closing the tab and then close it after 10 seconds
function warnAndCloseTab(tab) {
    console.log("Warning triggered")
    // Notify the user that the tab will be closed in 10 seconds
    computerTabCloseNotifier()
  // Set a timeout to close the tab after the WARNING_TIME
  setTimeout(() => closeTab(tab), WARNING_TIME);
}

// Function to close a tab and save its details to local storage
function closeTab(tab) {
    console.log("Close tab triggered")
  chrome.storage.local.get({ closedTabs: [] }, (result) => {
    const closedTabs = result.closedTabs;
    
    // Add the closed tab's title, URL, and the time it was closed
    closedTabs.push({
      title: tab.title,
      url: tab.url,
      timeClosed: new Date().getTime()
    });

    // Save the updated closed tabs array to local storage
    chrome.storage.local.set({ closedTabs });
  });

  // Close the tab
  chrome.tabs.remove(tab.id);
}

// Clean up old closed tabs (remove tabs older than 2 days)
function cleanUpOldClosedTabs() {
    chrome.storage.local.get({ closedTabs: [] }, (result) => {
        const closedTabs = result.closedTabs;
        const now = new Date().getTime();
        
        // Filter out tabs older than 2 days (2 * 24 * 60 * 60 * 1000 milliseconds)
        const filteredTabs = closedTabs.filter(tab => now - tab.timeClosed < 2 * 24 * 60 * 60 * 1000);
        
        // Update storage with the filtered tabs
        chrome.storage.local.set({ closedTabs: filteredTabs });
    });
}

// Set an alarm to clean up closed tabs older than 2 days once a day
chrome.alarms.create('cleanUpClosedTabs', { periodInMinutes: 1440 }); // 1440 minutes = 24 hours
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanUpClosedTabs') {
        cleanUpOldClosedTabs();
    }
});


function computerTabCloseNotifier() {
    chrome.notifications.create(
        {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tab Closing Soon',
        message: `The will close in 10 seconds.`,
        requireInteraction: true // Keeps the notification on the screen
    });
}
