var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Snare01;

function Snare01(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Snare01.prototype.oscMessage = function(m) {
	if(m[0] == 11) {
		this.hit(m[1]);
		// console.log(m);
	}
	if(m[0] == 19) {
		this.die();
	}
}

// use me if htis shall die by external trigger
Snare01.prototype.die = function() {
	this.diedAt = this.m.age;
	this.amp.tween({
		from: {s: 1},
		to: {s: 0},
		duration: 393
	});
}

Snare01.prototype.hit = function(note) {
	if(this.hits[note]) {
		this.hits[note].amp.tween({
			from: {s: 1},
			to: {s: 0},
			duration: 1201
		});
	} else {
		this.newHit(note);
	}
}
Snare01.prototype.newHit = function(note) {
	var h = {
		amp: new Twn(),
		size: [0, 0].map(function() { return 2 + Math.round(Math.random() * 4) }), // 2 to 6
		offset: [0, 0].map(function() { return Math.round(Math.random() * 8) - 4 }), // -4 to 4
	}
	this.hits[note] = h;
	this.hit(note);
}

Snare01.prototype.spawn = function() {
	this.amp = new Twn();
	this.amp.set({s: 1});
	
	this.hits = { };
	this.area = [0, 0].map(function() { return 8 + Math.round(Math.random() * 6) }), // -4 to 4
	
	this.areamods = [ ];
	for(i = 0; i < this.area[0] * this.area[1]; i++) {
		a = [0, Math.random(Math.PI * 2 / 20 * (Math.random() * 0.2 + 0.9))];
		// console.log(a);
		this.areamods.push(a);
	}
	
	this.rotation = 0;
	this.rotStep = Math.PI * 2 / 20 / (40 + Math.random() * 20);
	this.rotStep = this.rotStep * (Math.round(Math.random()) * 2 - 1);
}

Snare01.prototype.tick = function() {
	
	// THE SNARE
	// creates random squares over a roughly limited area for each 'hit'
	// gets triggers from SC to light up each hit
	
	
	// also does some light tickeling to do some basic ticks (wtf?)
	
	this.m.renderTiles = { };
	var white = new Colr({r: 255, g: 255, b: 255, a: 0});
	
	this.rotation += this.rotStep;
	// console.log(this.rotation);
	// console.log(this.rotStep);
	// console.log(rotation);
	
	// update tickling phases (and draw them)
	// console.log(this.areamods);
	for(i in this.areamods) {
		var a = this.areamods[i];
		a[0] += a[1];
		var amp = 1;
		var x = i % this.area[0];
		var y = Math.floor(i / this.area[0]);
		x = x - Math.round(this.area[0]/2);
		y = y - Math.round(this.area[1]/2);
		// this.area[0]/2 - Math.abs(x)
		// console.log((this.area[0]/2 - Math.abs(x)) / this.area[0] * 2);
		amp = amp * Math.max(0, (((this.area[0]/2 - Math.abs(x)) / this.area[0] * 2)));
		amp = amp * Math.max(0, (((this.area[1]/2 - Math.abs(y)) / this.area[1] * 2)));
		x = x + this.m.head[0];
		y = y + this.m.head[1];
		// console.log(amp);
		amp = amp * (Math.sin(a[0]) / 2 + 0.5);
		var c = Colr.mix(white, this.m.clr, amp * 100);
		this.rTipRot([x, y], c, this.rotation);
		// console.log([x, y].join("."), amp);
	}
	
	
	// console.log(Object.keys(this.hits).length);
	for(i in this.hits) {
		var h = this.hits[i];
		if(h.amp.get().s > 0) {
			for (var y = 0; y < h.size[1]; y++) {
				for(var x = 0; x < h.size[0]; x++) {
					var pos = [
						this.m.head[0] + h.offset[0] + x - Math.round(h.size[0] / 2),
						this.m.head[1] + h.offset[1] + y - Math.round(h.size[1] / 2)
					];
					var c = Colr.mix(white, this.m.clr, h.amp.get().s * 100);
					this.rTipRot(pos, c, this.rotation);
				}
			}
		}
	}
	
	
	
	// die after a while
	if(this.m.age > 399 && this.diedAt == 0) {
		var dyingprop = (this.m.age - 99) / 333;
		if(Math.random() < dyingprop) {
			this.die();
		}
	}
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	// this.m.head = [Math.round(newTile[0]), Math.round(newTile[1])];
	
	
	
};

// This sets a "renderTile if possible" (that means if it's a valid renderTile)
// callback is being called only on success
Snare01.prototype.rTip = function(tilestr, val, cb) {
	if(this.m.worldMap[tilestr]) {
		this.m.renderTiles[tilestr] = val;
		if(cb) { cb(tilestr); }
	}
}
Snare01.prototype.rTipRot = function(tile, val, rotation) {
	var v = Vec2D.ArrayVector(tile[0], tile[1]);
	// console.log(v);
	v.rotate(rotation);
	// console.log(v);
	this.rTip(v.toArray().map(Math.round).join("."), val);
}
// give back the string value for a vector in the form of "x.y" rounded to integers
Snare01.prototype.vtos = function(vector) {
	return vector.toArray().map(Math.round).join(".");
}