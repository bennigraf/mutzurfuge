~nodeOSC = NetAddr("127.0.0.1", 12332);

~creatures = ();
(
~creatures.keysValuesDo({ |uid, snth|
	snth.free;
});
~creatures = ();
OSCdef(\action, { |msg|
	if(msg[1] == 213, {
		x.set(\action, msg[2]);
	})
	// msg.postln;
}, '/grid/action');
OSCdef(\spawnCreature, { |msg|
	var uid = msg[1];
	var race = msg[2];
	// ["spawn", race, uid].postln;
	// create synth of type race
	// add to creatures-object under key uid

	~creatures[uid] = Synth(race, [\alive, 1]);
}, '/creature/spawn');
OSCdef(\killCreature, { |msg|
	var uid = msg[1];
	// ["killing", uid].postln;
	~creatures[uid].set(\alive, 0);
	~creatures.removeAt(uid);
}, '/creature/kill');
OSCdef(\setCrtrValue, { |msg|
	var uid = msg[1];
	// set values pairwise, allows setting multiple via one osc call to sclang
	if(~creatures[uid].notNil, {
		((msg.size - 2)/2).do({ |n|
			~creatures[uid].set(msg[n*2 + 2], msg[n*2 + 2 + 1]);
		});
	});
}, '/creature/setValue');
OSCdef(\setPanValue, { |msg|
	var uid = msg[1];
	var numg = msg[2];
	var gid = msg[3];
	// map gid to position on 1 axis
	// grid ids to distance in m from f0
	var gridIdToPos = ('691': 0, '268': 1, '581': 3, '761': 5, '528': 13, '286': 17, '484': 28, '99': 30, '222': 32, '903': 37);
	var posScaled = gridIdToPos.at(gid) / 37;
	// [uid, numg, gid, posScaled].postln;
	~creatures[uid].set(("panpos"++numg).asSymbol, posScaled);
	~creatures[uid].set(("pantrig"++numg).asSymbol, 1);
}, '/creature/setOutGrid');
OSCdef.newMatching(\creatureBack, { |msg|
	var synthid = msg[1];
	// msg.postln;
	~creatures.keysValuesDo({ |uid, syn|
		if(syn.nodeID == synthid, {
			var mmsg = ['/fromCreature', uid] ++ msg[3..];
			// mmsg.postln;
			~nodeOSC.sendMsg(*mmsg); // * unpacks array to arguments
		});
	});
}, '/fromCreature');
)
OSCdef.trace(true)
OSCdef.trace(false)

~creatures.size


