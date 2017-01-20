const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const ipcMain = electron.ipcMain;

// this object - "window.__container" - is injected into the JS environment
// the JS env can pass messages up to the nodeJS container via the single "send" method
window.__container = {
	send : function(evt, data) {
		ipcRenderer.send(evt, data);
	}
};

// we now listen for IPC events and hand them off to the web app

// register the node container with the JS env (containee)
ipcRenderer.on('register-container', function(evt) {
	window.__registerContainer('OSX');
});

// relay an event to the JS env (containee)
ipcRenderer.on('on-info', function(evt, inf) {
	if (typeof window.__containee !== 'undefined' && typeof window.__containee.on === 'function' ) {
        window.__containee.on("on-info", inf);
	} else {
		console.log("Error relaying event to containee")
	}
});

// relay some data to the JS env (containee)
ipcRenderer.on('on-update', function(evt, data) {
	if (typeof window.__containee !== 'undefined' && typeof window.__containee.onUpdate === 'function' ) {
        window.__containee.onUpdate(data);
	} else {
		console.log("Error relaying data to containee")
	}
});

// relay an error to the JS env (containee)
ipcRenderer.on('on-error', function(evt, err) {
	if (typeof window.__containee !== 'undefined' && typeof window.__containee.onError === 'function' ) {
        window.__containee.onError(err);
	} else {
		console.log("Error relaying error to containee")
	}
});
