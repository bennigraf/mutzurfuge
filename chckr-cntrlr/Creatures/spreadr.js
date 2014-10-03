var Colr = require("tinycolor2");
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Spreadr;

function Spreadr(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Spreadr.prototype.spawn = function() {
	this.heads = [[this.m.head[0], this.m.head[1]]];
	
	var fillDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]];
	function shuffle(o){ //v1.0
	    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	    return o;
	};
	this.fillers = shuffle(fillDirections);
	// use 1 to 4 of those fillers
	var use = 1 + Math.floor(Math.random() * 3.999999999999);
	for (var i = 0; i < use - 1; i++) {
		this.fillers.splice(3 - i, 1);
	}
	
	this.tiles = { };
	
	// 'global' amp
	this.amp = new Twn();
	this.amp.set({s: 1});
}

Spreadr.prototype.tick = function() {
	
	for(ndx in this.tiles) {
		if(this.tiles[ndx] >= 0 && this.tiles[ndx] < 14) {
			this.tiles[ndx] += 1;
		} else {
			delete this.tiles[ndx];
		}
	}
	
	var newHeads = [];

	for(i in this.heads) {
		// for each head, check surroundings
		// if tile is available, fill it with a 0
		// (maybe set fill-directions before)
		// update all filled tiles with +1 (to set clr from)
		var h = this.heads[i];
		for(j in this.fillers) {
			var fill = this.fillers[j];
			var n = [h[0] + fill[0], h[1] + fill[1]];
			if(this.m.worldMap[n[0]+"."+n[1]] && this.tiles[n[0]+"."+n[1]] == undefined) {
				newHeads.push(n);
				this.tiles[n[0]+"."+n[1]] = 0;
			}
		}
	}
	this.heads = newHeads;
	
	if(this.heads.length == 0 && this.diedAt == 0) {
		this.diedAt = this.m.age;
		this.amp.tween({
			from: {s: 1},
			to: {s: 0},
			duration: 2493
		});
	}
	// this.m.osc.send('/creature/setValue', this.m.uid, 'speed', speed);
	
	// finally die
	if(this.diedAt > 0 && this.m.age - this.diedAt > 60) {
		this.m.alive = false;
	};
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
	// console.log(this.m.race, this.m.age, this.diedAt, this.m.alive, this.amp.get()['s']);
	
	////// draw stuff from here
	this.m.renderTiles = { };

	var white = new Colr({r: 255, g: 255, b: 255});
	var amp = this.amp.get()['s'];
	for(ndx in this.tiles) {
		if(this.tiles[ndx] < 12) {
			var fact = 1 - (1/11 * this.tiles[ndx] * amp);
			// console.log(amp);
			// amp = 1;
			this.m.renderTiles[ndx] = Colr.mix(white, this.m.clr, amp*(Math.random() * 10 + fact * 90));
			// this.m.renderTiles[ndx] = Colr.mix(white, this.m.clr, amp * 100);
		}
	}
	for(i in this.heads) {
		var h = this.heads[i]
		this.m.renderTiles[h[0]+"."+h[1]] = this.m.clr;
	}
	
};