# Pancopy
Pancopy is a node.js app that does the following:
- starts a new instance of google chrome with a custom chrome extension (code in the chrome_extension subfolder)
- automatically navigates to pandora.com and logs you in with Jquery, using the pandora account details specified in the main node.js app file
- initiates a websocket connection between the chrome extension and the nodeJs app

Every time the user hits thumbUp, the chrome extension intercepts the audio stream and makes it available to the node.js app using the websocket. The song is then downloaded to a local folder