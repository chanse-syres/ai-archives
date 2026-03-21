console.log('popup.js is loaded');

var port = chrome.runtime.connect({ name: 'popupToBackground' });
console.log('Port established:', port);

function initApp() {
  document.getElementById('sharePublic').addEventListener('click', sharePublic);
  console.log('initApp');
}

function sharePublic() {
  console.log('sharePublic function called');
  document.querySelector('#sharePublicLoader').style.display = 'flex';
  document.querySelector('#sharePublic').style.display = 'none';
  scrape();
  setTimeout(() => {
    document.querySelector('#sharePublicLoader').style.display = 'none';
    document.querySelector('#sharePublic').style.display = 'flex';
  }, 10000);
}

//ADDED on 03/21 for better error handling in popup
function resetShareButton() {
  document.querySelector('#sharePublicLoader').style.display = 'none';
  document.querySelector('#sharePublic').style.display = 'flex';
}

function isSupportedUrl(url) {
  return (
    url &&
    (url.startsWith('https://chatgpt.com/') ||
      url.startsWith('https://chat.openai.com/') ||
      url.startsWith('https://bard.google.com/') ||
      url.startsWith('https://gemini.google.com/') ||
      url.startsWith('https://www.meta.ai/') ||
      url.startsWith('https://claude.ai/'))
  );
}

function handleMessageResult(action) {
  return function (_) {
    console.log(`sendMessage ${action} done`);
    if (chrome.runtime.lastError) {
      console.log(`${action}: ${chrome.runtime.lastError.message}`);
      if (action === 'scrape') {
        alert('Refresh the supported AI chat tab, then try Share Public again.');
      }
      resetShareButton();
      return;
    }
  };
}
// ADDED on 03/21 for better error handling in popup - used in sendMessage callbacks below END

const scrape = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    //chrome.tabs.sendMessage(tabs[0]?.id, { action: 'scrape' }, function (_) { // COMMENTED OUT on 03/20 for better error handling in popup - replaced with handleMessageResult callback
      //console.log('sendData scrape Done');
      //if (chrome.runtime.lastError) {
      //console.error(chrome.runtime.lastError.message);
      //document.querySelector('#sharePublicLoader').style.display = 'none';
      //document.querySelector('#sharePublic').style.display = 'flex';
      //}
    //}); COMMENTED OUT on 03/20 for better error handling in popup - replaced with handleMessageResult callback END
    chrome.tabs.sendMessage(tabs[0]?.id, { action: 'scrape' }, handleMessageResult('scrape'));
  });
};

chrome.tabs.query({ active: true, currentWindow: true, url: 'https://bard.google.com/*' }, (tabs) => {
  if (tabs?.length) {
    //chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Bard' }, function (_) {
      //console.log('is Bard');
    //});
    chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Bard' }, handleMessageResult('model Bard'));
  }
});
chrome.tabs.query({ active: true, currentWindow: true, url: 'https://www.meta.ai/*' }, (tabs) => {
  if (tabs?.length) {
    //chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Meta' }, function (_) {
      //console.log('is Meta');
    //});
    chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Meta' }, handleMessageResult('model Meta'));
  }
});
chrome.tabs.query({ active: true, currentWindow: true, url: 'https://claude.ai/*' }, (tabs) => {
  if (tabs?.length) {
    //chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Claude' }, function (_) {
      //console.log('is Claude');
    //});
    chrome.tabs.sendMessage(tabs[0].id, { action: 'model', model: 'Claude' }, handleMessageResult('model Claude'));
  }
});

window.onload = initApp;
