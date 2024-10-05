document.addEventListener('DOMContentLoaded', function () {
    const maxTabsInput = document.getElementById('maxTabs');
    const tabList = document.getElementById('tabList');
    const closedTabList = document.getElementById('closedTabList');
    
    // Function to truncate the title if it exceeds the specified length
    function truncateTitle(title, maxLength) {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    }

    // Function to format time into hours, minutes, and seconds for countdown
    function formatTimeRemaining(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours}h ${minutes}m ${seconds}s`;
    }

    // Function to update the tab list with countdown timers or status (Active/Pinned)
    function updateTabsWithTimers() {
        chrome.tabs.query({}, (tabs) => {
            chrome.storage.local.get(['tabTimers', 'pinnedTabs'], (data) => {
                const pinnedTabs = data.pinnedTabs || {};
                const tabTimers = data.tabTimers || {};

                tabList.innerHTML = ''; // Clear the tab list

                tabs.forEach(tab => {
                    const li = document.createElement('li');
                    li.classList.add('tab-card');
                    const maxTitleLength = 30;
                    const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

                    const isChromeInternal = tab.url.startsWith('chrome://') || !tab.favIconUrl;
                    const iconUrl = isChromeInternal ? 'icons/chromeIcon.webp' : tab.favIconUrl;

                    const timerElement = document.createElement('span');
                    timerElement.classList.add('timer');

                    // Check if tab is active or pinned
                    if (tab.active) {
                        timerElement.innerHTML = 'Active';  // Show "Active" for the active tab
                    } else if (pinnedTabs[tab.id]) {
                        timerElement.innerHTML = 'Pinned';  // Show "Pinned" for pinned tabs
                    } else if (tabTimers[tab.id] && tabTimers[tab.id] > 0) {
                        let timeLeft = tabTimers[tab.id]; // Time left in ms

                        timerElement.innerHTML = formatTimeRemaining(timeLeft);

                        // Update the timer every second
                        const intervalId = setInterval(() => {
                            timeLeft -= 1000; // Decrement by 1 second (1000 ms)
                            if (timeLeft <= 0) {
                                clearInterval(intervalId); // Stop interval when time runs out
                                timerElement.innerHTML = 'Closing Soon';
                            } else {
                                timerElement.innerHTML = formatTimeRemaining(timeLeft); // Update the display
                            }
                        }, 1000);
                    } else {
                        timerElement.innerHTML = 'Closing Soon';  // Show when no time is left
                    }

                    li.innerHTML = `
                        <input type="checkbox" class="pin-checkbox" ${pinnedTabs[tab.id] ? 'checked' : ''} data-tab-id="${tab.id}">
                        <img src="${iconUrl}" alt="Tab Icon" class="tab-icon">
                        <span class="tab-title">${truncatedTitle}</span>
                    `;
                    li.appendChild(timerElement); // Add the status (Active, Pinned, or countdown timer)
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
                                console.log(`Tab ${tabId} pinned state updated: ${isPinned}`);
                            });
                        });
                    });
                });
            });
        });
    }

    // Initial load of tabs and timers
    updateTabsWithTimers();

    // Load recently closed tabs from storage
    chrome.storage.local.get({ closedTabs: [] }, (data) => {
        const closedTabs = data.closedTabs;
        const sortedClosedTabs = closedTabs.sort((a, b) => b.timeClosed - a.timeClosed);

        sortedClosedTabs.forEach(tab => {
            const li = document.createElement('li');
            li.classList.add('tab-card');
            const maxTitleLength = 36;
            const truncatedTitle = truncateTitle(tab.title, maxTitleLength);

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
