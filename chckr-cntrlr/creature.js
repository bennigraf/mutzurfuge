module.exports = Creature;

function Creature(env) {
	this.world = env;
	this.age = 0;
	this.alive = true;
}

Creature.prototype.spawn = function(x, y) {
	console.log("spawning at ", x, y);
	this.world.tiles[x][y]['settled'] = true;
	this.age = 0;
	this.alive = true;
}

Creature.prototype.tick = function() {
	var checks = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // tiles on top, right, bottom, left
	var newTiles = new Array();
	for (var x=0; x < this.world.width; x++) {
		for (var y=0; y < this.world.height; y++) {
			if(this.world.tiles[x][y]['settled'] && this.world.tiles[x][y]['age'] < 11) {
				var t = this.world.tiles[x][y];
				var clr = 1 - Math.min(1/10*t.age, 1);
				// sndr.send('/grid', t.x, t.y, 1.0+this.ln, 1.0-clr+this.ln, 1.0-clr+this.ln);
				this.world.setTile(t.x, t.y, 1.0, 1.0-clr, 1.0-clr);
				this.world.tiles[x][y]['age'] += 1;
				for (var i=0; i < checks.length; i++) {
					var c = checks[i];
					var newPos = [t['x'] + c[0], t['y'] + c[1]];
					if(this.tileIsFree(newPos)) {
						newTiles.push({x: newPos[0], y: newPos[1]});
					}
				}
			} else if (this.world.tiles[x][y]['settled'] && this.world.tiles[x][y]['age'] >= 11) {
				this.world.tiles[x][y]['settled'] = false;
				this.world.tiles[x][y]['age'] = 0;
			}
		};
	};
	for (var i=0; i < newTiles.length; i++) {
		var nt = newTiles[i];
		this.world.tiles[nt['x']][nt['y']]['settled'] = true;
	};
	this.age = this.age + 1;
	if(this.age > 100) {
		this.alive = false;
	}
};

Creature.prototype.tileIsFree = function(newPos) {
	if(newPos[0] < 0 || newPos[0] >= this.world.width ||
		newPos[1] < 0 || newPos[1] >= this.world.height) {
		return false;
	}
	return !this.world.tiles[newPos[0]][newPos[1]]['settled'];
}


