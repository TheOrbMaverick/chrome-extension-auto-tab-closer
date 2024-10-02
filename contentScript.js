// contentScript.js
function showToast(tabTitle) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `Tab "${tabTitle}" will close in 10 seconds.`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);  // Remove after 5 seconds
}

// Listen for messages from background.js to display toast
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'show-toast') {
        showToast(request.tabTitle);
    }
});
