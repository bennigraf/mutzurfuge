var osc = require('node-osc');
var oscCli = new osc.Client('127.0.0.1', 5000);
var Colr = require("tinycolor2");
// color = new Colr("hsv 0.3 1 1");

var Grid = require('./Grid.js');
var World = require('./World.js');

var wrld = new World();
wrld.setOscServer(12332, '0.0.0.0');
wrld.setOscClient(57120, '0.0.0.0');
wrld.setTcpServer(12333, '0.0.0.0');

// each grid has one or more transitions to other grids; 
// and obviously a size and an address
// and a gravity would be nice
wrld.addGrid({
	id: 484, // f6
	size: [43, 17],
	pos: [0, 0],
	address: ["10.0.0.2", 5100],
	gravity: 'down',
	transitions: [['bottom', [99]]]
});
wrld.addGrid({
	id: 99, // f7
	size: [43, 40],
	// size: [43, 27],
	pos: [0, 0],
	address: ["10.0.0.1", 5102],
	gravity: 'none',
	transitions: [['top', [484, 286]], ['bottom', [222]]] // also connected to f9
});
// this one is "upside down"
wrld.addGrid({
	id: 222, // f8
	size: [43, 17],
	pos: [0, 0],
	address: ["10.0.0.3", 5000],
	gravity: 'up',
	transitions: [['top', [99]]]
});
wrld.addGrid({
	id: 286, // f5, connected to f7
	size: [43, 17],
	pos: [0, 0],
	address: ["127.0.0.1", 6002],
	gravity: 'down',
	transitions: [['top', [99]]]
});

// runs the world! How epic!
wrld.run();

wrld.spawnCreature(99, Math.random(),Math.random());
wrld.spawnCreature(99, Math.random(), Math.random());
wrld.spawnCreature(99, Math.random(), Math.random());
wrld.spawnCreature(99, Math.random(), Math.random());
wrld.spawnCreature(99, Math.random(), Math.random());

////////////////////////// now:
// Creatures are 'blind', they don't see the whole world and what's going on it.
// They live in their own space (that means have their own array of tiles).
// On each 'move' they can check what's going on on specific tiles in their 
// neighbourhood, thoug. So they kind of feel their direct surroundings.
// On each world tick the creature tells the world where it wants to be (which
// tiles are active). The world manages those tiles and draws them to the right
// grids (and also manages addition of color values of tiles etc). 
//
// So I need:
// * Creatures that define their own space/tileset
// * World that has a master-copy of all existing tiles, incl. their state
// 	(occupied (hard or soft), id of creature who occupies, clr of creature)
// * World-Api to 
//	* check for state of tile (free, occupied, ...)
//	* check if tile is valid at all or is outside of the world











