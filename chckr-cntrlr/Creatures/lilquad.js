var Colr = require("tinycolor2");
// var Creature = require("_Creature.js");
var Twn = require('shifty');

module.exports = LilQuad;

function LilQuad(mother) {
	this.m = mother; // the creature
	
}

// vererbung will be implemented in version 17328.0
// LilQuad.prototype = new Creature();

LilQuad.prototype.spawn = function() {
	this.rayProp = 0.0;
	this.rays = [];
	this.diedAt = 0;

	this.amp = new Twn();
	this.amp.set({s: 1});
}

LilQuad.prototype.tick = function() {
	
	this.rayProp += 0.001;
	
	// 'head' wanders around in a rect, but sometimes jumps a little off
	var steps = [[1.0, 0], [0, 1.0], [-1.0, 0], [0, -1.0]];
	var newTile = [0.0, 0.0];
	var offstepProp = Math.random() < 0.23;
	var nextStep = this.m.age + offstepProp * 1;
	// console.log(nextStep);
	newTile[0] = parseInt(this.m.head[0]) + parseInt(steps[nextStep%4][0]);
	newTile[1] = parseInt(this.m.head[1]) + parseInt(steps[nextStep%4][1]);
	if(!this.m.worldMap[newTile[0]+"."+newTile[1]]) { // checks if tile is available to creature
		newTile = this.m.head;
	}
	this.m.head = newTile;
	this.m.setTile(newTile);
	
	if(offstepProp) {
		this.m.osc.send('/creature/setValue', this.m.uid, 'offstep', 1);
	}
	
	this.m.osc.send('/creature/setValue', this.m.uid, 'raysum', this.rays.length);
	
	// add ray from time to time
	if(this.rayProp > Math.random() && this.diedAt == 0) {
	// if(false) {
		this.rayProp = 0;
		var ray = {
			age: 0,
			vect: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 + 3], // dir x/y, speed
			tiles: [this.m.head],
			dying: false,
			dead: false
		};
		this.rays.push(ray);
	}
	
	// maybe die if older than 33 and no rays are active TODO: fade out somehow
	if(this.m.age > 33 && this.rays.length == 0 && this.diedAt == 0) {
		// console.log("dying");
		var dyingprop = (this.m.age - 33) / 300;
		// console.log(dyingprop);
		if(Math.random() < dyingprop) {
			this.diedAt = this.m.age;
			this.amp.tween({
				from: {s: 1},
				to: {s: 0},
				duration: 338,
				// finish: function() { this.m.alive = false;console.log("dead"); }.bind(this)
			});
		}
	}
	if(this.m.age > 500) {
		// console.log("dying");
		this.diedAt = this.m.age;
		this.amp.tween({
			from: {s: 1},
			to: {s: 0},
			duration: 2338,
			// finish: function() { this.m.alive = false; console.log("dead"); }.bind(this)
		});
	}
	if(this.diedAt > 0 && this.m.age - this.diedAt > 33) {
		this.m.alive = false;
	}
	
	// update rays
	var removableRays = [];
	for(var i = this.rays.length-1; i >= 0; i--) {
		var ray = this.rays[i];
		var lastTile = ray.tiles[ray.tiles.length-1];
		var newTile = [];
		// TODO: some jitter here
		if(!ray.dying) {
			newTile[0] = lastTile[0] + Math.round(1 * ray.vect[0] * ray.vect[2]);
			newTile[1] = lastTile[1] + Math.round(1 * ray.vect[1] * ray.vect[2]);
			// console.log(newTile);
			if(this.m.worldMap[newTile[0]+"."+newTile[1]]) {
				this.rays[i].tiles.push(newTile);
			} else {
				this.rays[i].dying = true;
				this.rays[i].diedAt = ray.age;
			}
		} else {
			// it's dying!!!!
			if(ray.age - ray.diedAt > 20) {
				removableRays.push(i);
			}
		}
		ray.age += 1;
	}
	// remove old rays
	for(var i = 0; i < removableRays.length; i++) {
		this.rays.splice(removableRays[i], 1);
	}
	
	////// draw stuff from here
	var white = new Colr({r: 255, g: 255, b: 255});
	this.m.renderTiles = { };
	for(ndx in this.m.tiles) {
		var t = this.m.tiles[ndx];
		var c = Colr.lighten(this.m.clr, 5 * t[1]);
		c = Colr.mix(white, c, this.amp.get()['s'] * 100);
		this.m.renderTiles[ndx] = c;
		// console.log(ndx);
		// console.log(c);
	}
	
	for(i in this.rays) {
		var r = this.rays[i];
		var mod = 0.75;
		if(r.dying) {
			mod = mod + 1/80 * (r.age - r.diedAt);
		}
		for (var j = 0; j < r.tiles.length; j++) {
			var t = r.tiles[j];
			if(!this.m.renderTiles[t[0]+"."+t[1]]) {
				var co = this.m.clr.toHsv();
				co.s = co.s + Math.random() * -0.3; // modulate saturation
				co.s = co.s * (1-mod);
				var c = new Colr(co);
				this.m.renderTiles[t[0]+"."+t[1]] = c;
			}
		}
	}
};