var osc = require('node-osc');
var oscCli = new osc.Client('127.0.0.1', 5000);

var Creature = require('./creature.js');


// a grid 'plays out' part of the world via ip/port
// defines scope on which to act
function Grid(id, w, h, offsetx, offsety) {
	this.oscSndr = null;
	this.id = id;
	this.width = w;
	this.height = h;
	this.offsetx = offsetx;
	this.offsety = offsety;
}
Grid.prototype.setAddress = function(addr, port) {
	this.oscSndr = new osc.Client(addr, port);
}
Grid.prototype.hasTile = function(x, y) {
	if(x >= this.offsetx && x < this.offsetx+this.width
		&& y >= this.offsety && y < this.offsety+this.height) {
		return true;
	}
	return false;
}
Grid.prototype.setTile = function(x, y, r, g, b) {
	var ln = 0.000000001;
	// console.log(this.oscSndr);
	if(this.oscSndr) {
		this.oscSndr.send('/grid', x-this.offsetx, y-this.offsety, r+ln, g+ln, b+ln); // ln makes sure floats are being sent
	}
}



function World(w, h) {
	this.width = w;
	this.height = h;
	
	this.oscServer = new osc.Server(12332, '0.0.0.0');
	
	this.creatures = new Array();
	
	this.tiles = new Array();
	this.clearTiles();
	
	this.grids = new Array();
	this.grids.push(new Grid(213, 24, 16, 0, 0));
	this.grids.push(new Grid(2, 24, 36, 0, 16));
	this.grids.push(new Grid(3, 24, 16, 0, 52));
	this.grids[0].setAddress("127.0.0.1", 5000);
	this.grids[1].setAddress("10.0.0.2", 5000);
	this.grids[2].setAddress("10.0.0.3", 5000);
	
}
World.prototype.clearTiles = function() {
	this.tiles = new Array();
	for (var i=0; i < this.width; i++) {
		this.tiles[i] = new Array();
		for (var j=0; j < this.height; j++) {
			this.tiles[i][j] = {
				settled: false,
				age: 0,
				x: i,
				y: j
			}
		};
	};
}
World.prototype.setTile = function(x, y, r, g, b) {
	var ln = 0.000000001;
	for (var i=0; i < this.grids.length; i++) {
		if(this.grids[i].hasTile(x, y)) {
			this.grids[i].setTile(x, y, r, g, b);
		}
	};
}
World.prototype.tick = function() {
	var toDie = new Array();
	for (var i = 0; i < this.creatures.length; i++) {
		this.creatures[i].tick();
		if(!this.creatures[i].alive) {
			toDie.push(i);
		}
	}
	// reverse to not mess up indizes before deletion
	// (assumes that the values of toDie are sorted ascending)
	// to be sure, sort first, see http://de.selfhtml.org/javascript/objekte/array.htm#sort
	var numsort = function (a, b) { return a - b; };
	if(toDie.length > 0) {
		toDie.sort(numsort);
		for (var i = toDie.length - 1; i >= 0; i--) {
			var creatureIndex = toDie[i];
			this.creatures.splice(creatureIndex, 1);
		}
	}
}
World.prototype.findGridCoords = function(boardid, xpos, ypos) {
	var spwncrds = {found: false, x: 0, y: 0, grid: null};
	for (var i = 0; i < this.grids.length; i++) {
		var g = this.grids[i];
		if(g.id == boardid) {
			spwncrds.found = true;
			spwncrds.x = Math.round(g.width * xpos) + g.offsetx;
			spwncrds.y = Math.round(g.height * ypos) + g.offsety;
			return [spwncrds.x, spwncrds.y];
		}
	}
	return false;
}
World.prototype.run = function() {
	/*
	setInterval(function() {
		console.log("running");
		this.crtr = new Creature(this);
		this.crtr.spawn(4, 4);
		this.interval = setInterval(function() {
			this.crtr.tick();
		}.bind(this), 68);
		setTimeout(function() {
			console.log("clearing");
			clearInterval(this.interval);
			this.clearTiles();
		}.bind(this), 8500);
	}.bind(this), 9000);
	*/
	
	this.oscServer.on("message", function (msg, rinfo) {
		console.log("got message", msg)
		// dirty hack because oF needs to send bundles for some stupid reason...
		if(msg[0] == '#bundle') {
			msg = msg[2];
		}
		if(msg[0] == '/hit') {
			boardid = msg[1] || 0;
			xpos = msg[2] || 0.5;
			ypos = msg[3] || 0.5;
			console.log("hit!", boardid, xpos, ypos);
			var c = new Creature(this);
			var spwnCoords = this.findGridCoords(boardid, xpos, ypos);
			if(spwnCoords) {
				c.spawn(spwnCoords[0], spwnCoords[1]);
				this.creatures.push(c);
			} else {
				console.log("couldn't find spawn point for creature");
			}
		}
	}.bind(this));
	
	
	this.interval = setInterval(function() {
		this.tick();
	}.bind(this), 68);
	
}
// World.prototype.stop = function() {
// 	clearInterval(this.interval);
// 	this.clearTiles();
// }

var wrld = new World(24, 68);
wrld.run();









