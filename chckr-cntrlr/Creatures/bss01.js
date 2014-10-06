var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Bss01;

function Bss01(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Bss01.prototype.oscMessage = function(m) {
	if(m[0] == 11) {
		this.setMul(m[1]);
	}
	if(m[0] == 19) {
		this.die();
	}
}

Bss01.prototype.setMul = function(mul) {
	this.mul = 0.5 + mul * 6;
}

// use me if htis shall die by external trigger
Bss01.prototype.die = function() {
	this.diedAt = this.m.age;
	this.amp.tween({
		from: {s: 1},
		to: {s: 0},
		duration: 3093
	});
}

Bss01.prototype.spawn = function() {
	this.amp = new Twn();
	this.amp.set({s: 1});
	
	// a) modulate x and y coords around head with sine/cosine which generates a circle
	// b) use a vect with a specific length and .rotate that with a specific frequency
	
	// try b) first!
	
	this.mul = 4;
	this.circular = Vec2D.ArrayVector(1, 0.0); // rotate and draw me!
	this.circlesegs = 44;
	this.rotPhase = Math.PI * 2 / this.circlesegs; // this number decides how many segments the circle has
	
	// this moves the whole thing around a bit
	this.movement = Vec2D.ArrayVector(0, 0);
	this.movement.setX((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	this.movement.setY((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	this.position = [0., 0.];
	
	this.vismodphases = [0, 0]; // some modulation to be done on each drawing interval
	
	this.shadow = { };
	
}

Bss01.prototype.tick = function() {
	
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
	
	// this is the basic movement of the whole thing
	var newTile = [0.0, 0.0];
	// console.log(this.position);
	this.position[0] = this.position[0] + this.movement.getX();
	this.position[1] = this.position[1] + this.movement.getY();
	newTile[0] = Math.round(this.position[0]);
	newTile[1] = Math.round(this.position[1]);
	var str = Math.round(newTile[0])+"."+Math.round(newTile[1]);
	if(!this.m.worldMap[str]) { // checks if tile is available to creature
		newTile = this.m.head;
		// update movement-vector
		this.movement.setX((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
		this.movement.setY((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
		this.rotationSpeed = (0.1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	}
	this.m.head = [Math.round(newTile[0]), Math.round(newTile[1])];
	
	
	////// draw stuff from here
	this.m.renderTiles = { };
	var white = new Colr({r: 255, g: 255, b: 255, a: 0});
	
	// draw shadow tiles
	for (ndx in this.shadow) {
		this.shadow[ndx] += 1;
	
		// var fact = this.shadow[ndx] * 1;
		var a = this.amp.get().s;
		// var fact = (80 + this.shadow[ndx]) * a;
		var fact = Math.min((50 + this.shadow[ndx] * 2) + (1-a) * 50, 100);
		// var c = Colr.mix(this.m.clr, white, 50 + 5 * fact * a);
		var c = Colr.mix(this.m.clr, white, fact);
		// var c = Colr.lighten(this.m.clr, 14 + 2 * fact * a);
		this.rTip(ndx, c)
		
		if(this.shadow[ndx] == 25) {
			delete this.shadow[ndx];
		}
	}
	
	
	// color for main parts
	var maincol = Colr.mix(white, this.m.clr, this.amp.get().s * 100);
	// var maincol = this.m.clr;
	// lighter color for inner ring
	// var lightcol = Colr.mix(white, Colr.mix(this.m.clr, white, 24), 50 + this.amp.get()['s'] * 70);
	var lightcol = Colr.mix(white, Colr.mix(this.m.clr, white, 30), this.amp.get().s * 100);
	
	// rotate vector around head
	var headVect = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
	
	var segs = 14 + Math.random() * 14; // number of segments to draw
	// var segs = this.circlesegs / 2;
	// this.rotPhase = Math.PI * 2 / 25 * (0.95+Math.random() / 10); // this number decides how many segments the circle has
	// console.log(this.vismodphases[0]);
	for (var i=0; i < segs; i++) {
		var mmul = this.mul;
		// mmul = 6;
		// do some modulation on mul to make the shape more 'eggy'
		mmul = mmul * (Math.sin(this.vismodphases[0]) * 0.05 + 0.9);
		this.vismodphases[0] += Math.PI * 2.0 / (segs * 1.02);
		mmul = mmul * (Math.sin(this.vismodphases[1]) * 0.09 + 0.9);
		this.vismodphases[1] += Math.PI * 2 / (segs * 0.997);
		
		var p = headVect.clone().add(this.circular.clone().mulS(mmul));
		// this is basically the outer ring
		this.rTip(this.vtos(p), maincol, function(tile) {
			this.shadow[tile] = 0;
		}.bind(this)); 
		
		
		for (var j=1; j < mmul; j++) {
			var q = headVect.clone().add(this.circular.clone().mulS(j));
			this.rTip(this.vtos(q), lightcol, function(tile) { 
				this.shadow[tile] = 12;
			}.bind(this));
		};
		
		this.circular.rotate(this.rotPhase);
		// this.circular.rotate(Math.PI * 2 / this.circlesegs);
	};
	

	
};

// This sets a "renderTile if possible" (that means if it's a valid renderTile)
// callback is being called only on success
Bss01.prototype.rTip = function(tilestr, val, cb) {
	if(this.m.worldMap[tilestr]) {
		this.m.renderTiles[tilestr] = val;
		if(cb) { cb(tilestr); }
	}
}
// give back the string value for a vector in the form of "x.y" rounded to integers
Bss01.prototype.vtos = function(vector) {
	return vector.toArray().map(Math.round).join(".");
}