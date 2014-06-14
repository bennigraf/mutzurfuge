var osc = require('node-osc');
var twn = require('shifty');

var Colr = require("tinycolor2");



module.exports = Grid;

// a grid 'plays out' part of the world via ip/port
// defines scope on which to act
function Grid(id, w, h, offsetx, offsety) {
	this.oscSndr = null;
	this.id = id;
	this.width = w;
	this.height = h;
	this.offsetx = offsetx;
	this.offsety = offsety;
	
	this.tiles = [];
	this.setupTiles();
	
	this.marker = this.makeMarkerFromId();
	
	this.transitions = []; // a transition is ['direction', boardid]
	this._transitionsBySide = { 'top': false, 'left': false, 'bottom': false, 'right': false};
	// console.log(this.marker);
	// console.log(twn);
	this.v = 0.3;
	
	// this.tweenable = new twn();
	//     this.tweenable.tween({
	//       from:     1.3,
	//       to:       6.3,
	//       duration: 1000
	//     });
}
Grid.prototype.setupTiles = function() {
	for (var x = 0; x < this.width; x++) {
		this.tiles[x] = [];
		for (var y = 0; y < this.height; y++) {
			this.tiles[x][y] = new Colr("FFFFFF");
		}
	}
}
// borrowed from https://github.com/bhollis/aruco-marker/blob/master/aruco-marker.js
// description of marker codes: http://iplimage.com/blog/create-markers-aruco/
Grid.prototype.makeMarkerFromId = function() {
	var ids = [16, 23, 9, 14];
	var index, val, x, y;
	var marker = [[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0]];

	for (y = 0; y < 5; y++) {
		index = (this.id >> 2 * (4 - y)) & 3;
		val = ids[index];
		for (x = 0; x < 5; x++) {
			if ((val >> (4 - x)) & 1) {
				marker[y][x] = 1;
			} else {
				marker[y][x] = 0;
			}
		}
	}
	return marker;
}
Grid.prototype.setAddress = function(addr, port) {
	this.oscSndr = new osc.Client(addr, port);
}
Grid.prototype.setGravity = function(g) {
	this.gravity = g; // 'up', 'down', 'left', 'right'
}
Grid.prototype.addTransition = function(side, id) {
	this.transitions.push([side, id]);
	this.updateTransitionsMeta();
}
// sets _transitionsBySide from transitions for speed improvement
Grid.prototype.updateTransitionsMeta = function() {
	this._transitionsBySide = { 'top': false, 'left': false, 'bottom': false, 'right': false};
	for (var i = 0; i < this.transitions.length; i++) {
		this._transitionsBySide[this.transitions[i][0]] = this.transitions[i][1];
	}
}
// checks if tile is in range by local coords
Grid.prototype.hasTile = function(coords) {
	var x = coords[0];
	var y = coords[1];
	if(x >= 0 && x < this.width
		&& y >= 0 && y < this.height) {
		return true;
	}
	return false;
}
// gets the next neighbour in a certain direction
Grid.prototype.getNeighbour = function(coords) {
	// TODO: What happens on diagonal jumps? Are they even possible?? Or are they automatically ignored...?
	// get direction first
	var dir;
	if(coords[1] < 0) {
		dir = 'top';
	} else if (coords[1] > this.height-1) {
		dir = 'bottom';
	} else if (coords[0] < 0) {
		dir = 'left';
	} else if (coords[0] > this.width-1) {
		dir = 'right';
	}
	return [this._transitionsBySide[dir], dir];
}

Grid.prototype.setTile = function(pos, col) {
	this.tiles[pos[0]][pos[1]] = col;
}
Grid.prototype.sendData = function() {
	var ln = 0.000000001; // this makes sure it's always floats
	// change the format later, for now I send an osc cmd for each tile, this is a lot of overhead...
	// maybe check for changed tiles? Or send whole plane in one set? Or send hex string per tile?
	// console.log(this.marker);
	for (var y = 0; y < 7; y++) {
		for (var x = 0; x < 7; x++) {
			// console.log(x, y);
			if(x == 0 || y == 0 || x == 6 || y == 6) {
				this.tiles[x+1][y+1] = new Colr("000000");
			} else {
				if(this.marker[y-1][x-1] == 1) {
					this.tiles[x+1][y+1] = new Colr("FFFFFF");
				} else {
					this.tiles[x+1][y+1] = new Colr("000000");
				}
			}
		}
	}
	
	// clear
	// this.oscSndr.send('/grid', 'clear');
	
	// buffer all values first
	var values = [];
	for (var y = 0; y < this.height; y++) {
		for (var x = 0; x < this.width; x++) {
			var tc = this.tiles[x][y];
			if(this.oscSndr) {
				var rgb = tc.toRgb();
				values.push(rgb.r/255+ln);// ln makes sure floats are being sent
				values.push(rgb.g/255+ln);
				values.push(rgb.b/255+ln);
			}
		}
	}
	// send in steps because osc has a limit in msg size (or udp?)
	for(var n = 0; n < this.height * this.width; n += 80) { // setting 80 tiles -> 240 color values, seems to be the max
		var msg = new osc.Message('/grid');
		msg.append("setMany"); // we're setting many tiles at once here...
		msg.append(n); // offset
		for(var i = 0; i < 240 && n*3+i < values.length; i++) {
			msg.append(values[n*3 + i]);
		}
		this.oscSndr.send(msg);
	}
}
/*
Grid.prototype.setTile = function(x, y, r, g, b) {
	var ln = 0.000000001;
	// console.log(this.oscSndr);
	if(this.oscSndr) {
		this.oscSndr.send('/grid', x-this.offsetx, y-this.offsety, r+ln, g+ln, b+ln); // ln makes sure floats are being sent
	}
}
*/