'use strict';

var app  = require('electron').app;
var fs   = require('fs');
var path = require('path');

// path to user data file
var dataFilePath = path.join(app.getPath('userData'), 'data.json'); 

// parsed storage data
var data = null;

// load settings from file
function load() {
	if (data !== null) {
		return;
	}
	if (!fs.existsSync(dataFilePath)) {
		data = {};
	} else {
		data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8')); 
	}
}

// save settings to file
function save() {
	fs.writeFileSync(dataFilePath, JSON.stringify(data)); 
}

// TODO somewhat real/better encryption
function encrypt(val) {
	return (new Buffer(val)).toString('base64');
}

// TODO somewhat real/better encryption
function decrypt(val) {
	return new Buffer(val, 'base64').toString('utf-8');
}

// the public storage API
module.exports = {
	load: load,
    save: save,
    set: function (key, value) {
		load();
		data[key] = value; 
		save();
	},
    setEncrypted: function (key, value) {
		load();
		data[key] = encrypt(value); 
		save();
	},
	get: function (key, defaultVal) { 
		load();
		var value = null;
		if (key in data) {
			value = data[key];
		} else if (typeof defaultVal !== 'undefined') {
			value = defaultVal;
		}
		return value;
	},
	getDecrypted: function (key) { 
		load();
		var value = null;
		if (key in data) {
			value = decrypt(data[key]);
		}
		return value;
	},
	unset: function (key) { 
		load();
		if (key in data) {
			delete data[key];
			save();
		} 
	}
};