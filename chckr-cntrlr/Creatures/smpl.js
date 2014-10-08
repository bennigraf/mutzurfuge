var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Smpl;

function Smpl(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Smpl.prototype.oscMessage = function(m) {
	if(m[0] == 11) {
		
	}
	if(m[0] == 19) {
		this.die();
	}
}

// use me if htis shall die by external trigger
Smpl.prototype.die = function() {
	this.diedAt = this.m.age;
	this.amp.tween({
		from: {s: 1},
		to: {s: 0},
		duration: 393
	});
}

Smpl.prototype.spawn = function() {
	this.amp = new Twn();
	this.amp.set({s: 1});
	
}

Smpl.prototype.tick = function() {
	
	// die after a while
	if(this.m.age > 399 && this.diedAt == 0) {
		var dyingprop = (this.m.age - 399) / 233;
		if(Math.random() < dyingprop) {
			this.die();
		}
	}
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	// this.m.head = [Math.round(newTile[0]), Math.round(newTile[1])];
	
	
	////// draw stuff from here
	this.m.renderTiles = { };
	var white = new Colr({r: 255, g: 255, b: 255, a: 0});
	
	
	
	
};

// This sets a "renderTile if possible" (that means if it's a valid renderTile)
// callback is being called only on success
Smpl.prototype.rTip = function(tilestr, val, cb) {
	if(this.m.worldMap[tilestr]) {
		this.m.renderTiles[tilestr] = val;
		if(cb) { cb(tilestr); }
	}
}
// give back the string value for a vector in the form of "x.y" rounded to integers
Smpl.prototype.vtos = function(vector) {
	return vector.toArray().map(Math.round).join(".");
}