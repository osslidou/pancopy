console.log('Extracting startup arguments from the user-agent :' + navigator.userAgent);

var args = navigator.userAgent.split("|");
var apiUrl = args[1];
console.log('apiUrl=' + apiUrl);

var pancopyTabId;
var submittedUrls = [];

setupSocketClient(apiUrl);

function setupSocketClient(apiUrl) {
    console.log('Initializing websocket client ...');

    var socket = io.connect(apiUrl);

    socket.on('cmd_ack', function (data) {
        console.log('-- ', data.cmd, ' ACK\n');
    });

    // on socket receive handler...
    socket.on('cmd', function (data) {
        console.log('cmd: ' + data.cmd);

        // runs all actions in the current window / tab
        chrome.tabs.query({ active: true }, function (tabs) {

            tab = tabs[0]; // only work with the first tab
            if (tab === undefined) {
                console.log('--' + data.cmd + ' error');
                data.error_code = 501;
                data.error_message = 'ERROR: Unable to find the active tab';
                socket.emit('cmd_ack', data);
                return;
            }

            switch (data.cmd) {
                case "login":
                    runCommandInChrome(tab, data);
                    pancopyTabId = tab.id; /* store tabId to be reused in stream watcher code */
                    break;
            }
        });
    });

    function runCommandInChrome(tab, data) {
        function tabUpdatedListener(tabId, changeInfo, tab) {
            console.log('--status=' + changeInfo.status + ' url=' + tab.url);
            if (changeInfo.status == 'complete' && tab.url !== 'about:blank') { /* timing issue where about:blank will be 'complete' before socket connection occurs before the about:blank tab is created*/

                // sends login info
                sendMessageIntoCurrentPage(tabId, data, function (response) {

                    if (response.data.error_code)
                        console.log('error response received from page: ' + response.error_message);

                    else {
                        // login worked, un-hook
                        socket.emit('cmd_ack', data);
                        console.log('--' + data.cmd + ' done');
                        chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
                    }
                });
            }
        }

        // page load completion watcher
        chrome.tabs.onUpdated.addListener(tabUpdatedListener);

        chrome.tabs.update(tab.id, { url: data.url });
    }

    // watch for audio streams
    chrome.webRequest.onHeadersReceived.addListener(function (details) {
        var headers = details.responseHeaders;

        headers.forEach(function (header, i) {
            if (header.name.toLowerCase() == 'content-type' && header.value.toLowerCase() == 'audio/mpeg') {
                console.log('audio stream: ' + details.url);

                if (submittedUrls.indexOf(details.url) === -1) {
                    submittedUrls.push(details.url);

                    handleIncomingMp3Url(socket, details.url);
                }
            }
        }
        );
    },
    // Request filter
        { urls: ["<all_urls>"] },
        ["blocking", "responseHeaders"]
    );
}

function handleIncomingMp3Url(socket, url) {
    // not already downloaded
    var data = {};
    data.cmd = 'fetch_title_if_thumb_up';

    // delay fetching song info for 5sec, to give it enough time
    setTimeout(function () {

        sendMessageIntoCurrentPage(pancopyTabId, data, function (response) {
            var data = response.data;

            if (data.isThumbUp)
                sendUrlForDownload(socket, url, data);

            else {
                // wait another 2mins, in case it becomes a thumb up!
                setTimeout(function () {

                    sendMessageIntoCurrentPage(pancopyTabId, data, function (response2) {
                        var data2 = response2.data;

                        if (data2.isThumbUp && (data.songTitle === data2.songTitle))
                            sendUrlForDownload(socket, url, data2);
                    });
                }, 120000);
            }
        });
    }, 5000);
}

function sendUrlForDownload(socket, url, trackInfo) {
    console.log('... still the same file!');
    var socketData = {};
    socketData.cmd = 'downloadFile';
    socketData.track = trackInfo;
    socketData.url = url;
    socket.emit('cmd', socketData);
}

// fix user agent (remove startup args)
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (info) {
        // Replace the User-Agent header
        var headers = info.requestHeaders;
        headers.forEach(function (header, i) {
            if (header.name.toLowerCase() == 'user-agent') {
                header.value = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
            }
        });
        return { requestHeaders: headers };
    },
    // Request filter
{ urls: ["<all_urls>"] },
["blocking", "requestHeaders"]
);

// sends dependencies (jquery + page script - and then the message to the page
function sendMessageIntoCurrentPage(tabId, data, callback) {
    chrome.tabs.executeScript(tabId, { file: "jquery-2.1.4.min.js" }, function () {
        chrome.tabs.executeScript(tabId, { file: "page.js" }, function () {
            chrome.tabs.sendMessage(tabId, { data: data }, function (response) {
                callback(response);
            });
        });
    });
}