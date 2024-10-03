document.addEventListener('DOMContentLoaded', function () {
    const inactivityLimitInput = document.getElementById('inactivityLimit');
    const maxTabsInput = document.getElementById('maxTabs');
    const tabList = document.getElementById('tabList');
    const closedTabList = document.getElementById('closedTabList');

    // Function to truncate the title if it exceeds the specified length
    function truncateTitle(title, maxLength) {
        if (title.length > maxLength) {
            return title.substring(0, maxLength) + '...'; // Truncate and add ellipsis
        }
        return title;
    }

    // Function to format the closed date and time
    function formatClosedTime(timestamp) {
        const date = new Date(timestamp);
        
        // Get the day of the week (e.g., "Tue")
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Get the time (e.g., "10:30 PM")
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return `Closed: ${day} at ${time}`;
    }

    // Load user settings from storage
    chrome.storage.local.get(['userSettings'], (data) => {
        const { inactivityLimit, maxTabs } = data.userSettings;

        // Convert ms to minutes and round to avoid floating-point issues
        inactivityLimitInput.value = Math.round(inactivityLimit / 60000);  
        maxTabsInput.value = maxTabs;
    });

    // Load open tabs and display them with checkboxes and timers
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            const li = document.createElement('li');
            li.classList.add('tab-card');
            const maxTitleLength = 30; // Specify the maximum length for the title
            const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

            // Handle internal chrome pages or missing favIconUrl with a fallback icon
            const isChromeInternal = tab.url.startsWith('chrome://') || !tab.favIconUrl;
            const iconUrl = isChromeInternal ? 'icons/chromeIcon.webp' : tab.favIconUrl;

            li.innerHTML = `
                <input type="checkbox" class="pin-checkbox" ${tab.pinned ? 'checked' : ''} data-tab-id="${tab.id}">
                <img src="${iconUrl}" alt="Tab Icon" class="tab-icon">
                <span class="tab-title">${truncatedTitle}</span>
                <span class="timer" data-tab-id="${tab.id}">10s</span>
            `;
            tabList.appendChild(li);
        });

        // Add event listeners to pin/unpin checkboxes
        document.querySelectorAll('.pin-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const tabId = Number(event.target.dataset.tabId);
                const isPinned = event.target.checked;
                chrome.runtime.sendMessage({
                    action: 'togglePin',
                    tabId: tabId,
                    isPinned: isPinned
                });
            });
        });
    });

    // Save user settings when they change
    inactivityLimitInput.addEventListener('input', () => {
        const inactivityLimit = inactivityLimitInput.value * 60000;  // Convert minutes to ms
        saveUserSettings({ inactivityLimit });
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

        // Sort the closed tabs in descending order of timeClosed (most recent first)
        const sortedClosedTabs = closedTabs.sort((a, b) => b.timeClosed - a.timeClosed);

        // Display each closed tab in the sorted order
        sortedClosedTabs.forEach(tab => {
            const li = document.createElement('li');
            li.classList.add('tab-card');
            const maxTitleLength = 36; // Specify the maximum length for the title
            const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

            // Handle internal chrome pages or missing favIconUrl with a fallback icon
            const isChromeInternal = tab.url.startsWith('chrome://') || !tab.favIconUrl;
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
