if (!document.hasRun) {
    // add listener only once!
    console.log('onMessage listener added');
    chrome.runtime.onMessage.addListener(messageListener);
    document.hasRun = true;
}

// function that waits for events from background extension worker
function messageListener(request, sender, sendResponse) {
    try {
        var data = request.data;

        console.log('incoming command: ' + data.cmd);

        switch (data.cmd) {
            case 'login':
                var signInLink = $('.signInLink');
                createMouseEvent(signInLink, "click");

                var loginForm = $('.loginForm');
                var loginPassword = loginForm.find("#login_password");
                loginPassword.val(data.password);

                var loginUsername = loginForm.find("*[type='email']");
                loginUsername.val(data.username);

                var loginButton = loginForm.find("*[type='submit']");
                createMouseEvent(loginButton, "click");
                break;

            case 'fetch_title_if_thumb_up':
                var trackInfo = $('#trackInfo');
                var innerInfo = trackInfo.find('.info');
                var trackData = innerInfo.find('.trackData');
                var thumbUpButton = $('.thumbUpButton');

                var topnav = $('#topnav');
                var textWithArrow = topnav.find('.textWithArrow');
                                
                var mainContent = $('#mainContent');
                var stationSlides = mainContent.find('.stationSlides:visible');
                var songImage = stationSlides.find('.art[src]');

                data.station = textWithArrow.find('p').text();
                data.songTitle = trackData.find('.songTitle').text();
                data.artist = trackData.find('.artistSummary').text();
                data.album = trackData.find('.albumTitle').text();
                data.isThumbUp = thumbUpButton.hasClass('indicator');
                data.imageUrl = songImage.attr('src');

                console.log('station: ' + data.station);
                console.log('songtitle: ' + data.songTitle);
                console.log('artist: ' + data.artist);
                console.log('album: ' + data.album);
                console.log('isThumbUp: ' + data.isThumbUp);
                console.log('image: ' + data.imageUrl);

                document.title = data.isThumbUp ? "UP" : "not set";

                break;
        }
    }
    catch (err) {
        console.log('500 error' + err.message);
        data.error_code = 500;
        data.error_message = err.message;
    }

    sendResponse({ data: data });
}

function createMouseEvent(elem, eventName) {
    var mEvent = document.createEvent("MouseEvent");
    mEvent.initMouseEvent(eventName, true, true, window, 0,
        0, 0, 0, 0,
        false, false, false, false,
        0, null);

    elem[0].dispatchEvent(mEvent);
}