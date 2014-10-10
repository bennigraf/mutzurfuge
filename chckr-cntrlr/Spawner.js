

var Creature = require('./Creatures/_ProcCreature.js');
var RACES = ['bss01', 'lilquad', 'bassdr01', 'tick', 'rectr', 'snare01', 'pno'];
var BOARDPOSITIONS = {'691': 0, '268': 1, '581': 3, '761': 5, '528': 13, '286': 17, '484': 28, '99': 30, '222': 32, '903': 37};

module.exports = Spawner;

///////////////////// THE SPAWNER
// keeps kontrol of all the spawings
// (the k is on purpose for alliteration reasons)
//
// Tactics:

// see .filter

// Generally: not more than maybe 25 or so?
// handle breakdowns: if there is way too much going on, spawn break,
// 	ignore further hits during that time, maybe deactivate markers


// manage "users"? Maybe one color per user/client






function Spawner(world) {
	this._w = world;
	
	this.boardsSorted = [ ];
	for(i in BOARDPOSITIONS) {
		this.boardsSorted.push(i);
	}
	this.boardIndexById = { };
	for(i in this.boardsSorted) {
		this.boardIndexById[this.boardsSorted[i]] = i;
	}
	
	this.bdLastSilence = 0;
}

Spawner.filters = {
	'bss01': function() { },
	'bassdr01': function() { }
}


Spawner.prototype.getaRace = function(boardid) {
	// this checks what's going on in that certain area, then filters out 
	// races that are not so appropriate at that time (and space), chooses
	// randomly from the rest (or maybe do some kind of weighted random)
	var myRaces = RACES.slice();
	
	for (var i = myRaces.length - 1; i >= 0; i--){
		var f = this.filter(myRaces[i], boardid);
		if(f) {
			myRaces.splice(i, 1);
		}
	};
	console.log(myRaces);
	return myRaces[Math.floor(Math.random() * myRaces.length)];
}

// return TRUE if that creature should be taken out of the equation
Spawner.prototype.filter = function(race, boardid) {
	var racePositions = this.getRacesByPositions();
	if(race == 'bassdr01') {
		// BASSDRUM
		// At least one most of the time, only occasionally remove it (break)
		// But: keep some distance between bassdrums
		
		// max 5 ones
		if(racePositions[race].length > 5) {
			return true;
		}
		// filter it if another bass is running nearby (less than one planes away)
		// racepositions are boardids
		// compare each to current boardid in boardIndexById
		if(this.filterByDistance(racePositions, boardid, 1)) {
			return true;
		}
	}
	if(race == 'bss01') {
		// BSS
		// same as bassdrum bass-ically
		// max 5 ones
		if(racePositions[race].length > 5) {
			return true;
		}
		// filter by distance
		if(this.filterByDistance(racePositions, boardid, 1)) {
			return true;
		}
	}
	if(race == 'snare01') {
		// SNARE
		// Don't do to much, maybe max 5, keep one running for 66% of the time in auto mode
		
		// max 5 ones
		if(racePositions[race].length > 5) {
			return true;
		}
	}
	
	// Rectr, lilquad, tick, pno: all the time
	return false;
}
Spawner.prototype.filterByDistance = function(racePositions, boardid, distance) {
	for(i in racePositions) {
		var thisindex = this.boardIndexById[boardid];
		var thatindex = this.boardIndexById[racePositions[i]];
		if(Math.abs(thatindex - thisindex) <= distance) {
			return true;
		}
	}
	return false;
}

Spawner.prototype.getRacesByPositions = function() {
	var rbps = { };
	for(i in RACES) {
		rbps[RACES[i]] = [ ];
	}
	for(i in this._w.creatures) {
		if(this._w.creatures[i].race) {
			rbps[this._w.creatures[i].race].push(this._w.creatures[i].roots[0]);
		}
	}
	return rbps;
}

Spawner.prototype.spawnAtRandom = function(race, distance) {
	var x = Math.random();
	var y = Math.random();
	var board;
	if(distance > 0) {
		var racePositions = this.getRacesByPositions();
		var t = true;
		var n = 0;
		while (t && n < 15) {
			board = this.boardsSorted[Math.floor(Math.random() * this.boardsSorted.length)];
			t = this.filterByDistance(racePositions, board, distance); // true if board is too close
			n++;
		}
	} else {
		board = this.boardsSorted[Math.floor(Math.random() * this.boardsSorted.length)];
	}
	this.spawn(board, x, y, race);
}

Spawner.prototype.spawn = function(boardid, x, y, race) {
	
	// spawn only 25 creatures MAX
	if(this._w.creatures.length >= 25) {
		console.log("creature overflow!");
		return false;
	}
	
	var c = new Creature(this._w);
	var spwnCoords = this._w.findGridCoords(boardid, x, y);
	// var spwnCoords = this.findGridCoords(581, x, y);
	
	if(spwnCoords) {
		// c.spawn();
		// c.setRootCoords(spwnCoords[0], spwnCoords[1], spwnCoords[2]);
		var myRace;
		if(race == null) {
			myRace = this.getaRace(boardid);
		} else {
			myRace = race;
		}
		c.spawn(myRace, [spwnCoords[0], spwnCoords[1], spwnCoords[2]]); // spawn takes race and rootcoords
		// c.spawn('tick', [spwnCoords[0], spwnCoords[1], spwnCoords[2]]); // spawn takes race and rootcoords
		if(this._w.baseclr) {
			c.setColor(this._w.baseclr);
		}
		this._w.creatures.push(c);
		this._w._creaturesByUid[c.uid] = c;
	} else {
		console.log("couldn't find point for creature");
	}
}


Spawner.prototype.breakit = function() {
	console.log("breaking it from spawner!");
	this._w.oscSndr.send('/world/break');
}


Spawner.prototype.autoMode = function(cpg) {
	cpg = cpg || 3; // max creatures per grid
	
	// counts creatures per grid
	// if there are less than 3 creatures per grid, maybe spawn one
	// creatures have limited life spans, so they die anyways
	var gridCreatureCounts = {};
	for (i in this._w.creatures) {
		if(!gridCreatureCounts[this._w.creatures[i].roots[0]]) {
			gridCreatureCounts[this._w.creatures[i].roots[0]] = 1;
		} else {
			gridCreatureCounts[this._w.creatures[i].roots[0]] += 1;
		}
	}
	for(i in this._w.grids) {
		var g = this._w.grids[i];
		if(!gridCreatureCounts[g.id]) {
			gridCreatureCounts[g.id] = 0;
		}
		var spawnProp = (1 - Math.min(cpg, gridCreatureCounts[g.id]) / cpg) * 0.02; // 0.1 to 0
		if(Math.random() < spawnProp) {
			this.spawn(g.id, Math.random(), Math.random());
			// console.log("spawing on", g.id);
		}
	}
}

Spawner.prototype.smartMode = function() {
	// smart mode
	// keep 1 to 2 bassdrums running most of the time
	// keep 1 to 3 snares running moste of the time
	// spawn other stuff occasionally, maybe up to three in total (without bassdrum and snare)
	// after a while hit a break if it didn't automatically because of "overdrive"
	
	var racePositions = this.getRacesByPositions();
	
	// bassdrum
	var bdcount = racePositions['bassdr01'].length;
	var minbds = 1 + (Math.sin(process.uptime() * (Math.PI * 2) / 145) / 2 + 0.5) * 3;
	// console.log(minbds);
	if(bdcount < minbds) {
		var prop = 1 / (10 * 15) * (2 - bdcount);
		// var prop = 1 / (10 * 15);
		// var prop = 0.3;
		if(Math.random() < prop) {
			this.spawnAtRandom('bassdr01', 3);
		}
	}
	
	var sncount = racePositions['snare01'].length;
	var minsns = (Math.sin(process.uptime() * (Math.PI * 2) / 122) / 2 + 0.5) * 3;
	if(sncount < minsns) {
		var prop = 1 / (10 * 10) * (1 - sncount);
		if(Math.random() < prop) {
			this.spawnAtRandom('snare01', 2)
		}
	}
	
	var bsscount = racePositions['bss01'].length;
	if(bsscount < 1) {
		var prop = 1 / (10 * 10) * (1 - bsscount);
		if(Math.random() < prop) {
			this.spawnAtRandom('bss01', 2)
		}
	}
	
	
	var prop = 1 / (10 * 20) * (5 - this._w.creatures.length);
	if(Math.random() < prop) {
		// spawn another race (except bassdr, snare, bss);
		var myRaces = RACES.slice();
		var myRace = null;
		while(myRace != null && myRace != 'bss01' && myRace != 'snare01' && myRace != 'bassdr01') {
			myRace = myRaces[Math.floor(Math.random() * myRaces.length)];
		}
		this.spawnAtRandom(myRace);
	}
	// console.log(this._w.creatures.length);
	
	
	// do a break every 185 to xxx seconds (roughly)
	if(process.uptime() - this.lastBreak > 185) {
		var prop = 1 / 20 / 60;
		if(Math.random() < prop) {
			this.breakit();
			this.lastBreak = process.uptime();
		}
	}
	// also do a break if there are too many creatures
	if(this._w.creatures.length > 18 && (process.uptime() - this.lastBreak > 60)) {
		var prop = 1 / 20 / 5 * (10 - (this._w.creatures.length - 20));
		console.log("overflow????", prop);
		if(Math.random() < prop) {
			console.log("!!!!!!!!!!!!!!!!!!!!!! broken it!!!");
			this.breakit();
			this.lastBreak = process.uptime();
		}
	}
	
}