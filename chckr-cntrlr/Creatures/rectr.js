var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Rectr;

function Rectr(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Rectr.prototype.spawn = function() {
	var sr = Math.random();
	this.size = 3 + (sr * sr * sr) * 22; // a side will be this + 1 long
	this.rotation = 0;
	this.rotationSpeed = (0.1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	this.movement = Vec2D.ArrayVector(0, 0);
	this.movement.setX((1 + Math.random()) * (Math.round(Math.random()) * 2 - 1));
	this.movement.setY((1 + Math.random()) * (Math.round(Math.random()) * 2 - 1));
	// this.speed = 1 + Math.round(Math.random() * 5);
	this.speed = Math.round((1 - this.size / 25) * 7 + 1);
	// this.movement = [0, 0];
	
	this.dispSize = new Twn();
	this.dispSize.tween({
		from: {s: 0},
		to: {s: 1 },
		duration: 738,
		easing: 'easeOutQuint'
	});
	this.amp = new Twn();
	this.amp.set({s: 1});
	
	
	
	this.traceTiles = [];
	this.lastHitSend = 0;
	
	this.rectVects = new Array();
	// top side, l2r
	var tl = [this.size * -0.5, this.size * -0.5];
	for(var i = 0; i < this.size; i++) {
		this.rectVects.push(Vec2D.ArrayVector(tl[0] + i, tl[1]));
	}
	// right side, t2b
	var tr = [this.size * 0.5, this.size * -0.5];
	for(var i = 0; i < this.size; i++) {
		this.rectVects.push(Vec2D.ArrayVector(tr[0], tr[1] + i));
	}
	// bottom size, r2l
	var br = [this.size * 0.5, this.size * 0.5];
	for(var i = 0; i < this.size; i++) {
		this.rectVects.push(Vec2D.ArrayVector(br[0] - i, br[1]));
	}
	// left side, b2t
	var bl = [this.size * -0.5, this.size * 0.5];
	for(var i = 0; i < this.size; i++) {
		this.rectVects.push(Vec2D.ArrayVector(bl[0], bl[1] - i));
	}
}

Rectr.prototype.tick = function() {
	if(this.m.age % this.speed == 0) {
		// head follows movement-vect until it hits a wall, then vect gets updated
		var newTile = [0.0, 0.0];
		// console.log(nextStep);
		newTile[0] = Math.round(this.m.head[0] + this.movement.getX());
		newTile[1] = Math.round(this.m.head[1] + this.movement.getY());
		if(!this.m.worldMap[newTile[0]+"."+newTile[1]]) { // checks if tile is available to creature
			newTile = this.m.head;
			// update movement-vector
			this.movement.setX((1 + Math.random()) * (Math.round(Math.random()) * 2 - 1));
			this.movement.setY((1 + Math.random()) * (Math.round(Math.random()) * 2 - 1));
			this.rotationSpeed = (0.1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);

			if(this.m.age - this.lastHitSend > 5) {
				this.m.osc.send('/creature/setValue', this.m.uid, 'wallhit', 1);
				this.lastHitSend = this.m.age;
			}
		}
		this.m.head = newTile;
		// this.m.setTile(newTile);
	}
	
	for (ndx in this.traceTiles) {
		this.traceTiles[ndx] += 1;
		if(this.traceTiles[ndx] == 22) {
			delete this.traceTiles[ndx];
		}
	}
	
	this.rotation = this.rotation + 0.15 * this.rotationSpeed;
	this.m.osc.send('/creature/setValue', this.m.uid, 'rotation', this.rotation);
	var speed = this.movement.length();
	speed = (speed - 1.41421) / 1.41421; // scale to 0..1
	this.m.osc.send('/creature/setValue', this.m.uid, 'speed', speed);
	this.m.osc.send('/creature/setValue', this.m.uid, 'size', this.size/25 * this.dispSize.get()['s']);
	
	
	if(this.m.age > 55 && this.diedAt == 0) {
		// TODO: fade out somehow
		var dyingprop = (this.m.age - 55) / 400;
		if(Math.random() < dyingprop) {
			this.diedAt = this.m.age;
			// this.m.alive = false;
			this.dispSize.tween({
				from: {s: 1},
				to: {s: 4},
				duration: 493,
			});
			this.amp.tween({
				from: {s: 1},
				to: {s: 0},
				duration: 493,
				// finish: function() { this.m.alive = false }.bind(this)
			});
		}
	}
	// finally die
	if(this.diedAt > 0 && this.m.age - this.diedAt > 50) {
		this.m.alive = false;
	};
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	
	////// draw stuff from here
	this.m.renderTiles = { };

	var white = new Colr({r: 255, g: 255, b: 255});
	for(ndx in this.traceTiles) {
		var fact = this.traceTiles[ndx];
		var c = Colr.lighten(this.m.clr, 30 + 1 * fact);
		this.m.renderTiles[ndx] = Colr.mix(white, c, this.amp.get()['s'] * 100);
	}
	var headVect = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
	// draw vectors that represent tiles
	// console.log("/////////////");
	for (var i = 0; i < this.rectVects.length; i++) {
		var v = this.rectVects[i];
		// console.log(v);
		var rv = v.clone().rotate(this.rotation).mulS(this.dispSize.get()['s']);
		var tv = headVect.clone().add(rv);
		var str = Math.round(tv.getX()) + "." + Math.round(tv.getY());
		if(this.m.worldMap[str]) {
			// this.m.renderTiles[str] = Colr.lighten(this.m.clr, (1-this.amp.get()['s']) * 500);
			this.m.renderTiles[str] = Colr.mix(white, this.m.clr, this.amp.get()['s'] * 100);
			this.traceTiles[str] = 0;
		}
	}
	// console.log(Object.keys(this.m.renderTiles).length);
	
};