document.addEventListener('DOMContentLoaded', function () {
    const inactivityLimitInput = document.getElementById('inactivityLimit');
    const maxTabsInput = document.getElementById('maxTabs');
    const tabList = document.getElementById('tabList');
    const closedTabList = document.getElementById('closedTabList');

    // Function to set localized text
    function setLocalizedText() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const messageKey = element.getAttribute('data-i18n');
            element.innerText = chrome.i18n.getMessage(messageKey);
        });
    }

    setLocalizedText();

    // Listen for messages from background.js to update popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updatePopup') {
            updateTabsWithTimers();  // Call your UI update function
        }
    });
    
    // Function to truncate the title if it exceeds the specified length
    function truncateTitle(title, maxLength) {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    }

    // Function to format the closed date and time
    function formatClosedTime(timestamp) {
        const date = new Date(timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `Closed: ${day} at ${time}`;
    }

    // Function to format time into hours, minutes, and seconds for countdown
    function formatTimeRemaining(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Return a formatted string instead of modifying element inside this function
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    // Load user settings from storage
    chrome.storage.local.get(['userSettings'], (data) => {
        const { inactivityLimit, maxTabs } = data.userSettings;
        inactivityLimitInput.value = Math.round(inactivityLimit / 60000);  // Convert ms to minutes
        maxTabsInput.value = maxTabs;

        updateTabsWithTimers();  // Call to initialize the timers
    });

    // Function to update the tab list with countdown timers or status (Active/Pinned)
    function updateTabsWithTimers() {
        chrome.tabs.query({}, (tabs) => {
            chrome.storage.local.get(['tabTimers', 'pinnedTabs'], (data) => {
                const pinnedTabs = data.pinnedTabs || {};
                const tabTimers = data.tabTimers || {};

                tabList.innerHTML = '';  // Clear the tab list

                tabs.forEach(tab => {
                    const li = document.createElement('li');
                    li.classList.add('tab-card');
                    const maxTitleLength = 30;
                    const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

                    // Safeguard for internal Chrome URLs
                    const isChromeInternal = tab.url && tab.url.startsWith('chrome://') || !tab.favIconUrl;
                    const iconUrl = isChromeInternal ? 'icons/chromeIcon.webp' : tab.favIconUrl || 'icons/defaultIcon.png';

                    const timerElement = document.createElement('span');
                    timerElement.classList.add('timer');

                    // Check if tab is active or pinned
                    if (tab.active) {
                        timerElement.innerHTML = 'Active';  // Show "Active" for the active tab
                    } else if (pinnedTabs[tab.id]) {
                        timerElement.innerHTML = 'Pinned';  // Show "Pinned" for pinned tabs
                    } else if (tabTimers[tab.id] && tabTimers[tab.id] > 0) {
                        let timeLeft = tabTimers[tab.id]; // Time left in ms

                        // Properly use formatTimeRemaining to get a string
                        timerElement.innerHTML = formatTimeRemaining(timeLeft);

                        // Update the timer every second
                        const intervalId = setInterval(() => {
                            timeLeft -= 1000;  // Decrement by 1 second (1000 ms)
                            if (timeLeft <= 0) {
                                clearInterval(intervalId);  // Stop interval when time runs out
                                timerElement.innerHTML = 'Closing Soon';
                            } else {
                                timerElement.innerHTML = formatTimeRemaining(timeLeft);  // Update the display
                            }
                        }, 1000);
                    } else {
                        timerElement.innerHTML = ' ';  // Show when no time is left
                    }

                    li.innerHTML = `
                        <input type="checkbox" class="pin-checkbox" ${pinnedTabs[tab.id] ? 'checked' : ''} data-tab-id="${tab.id}">
                        <img src="${iconUrl}" alt="Tab Icon" class="tab-icon">
                        <span class="tab-title">${truncatedTitle}</span>
                    `;
                    li.appendChild(timerElement);  // Add the status (Active, Pinned, or countdown timer)
                    tabList.appendChild(li);
                });

                // Add event listeners to pin/unpin checkboxes
                document.querySelectorAll('.pin-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (event) => {
                        const tabId = Number(event.target.dataset.tabId);
                        const isPinned = event.target.checked;

                        // Save the pinned state in storage
                        chrome.storage.local.get(['pinnedTabs'], (data) => {
                            const pinnedTabs = data.pinnedTabs || {};
                            pinnedTabs[tabId] = isPinned;

                            chrome.storage.local.set({ pinnedTabs }, () => {

                                // Send a message to background.js to handle the pinning logic and update UI
                                chrome.runtime.sendMessage({ action: 'togglePin', tabId, isPinned });
                            });
                        });
                    });
                });
            });
        });
    }

    // Initial load of tabs and timers
    updateTabsWithTimers();

    // Save user settings when they change
    inactivityLimitInput.addEventListener('input', () => {
        const inactivityLimit = inactivityLimitInput.value * 60000;  // Convert minutes to ms
        saveUserSettings({ inactivityLimit });
        updateTabsWithTimers();  // Re-update the timers
    });

    maxTabsInput.addEventListener('input', () => {
        const maxTabs = maxTabsInput.value;
        saveUserSettings({ maxTabs });
    });

    function saveUserSettings(updates) {
        chrome.storage.local.get(['userSettings'], (data) => {
            const updatedSettings = { ...data.userSettings, ...updates };
            chrome.storage.local.set({ userSettings: updatedSettings });
        });
    }

    // Load recently closed tabs from storage
    chrome.storage.local.get({ closedTabs: [] }, (data) => {
        const closedTabs = data.closedTabs;
        const sortedClosedTabs = closedTabs.sort((a, b) => b.timeClosed - a.timeClosed);

        sortedClosedTabs.forEach(tab => {
            const li = document.createElement('li');
            li.classList.add('tab-card');
            const maxTitleLength = 36;
            const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

            const isChromeInternal = tab.url && (tab.url.startsWith('chrome://') || !tab.favIconUrl);
            const iconUrl = isChromeInternal ? 'icons/chromeIcon.webp' : tab.favIconUrl;

            li.innerHTML = `
                <img src="${iconUrl}" alt="Tab Icon" class="tab-icon">
                <a href="${tab.url}" target="_blank" class="tab-title">${truncatedTitle}</a>
                <span class="tab-info">${formatClosedTime(tab.timeClosed)}</span>
            `;
            closedTabList.appendChild(li);
        });
    });
});
