document.addEventListener('DOMContentLoaded', function () {
    const inactivityLimitInput = document.getElementById('inactivityLimit');
    const maxTabsInput = document.getElementById('maxTabs');
    const tabList = document.getElementById('tabList');
    const closedTabList = document.getElementById('closedTabList');

    // Load user settings from storage
    chrome.storage.local.get(['userSettings'], (data) => {
        const { inactivityLimit, maxTabs } = data.userSettings;
        inactivityLimitInput.value = inactivityLimit / 1000;  // Convert ms to seconds
        maxTabsInput.value = maxTabs;
    });

    // Load open tabs and display them with checkboxes and timers
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" class="pin-checkbox" ${tab.pinned ? 'checked' : ''} data-tab-id="${tab.id}">
                <span>${tab.title}</span>
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
        const inactivityLimit = inactivityLimitInput.value * 1000;  // Convert seconds to ms
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
            li.innerHTML = `
                <a href="${tab.url}" target="_blank">${tab.title}</a>
                <span>Closed at: ${new Date(tab.timeClosed).toLocaleString()}</span>
            `;
            closedTabList.appendChild(li);
        });
    });
});



// let notifications = document.querySelector('.notifications')

// function createNewToast() {
//     let newToast = document.createElement('div')
//     newToast.innerHTML = `
//         <div class="notifications">
//             <div class="toast">
//                 <i class="fa-brands fa-chrome"></i>
//                 <div class="content">
//                     <div class="title">Inactive Tab</div>
//                     <span>Closing inactive tab</span>
//                 </div>
//                 <i class="fa-solid fa-xmark"></i>
//             </div>
//         </div>`;
//     notifications.appendChild(newToast);
//     newToast.timeOut = setTimeout(
//         () => newToast.remove(), 10000
//     )
// }
