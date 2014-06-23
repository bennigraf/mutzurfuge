var Colr = require("tinycolor2");
var Vec2D = require('vector2d');

module.exports = Rectr;

function Rectr(mother) {
	this.m = mother; // the creature	
}

Rectr.prototype.spawn = function() {
	this.size = 8.0; // a side will be this + 1 long, use only even numbers!
	this.rotation = 0;
	this.rotationSpeed = (0.1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	this.movement = [0, 0];
	this.movement[0] = (1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	this.movement[1] = (1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
	this.speed = 1 + Math.round(Math.random() * 5);
	// this.movement = [0, 0];
	
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
		newTile[0] = Math.round(this.m.head[0] + this.movement[0]);
		newTile[1] = Math.round(this.m.head[1] + this.movement[1]);
		if(!this.m.worldMap[newTile[0]+"."+newTile[1]]) { // checks if tile is available to creature
			newTile = this.m.head;
			// update movement-vector
			this.movement[0] = (1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
			this.movement[1] = (1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
			this.rotationSpeed = (0.1 + Math.random()) * (Math.round(Math.random()) * 2 - 1);
		}
		this.m.head = newTile;
		// this.m.setTile(newTile);
	}
	
	this.rotation = this.rotation + 0.15 * this.rotationSpeed;
	
	
	////// draw stuff from here
	this.m.renderTiles = new Array();
	
	var headVect = Vec2D.ArrayVector(this.m.head[0], this.m.head[1]);
	// draw vectors that represent tiles
	// console.log("/////////////");
	for (var i = 0; i < this.rectVects.length; i++) {
		var v = this.rectVects[i];
		// console.log(v);
		var rv = v.clone().rotate(this.rotation);
		var tv = headVect.clone().add(rv);
		var str = Math.round(tv.getX()) + "." + Math.round(tv.getY());
		if(this.m.worldMap[str]) {
			this.m.renderTiles[str] = this.m.clr;
		}
	}
	// console.log(Object.keys(this.m.renderTiles).length);
	
};