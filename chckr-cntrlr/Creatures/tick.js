var Colr = require('tinycolor2');
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Tick;

function Tick(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Tick.prototype.oscMessage = function(m) {
	// hit
	// console.log(m);
	if(m[0] == 11) {
		this.ding(m[1]);
	}
	if(m[0] == 19) {
		// console.log("got killed by sound!");
		this.die();
	}
}

Tick.prototype.ding = function(tone) {
	var newRay = {
		createdAt: this.m.age,
		age: 0,
		direction: this.rotation,
		tone: tone,
		col: new Colr(this.m.clr.toRgb()).spin(Math.random() * 30)
	};
	this.rays.push(newRay);
	
	if(!this.triggered) {
		this.traceOffset = Vec2D.ArrayVector(0.0, 0.0);
		this.triggered = true;
	}
	// console.log(newRay);
}
Tick.prototype.die = function() {
	this.diedAt = this.m.age;
	this.amp.tween({
		from: {s: 1},
		to: {s: 0},
		duration: 493
	});
}

Tick.prototype.spawn = function() {
	this.traceTiles = { };
	
	this.rotation = 0;
	this.rotationSpeed = (0.8 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	
	this.movement = Vec2D.ArrayVector(0, 0);
	this.movement.setX((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	this.movement.setY((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	
	this.traceMovement = Vec2D.ArrayVector(0, 0);
	this.traceMovement.setX((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	this.traceMovement.setY((0.1 + Math.random() * 0.3) * (Math.round(Math.random()) * 2 - 1));
	
	this.position = [0., 0.];
	this.traceOffset = Vec2D.ArrayVector(0, 0);
	this.triggered = false; // true once the sound has been triggered

	this.speed = 0.4;
	
	this.amp = new Twn();
	this.amp.set({s: 1});
	
	this.rays = [ ]; // contains ray objects which represent a ding...
	
}

Tick.prototype.tick = function() {
	
	// this is all about 'head' which moves around on a straight line and 
	// changes direction once it hit's a wall
	// head follows movement-vect until it hits a wall, then vect gets updated
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

		if(this.m.age - this.lastHitSend > 5) {
			this.m.osc.send('/creature/setValue', this.m.uid, 'wallhit', 1);
			this.lastHitSend = this.m.age;
		}
	}
	this.m.head = [Math.round(newTile[0]), Math.round(newTile[1])];
	// this.m.setTile(newTile);
	
	// trace is kind of a shadowy thing
	// calculate movement/offset first
	// if one vector value is >=1, do the movement
	this.traceOffset.add(this.traceMovement);
	
	var offsetTrace = { };
	
	for (ndx in this.traceTiles) {
		this.traceTiles[ndx] += 1;
	
		var coords = ndx.split(".");
		coords[0] = Math.round(parseInt(coords[0]) + this.traceOffset.getX());
		coords[1] = Math.round(parseInt(coords[1]) + this.traceOffset.getY());
		var str = coords.join(".");
		if(this.m.worldMap[str]) {
			offsetTrace[str] = this.traceTiles[ndx];
		}
		
		if(this.traceTiles[ndx] == 55) {
			delete this.traceTiles[ndx];
		}
	}
	
	// console.log(offsetTrace);
	
	this.rotation = this.rotation + 0.35 * this.rotationSpeed;
	
	if(this.m.age > 99 && this.diedAt == 0) {
		// TODO: fade out somehow
		var dyingprop = (this.m.age - 99) / 400;
		if(Math.random() < dyingprop) {
			this.die();
		}
	}
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	
	////// draw stuff from here
	this.m.renderTiles = { };

	var white = new Colr({r: 255, g: 255, b: 255, a:0});
	
	// draw 'trace' first
	// for(ndx in this.traceTiles) {
	for(ndx in offsetTrace) {
		// var fact = this.traceTiles[ndx] / 2;
		var fact = offsetTrace[ndx] / 1.5;
		// var c = Colr.lighten(this.m.clr, 30 + 1 * fact);
		var c = Colr.mix(this.m.clr, white, 30 + fact + 34);
		this.m.renderTiles[ndx] = Colr.mix(white, c, this.amp.get()['s'] * 100);
	}
	
	// draw head
	var headVect = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
	var v1 = Vec2D.ArrayVector(0, 1).rotate(this.rotation);
	var v2 = Vec2D.ArrayVector(0, -1).rotate(this.rotation);
	var p1 = headVect.clone().add(v1);
	var p2 = headVect.clone().add(v2);
	var s1 = [Math.round(p1.getX()), Math.round(p1.getY())].join(".");
	var s2 = [Math.round(p2.getX()), Math.round(p2.getY())].join(".");
	if(this.m.worldMap[s1]) { this.m.renderTiles[s1] = this.m.clr; }
	if(this.m.worldMap[s2]) { this.m.renderTiles[s2] = this.m.clr; }
	
	var hs = this.m.head.join(".");
	this.m.renderTiles[hs] = this.m.clr;
	
	// draw vectors that represent tiles
	
	// draw vect for each 'ray'
	for(i in this.rays) {
		this.rays[i].age += 1;
		var r = this.rays[i];
		var v = Vec2D.ArrayVector(0, r.tone).rotate(r.direction);
		for (var j=0; j < Math.abs(r.tone); j++) {
			var p = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
			var x = v.clone();
			p.add(x.mulS(1/r.tone*j));
			var pR = [Math.round(p.getX()), Math.round(p.getY())];
			var pS = pR[0]+'.'+pR[1]
			if(this.m.worldMap[pS]) {
				// var c = new Colr(this.m.clr.toRgb()).spin(Math.random() * 10);
				var c = r.col;
				this.m.renderTiles[pS] = c;
				this.traceTiles[pS] = 0;
			}
		};
		if(this.rays[i].age > 13) {
			delete this.rays[i];
		}
	}
	
	
	
	
};