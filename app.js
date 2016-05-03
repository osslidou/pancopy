// nodejs base
var os = require("os");
var fs = require("fs");
var util = require('util');
var path = require('path');
var url = require("url");
var childProcess = require('child_process');
var http = require('http');

// requires npm install
var express = require('express');
var uuid = require('node-uuid');
var bodyParser = require('body-parser');
var io = require('socket.io');

const BROWSER_PATH = "c:\\PROGRA~2\\Google\\Chrome\\Application\\chrome.exe";
const USERNAME = "pandoraLogin";
const PASSWORD = "pandoraPassword";
const SOCKET_PORT = 12045;

var browserUserDataFolder = process.env.TEMP + "\\google_data\\";

var sessionDataPath = browserUserDataFolder + 'pancopy';
var chromeExtensionPath = path.resolve(__dirname, 'chrome_extension');

if (fs.existsSync(sessionDataPath))
    rmdirSync(sessionDataPath);

var io = require('socket.io');
var server = io.listen(SOCKET_PORT);

server.on('error', function (err) {
    console.log('--  server.on(error): ' + err + '\n');
});

process.on('uncaughtException', function (err) {
    console.log('process.on(uncaughtException): ' + err + '\n');
});

server.on('connection', function (socket) {
    console.log('-- browser connected\n');

    var socketData = {};
    socketData.cmd = 'login';
    socketData.username = USERNAME;
    socketData.password = PASSWORD;
    socketData.url = 'http://www.pandora.com/';
    socket.emit('cmd', socketData);

    socket.on('error', function (err) {
        console.log('socket.on(error): ' + err + '\n');
    });
    
    socket.on('cmd', function (data) {
        switch (data.cmd) {
            case "downloadFile":

                var track = data.track;
                var filenameWithoutExtension = track.artist + " - " + track.songTitle;

                // escape invalid characters      / ? < > \ : * | "
                filenameWithoutExtension = filenameWithoutExtension.replace(/\/|\?|<|>|\\|:|\*|\||"/g, ' ');

                if (track.isThumbUp) {
                    console.log("↓ " + filenameWithoutExtension);

                    var folder = path.join('files', track.station);
                    ensureFolderExistsSync(folder);

                    downloadFileAsync(data.url, folder, filenameWithoutExtension + ".mp3");
                    
                    if (track.imageUrl)
                        downloadFileAsync(track.imageUrl, folder, filenameWithoutExtension + ".jpg");
                }
                break;
        }
    });

    socket.on('cmd_ack', function (socketData) {
        console.log('-- ', socketData.cmd, ' ACK\n');
    });
});


function downloadFileAsync(url, folder, filename) {
    var fileFullPath = path.join(folder, filename)
    var fileStream = fs.createWriteStream(fileFullPath);

    var request = http.get(url, function (response) {
        response.pipe(fileStream);
    }).on('error', function (e) {
        console.log('[ERROR] message: ' + e.message);
        console.log('[ERROR] filename: ' + filename);
        console.log('[ERROR] url: ' + url);
    });
}

var spawn = childProcess.spawn;
var baseUrl = 'http://localhost:' + SOCKET_PORT + '/';
var browser = spawn(BROWSER_PATH, ["--no-default-browser-check", "--no-first-run", "--test-type", "--ignore-certificate-errors", "--extensions-on-chrome-urls", "--disable-save-password-bubble",
    "--user-data-dir=" + sessionDataPath, "--load-extension=" + chromeExtensionPath,
    "--user-agent='Chrome 43.|" + baseUrl + "|Chrome 43.'", // hack: pass startup param in useragent for easy retrieval from the extension
    'about:blank']);

function rmdirSync(dir, file) {
    var p = file ? path.join(dir, file) : dir;

    if (fs.lstatSync(p).isDirectory()) {
        fs.readdirSync(p).forEach(rmdirSync.bind(null, p));
        fs.rmdirSync(p);
    }

    else fs.unlinkSync(p);
}

function ensureFolderExistsSync(localFolderPath) {
    var mkdirSync = function (basePath) {
        try {
            fs.mkdirSync(basePath);
        } catch (e) {
            if (e.code != 'EEXIST')
                throw e;
        }
    }

    var parts = localFolderPath.split(path.sep);
    for (var i = 1; i <= parts.length; i++) {
        var basePath = path.join.apply(null, parts.slice(0, i));
        mkdirSync(basePath);
    }
}