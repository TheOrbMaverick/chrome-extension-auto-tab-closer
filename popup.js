document.addEventListener('DOMContentLoaded', function () {
    const closedTabsList = document.getElementById('closedTabsList');
  
    chrome.storage.local.get({ closedTabs: [] }, (result) => {
      const closedTabs = result.closedTabs;
      closedTabs.forEach(tab => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = tab.url;
        link.target = '_blank';
        link.textContent = tab.title;
        li.appendChild(link);
        closedTabsList.appendChild(li);
      });
    });
});
