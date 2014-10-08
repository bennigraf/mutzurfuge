var Colr = require("tinycolor2");
var Vec2D = require('vector2d');
var Twn = require('shifty');

module.exports = Bassdr01;

function Bassdr01(mother) {
	this.m = mother; // the creature	
	this.diedAt = 0;
}

Bassdr01.prototype.oscMessage = function(m) {
	// hit
	// console.log(m);
	if(m[0] == [13]) {
		this.bassHit();
	}
	if(m[0] == 14) {
		this.delHit();
	}
}
Bassdr01.prototype.bassHit = function() {
	this.height.stop();
	this.height.tween({
		from: { s: 2 + Math.random() * 3 },
		to: { s: 0.3 },
		easing: 'easeOutQuad',
		duration: 850
	});
}

Bassdr01.prototype.delHit = function() {
	if(this.m.age - this._lastDelHit > 10) {
		this.height.stop();
		// console.log("delay");
		this.height.tween({
			from: { s: 1 + Math.random() * 1 },
			to: { s: 0.3 },
			easing: 'easeOutQuad',
			duration: 850
		});
		this.noise.stop();
		this.noise.tween({
			from: { s: 2 },
			to: { s: 0.3 },
			easing: 'easeOutQuad',
			duration: 950
		});
		this._lastDelHit = this.m.age;
	}
}

Bassdr01.prototype.spawn = function() {
	this.head = [this.m.head[0], this.m.head[1]];
	
	var spawnHead = { pos: this.head, createdAt: 0 };
	this.heads = { l: [spawnHead], r: [spawnHead] };
	this.oldheads = [ ];
	
	this.tiles = { };
	
	// 'global' amp
	this.amp = new Twn({s: 1});
	// this.amp.set({s: 1});
	
	// this.height = 1 + Math.random() * 5;
	this.height = new Twn({s: 0.5});
	this.noise = new Twn({s: 0});
	this.speed = 0.7 + Math.random() * 0.7;
	
	this._lastDelHit = this.m.age;
}

Bassdr01.prototype.newHead = function(lr) {
	// a 'head' is essentially a up- and downwards moving tile so it contains
	// a coordinate and a sine-phase relative to this creature's life
	var latestHead = this.heads[lr][this.heads[lr].length - 1];
	var pos;
	if(lr == 'l') {
		pos = [latestHead.pos[0] - 1, latestHead.pos[1]];
	} else {		
		pos = [latestHead.pos[0] + 1, latestHead.pos[1]];
	}
	var createdAt = this.m.age;
	if(this.m.worldMap[pos[0]+"."+pos[1]]) {
		var obj = {
			'pos': pos,
			'createdAt': createdAt,
			'col': new Colr(this.m.clr.toRgb()).desaturate(Math.random() * 50)
		}
		this.heads[lr].push(obj);
	}
}

Bassdr01.prototype.tick = function() {
	
	// add tiles left and right of latest additions until edge was reached...
	
	for (var i=0; i < 3; i++) {
		// left:
		this.newHead('l');
		// right:
		this.newHead('r');
	};
	
	// console.log(this.heads);
	
	if(this.diedAt == 0) {
		var dyingProp = (this.m.age - 483) / 335
		if(dyingProp > Math.random()) {
			this.diedAt = this.m.age;
			this.amp.tween({
				from: {s: 1},
				to: {s: 0},
				duration: 7493 // this is in seconds!
			});
		}
	}
	
	
	////// draw stuff from here
	this.m.renderTiles = { };

	var white = new Colr({r: 255, g: 255, b: 255, a: 0});
	var amp = this.amp.get()['s'];
	
	for(i in this.oldheads) {
		// console.log(this.oldheads[i]);
		this.m.renderTiles[this.oldheads[i]] = white;
	}
	this.oldheads = [ ];
	
	for(lr in this.heads) {
		var heads = this.heads[lr];
		for(i in heads) {
			var head = heads[i];
			var sin = Math.sin((this.m.age - head.createdAt)  / this.speed);
			sin = sin + ((Math.random() - 0.5) * this.noise.get().s);
			var drawpos = [head.pos[0], head.pos[1] + Math.round(sin * this.height.get().s)];
			var ndx = drawpos[0]+"."+drawpos[1];
			this.m.renderTiles[ndx] = Colr.mix(white, this.m.clr, amp * 100);
			this.oldheads.push(ndx);
		}
	}
	
	// finally die
	if(this.amp.get()['s'] == 0) {
		this.m.alive = false;
	}
	
};