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
                            });
                        });
                    });
                });