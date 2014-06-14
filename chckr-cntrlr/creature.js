var Colr = require("tinycolor2");



module.exports = Creature;

function Creature(env) {
	this.world = env;
	this.age = 0;
	this.alive = true;
	this.roots = [];
	this.tiles = [];
	// render tiles are what's represented to the outside world, inside we deal with tiles
	// renderTiles are created on each tick and may contain more tiles that this.tiles
	this.renderTiles = []; 
}

Creature.prototype.spawn = function() {
	// a creature always spawns at 0/0, grows from there
	// but start pos is being stored for later drawing!
	console.log("spawning");
	this.tiles["0.0"] = ['set', 0]; // state, age?
	this.head = [0, 0];
	this.clr = new Colr({h: Math.random() * 360, s: 100, v: 100});
	// console.log(this.clr);
	
	this.rayProp = 0.0;
	this.rays = [];
}
Creature.prototype.setRootCoords = function(boardid, x, y) {
	this.roots = [boardid, x, y];
}
Creature.prototype.tick = function() {
	this.age = this.age + 1;
	if(this.age > 100) {
		// this.alive = false;
	}
	
	this.rayProp += 0.01;
	
	for(ndx in this.tiles) {
		this.tiles[ndx][1] += 1; // age of tile
	}
	
	// 'head' wanders around in a rect, but sometimes jumps a little off
	var steps = [[1.0, 0], [0, 1.0], [-1.0, 0], [0, -1.0]];
	var newTile = [0.0, 0.0];
	var nextStep = this.age + (Math.random() < 0.2) * 1;
	// console.log(nextStep);
	newTile[0] = parseInt(this.head[0]) + parseInt(steps[nextStep%4][0]);
	newTile[1] = parseInt(this.head[1]) + parseInt(steps[nextStep%4][1]);
	// if(!this.world.tileInWorld(this, newTile)) {
		// newTile = this.head;
	// }
	// console.log(newTile);
	this.head = newTile;
	this.setTile(newTile);
	// console.log(this.head[1] - 10);
	
	// console.log(1/100 * this.age);
	// var mmmc = new Colr({r: 100 * this.age, g: 100, b: 100});
	// console.log(mmmc);
	// this.clr = mmmc;
	
	// add ray from time to time
	if(this.rayProp > Math.random()) {
	// if(false) {
		this.rayProp = 0;
		var ray = {
			age: 0,
			vect: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 3 + 2], // dir x/y, speed
			tiles: [this.head],
			dying: false,
			dead: false
		};
		this.rays.push(ray);
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
			if(this.world.tileInWorld(this, newTile)) {
				this.rays[i].tiles.push(newTile);
			} else {
				this.rays[i].dying = true;
			}
		} else {
			// it's dying!!!!
			if(!ray.diedAt) {
				this.rays[i].diedAt = ray.age;
			} else {
				if(ray.age - ray.diedAt > 20) {
					removableRays.push(i);
				}
			}
		}
		ray.age += 1;
	}
	// remove old rays
	for(var i = 0; i < removableRays.length; i++) {
		console.log("remove ray");
		this.rays.splice(removableRays[i], 1);
	}
	
	////// draw stuff from here
	this.renderTiles = new Array();
	for(ndx in this.tiles) {
		var t = this.tiles[ndx];
		var c = Colr.lighten(this.clr, 5 * t[1]);
		this.renderTiles[ndx] = c;
		// console.log(ndx);
		// console.log(c);
	}
	
	for(i in this.rays) {
		var r = this.rays[i];
		var mod = 0;
		if(r.dying) {
			mod = 1/30 * (r.age - r.diedAt);
		}
		for (var j = 0; j < r.tiles.length; j++) {
			var t = r.tiles[j];
			if(!this.renderTiles[t[0]+"."+t[1]]) {
				var co = this.clr.toHsv();
				co.s = co.s + Math.random() * -0.1; // modulate saturation
				var c = new Colr(co);
				c = Colr.lighten(c, mod * 10);
				this.renderTiles[t[0]+"."+t[1]] = c;
			}
		}
	}
};
Creature.prototype.setTile = function(tile) {
	var path = tile[0]+"."+tile[1];
	if(this.tiles[path]) {
		this.tiles[path][1] = 0;
	} else {
		this.tiles[path] = ['set', 0];
	}
}


Creature.prototype.tileIsFree = function(newPos) {
	if(newPos[0] < 0 || newPos[0] >= this.world.width ||
		newPos[1] < 0 || newPos[1] >= this.world.height) {
		return false;
	}
	return !this.world.tiles[newPos[0]][newPos[1]]['settled'];
}


