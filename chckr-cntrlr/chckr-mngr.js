var osc = require('node-osc');
var oscCli = new osc.Client('127.0.0.1', 5000);
var Colr = require("tinycolor2");
// color = new Colr("hsv 0.3 1 1");

var Grid = require('./Grid.js');
var World = require('./World.js');

var wrld = new World();
wrld.setOscServer(12332, '0.0.0.0');
wrld.setOscClient(57120, '0.0.0.0');

// each grid has one or more transitions to other grids; 
// and obviously a size and an address
// and a gravity would be nice
/*
wrld.addGrid({ // f0
	id: 691,
	size: [43, 17],
	markerpos: 'tl',
	address: ["10.0.0.12", 5100],
	gravity: 'down',
	transitions: [['top', [581]]]
});
wrld.addGrid({ // f1
	id: 268,
	size: [43, 17],
	markerpos: 'tr',
	address: ["10.0.0.10", 5100],
	gravity: 'down',
	transitions: [['bottom', [581]]]
});
wrld.addGrid({ // f2
	id: 581,
	size: [43, 40],
	markerpos: 'tr',
	address: ["10.0.0.14", 5100],
	gravity: 'down',
	transitions: [['bottom', [761]], ['top', [268, 691]]] // connection also to f0
});
wrld.addGrid({ // f3
	id: 761,
	size: [30, 17],
	markerpos: 'tl',
	address: ["10.0.0.12", 5101],
	gravity: 'down',
	transitions: [['top', [581, 286]]] // also to middle part
});

// mitte unten
wrld.addGrid({ // f4
	id: 528,
	size: [30, 17],
	markerpos: 'tr',
	address: ["10.0.0.11", 5100],
	gravity: 'down',
	transitions: [['top', [484]]] // to f6/balkon hinten oben seite
});
wrld.addGrid({ // f5
	id: 286,
	size: [30, 17],
	markerpos: 'tl',
	address: ["10.0.0.13", 5100],
	gravity: 'down',
	transitions: [['top', [761]]] // to f3/balkon oben seite
});

// balkon oben hinten
wrld.addGrid({ // f6
	id: 484,
	size: [43, 17],
	markerpos: 'tr',
	address: ["10.0.0.12", 5102],
	gravity: 'down',
	transitions: [['bottom', [99, 528]]] // back down to middle/f4
});
wrld.addGrid({ // f7
	id: 99,
	size: [43, 40],
	markerpos: 'tr',
	address: ["10.0.0.14", 5101],
	gravity: 'down',
	transitions: [['bottom', [222, 903]], ['top', [484]]] // also to f9
});
wrld.addGrid({ // f8
	id: 222,
	size: [43, 17],
	markerpos: 'tl',
	address: ["10.0.0.15", 5100],
	gravity: 'down',
	transitions: [['top', [99]]]
});

// hinten außen
wrld.addGrid({ // f9
	id: 903,
	size: [43, 17],
	markerpos: 'tr',
	address: ["10.0.0.14", 5102],
	gravity: 'down',
	transitions: [['bottom', [99]]] // back to f7/balkon oben
});
// */
// /*
wrld.addGrid({ // f0 - tl
	id: 691,
	size: [43, 17],
	markerpos: 'tl',
	address: ["127.0.0.1", 5100],
	gravity: 'down',
	transitions: [['right', [268]], ['bottom', [581]]]
});
wrld.addGrid({ // f1 - tr
	id: 268,
	size: [43, 17],
	markerpos: 'tr',
	address: ['127.0.0.1', 5101],
	gravity: 'down',
	// transitions: [['left', [691]], ['bottom', [761]]]
	transitions: [['left', [691]]]
});
wrld.addGrid({ // f2 - bl
	id: 581,
	size: [43, 40],
	markerpos: 'tr',
	address: ["127.0.0.1", 5102],
	gravity: 'down',
	// transitions: [['right', [761]], ['top', [691]]] // connection also to f0
	transitions: [['top', [691]]] // connection also to f0
});
/*
wrld.addGrid({ // f3 - br
	id: 761,
	size: [30, 17],
	markerpos: 'tl',
	address: ["127.0.0.1", 5103],
	gravity: 'down',
	transitions: [['left', [581]], ['top', [268]]] // also to middle part
});

// */

// runs the world! How epic!
wrld.run();

// wrld.mode = "mawi";

wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());
// wrld.spawnCreature(268, Math.random(), Math.random());

// wrld.spawnCreature(691, Math.random(), Math.random());
// wrld.spawnCreature(581, Math.random(), Math.random());
// wrld.spawnCreature(761, Math.random(), Math.random());
// wrld.spawnCreature(528, Math.random(), Math.random());
// wrld.spawnCreature(286, Math.random(), Math.random());
// wrld.spawnCreature(484 , Math.random(), Math.random());
// wrld.spawnCreature(99, Math.random(), Math.random());
// wrld.spawnCreature(222, Math.random(), Math.random());
// wrld.spawnCreature(903, Math.random(), Math.random());

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











