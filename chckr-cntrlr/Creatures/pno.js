var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Pno;

function Pno(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Pno.prototype.oscMessage = function(m) {
	// console.log(m);
	if(m[0] == 11) {
		this.tme = m[1];
		this.hit();
	}
	if(m[0] == 19) {
		this.die();
	}
}

Pno.prototype.hit = function() {
	if(this.phase.get().s == 2) {
		this.phase.set({s: 0});
	}
	if(this.phase.get().s <= 0.1) {
		this.phase.tween({
			from: {s: 0},
			to: {s: 1 },
			easing: 'easeOutQuad',
			duration: this.tme/4 * 1000
		});
		// console.log(this.tme);
		setTimeout(function(){
			// console.log("off again");
			this.phase.tween({
				from: {s: 1},
				to: {s: 2},
				duration: this.tme/7 * 1000
			});
		}.bind(this), (this.tme - this.tme/6 - 0.1) * 1000);
	} else {
		setTimeout(this.hit.bind(this), 1/20 * 1000);
	}
}

// use me if htis shall die by external trigger
Pno.prototype.die = function() {
	this.diedAt = this.m.age;
	this.amp.tween({
		from: {s: 1},
		to: {s: 0},
		duration: 393
	});
}

Pno.prototype.spawn = function() {
	this.amp = new Twn();
	this.amp.set({s: 1});
	
	this.farness = new Twn(); // how far away are the fragments
	this.farness.set({s: 0.2});
	
	this.phase = new Twn();
	this.phase.set({s: 0.1});
	
	this.mods = [0, 0, 0].map(function(){ 
		return Math.PI * 2 / 20 // this is 1 per second
			* (Math.random() * 0.7 + 0.3);
	}); 
	this.modphases = [0, 0, 0];
	this.size = 6 + Math.random() * 8;
	
	this.traceTiles = { };
	this.traceMovement = [0, 0].map(function(){return Math.round(Math.random()) * 2 - 1 });
	this.traceOffset = Vec2D.ArrayVector(0, 0);
}

Pno.prototype.tick = function() {
	
	// die after a while
	if(this.m.age > 1399 && this.diedAt == 0) {
		var dyingprop = (this.m.age - 1399) / 233;
		if(Math.random() < dyingprop) {
			this.die();
		}
	}
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	// this.m.head = [Math.round(newTile[0]), Math.round(newTile[1])];
	// modulate the modulator
	for (var i=0; i < this.mods.length; i++) {
		this.modphases[i] += this.mods[i]
	};
	
	var traceCopy = { };
	for (ndx in this.traceTiles) {
	
		var coords = ndx.split(".");
		coords[0] = parseInt(coords[0]) + this.traceMovement[0];
		coords[1] = parseInt(coords[1]) + this.traceMovement[1];
		var str = coords.join(".");
		if(this.m.worldMap[str]) {
			traceCopy[str] = this.traceTiles[ndx] + 1;
		}
	}
	
	for(ndx in traceCopy) {
		this.traceTiles[ndx] = traceCopy[ndx];
	}
	
	for(ndx in this.traceTiles) {
		this.traceTiles[ndx] += 1;
		if(this.traceTiles[ndx] >= 35) {
			delete this.traceTiles[ndx];
		}
	}
	
	
	////// draw stuff from here
	this.m.renderTiles = { };
	var white = new Colr({r: 255, g: 255, b: 255, a: 0});
	
	// draw 'trace' first
	for(ndx in this.traceTiles) {
		var fact = this.traceTiles[ndx];
		var c = Colr.mix(this.m.clr, white, 40 + fact + 25);
		this.m.renderTiles[ndx] = Colr.mix(white, c, this.amp.get()['s'] * 100);
	}
	
	////////// THE PIANO
	// consists of 20 to 40 fragments that float around a center and expand after
	// every hit (11) to fly back to the middle before the next one.
	var headVect = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
	
	// console.log(this.phase.get().s);
	var segs = 15;
	for (var i=0; i < segs; i++) {
		var ofst = 1/101 * i * (1-this.phase.get().s);
		var fns = Math.sin(0 - Math.PI * ofst + this.phase.get().s * Math.PI/2);
		// console.log(fns);
		fns = Math.max(fns, 0); // minium is 0, ignore everything below
		for (var j=0; j < this.modphases.length; j++) {
			// modulate each thingy with a modulator
			fns = fns * (Math.sin(this.modphases[j] + Math.PI * 2 / segs * i) * 0.3 + 0.8);
		};
		
		var away = fns * this.size;
		var v = Vec2D.ArrayVector(0, away).add(headVect).rotate(Math.PI * 2 / segs * i);
		// console.log(v);
		this.rTip(this.vtos(v), this.m.clr);
		this.traceTiles[this.vtos(v)] = 0;
	}
	
	
};

// This sets a "renderTile if possible" (that means if it's a valid renderTile)
// callback is being called only on success
Pno.prototype.rTip = function(tilestr, val, cb) {
	if(this.m.worldMap[tilestr]) {
		this.m.renderTiles[tilestr] = val;
		if(cb) { cb(tilestr); }
	}
}
// give back the string value for a vector in the form of "x.y" rounded to integers
Pno.prototype.vtos = function(vector) {
	return vector.toArray().map(Math.round).join(".");
}