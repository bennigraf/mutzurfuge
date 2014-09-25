s.options.device_(ServerOptions.devices[3]);
s.options.memSize_(s.options.memSize * 32)
s.boot
s.quit
s.scope
s.latency_(0.5)

(
x.free;
x = {
	var ticktrig = \ticktrig.tr(0);
	var action = \action.kr(0).linlin(0, 0.1, 0, 1);

	var snd = SinOsc.ar(6382 + TRand.ar(0, 9283, ticktrig));
	var nv = EnvGen.ar(Env.linen(0.001, 0, 0.001), ticktrig);

	snd = BPF.ar(snd, 1382 + {TRand.ar(0, 9283, ticktrig)}!2, 0.3);
	snd = HPF.ar(snd, (17000 - (action * 13000)), (-12 * (1-action)).dbamp);

	snd = snd * nv * 4.dbamp;

	snd = snd + GVerb.ar(snd, 23, 3.8, 0.53, mul: 3.dbamp).sum;
}.play
);

~creatures = ();
(
~creatures.keysValuesDo({ |uid, snth|
	snth.free;
});
~creatures = ();
OSCdef(\tick, { |msg|
	// msg.postln;
	x.set(\ticktrig, 1);
}, '/world', nil, nil, [{|myarg| myarg == 'tick' }]);
OSCdef(\action, { |msg|
	if(msg[1] == 213, {
		x.set(\action, msg[2]);
	})
	// msg.postln;
}, '/grid/action');
OSCdef(\spawnCreature, { |msg|
	var uid = msg[1];
	var race = msg[2];
	[race, uid].postln;
	// create synth of type race
	// add to creatures-object under key uid
	~creatures[uid] = Synth(race);
	~creatures[uid].set(\alive, 1);
}, '/creature/spawn');
OSCdef(\killCreature, { |msg|
	var uid = msg[1];
	["killing", uid].postln;
	~creatures[uid].set(\alive, 0);
}, '/creature/kill');
OSCdef(\setCrtrValue, { |msg|
	var uid = msg[1];
	// set values pairwise, allows setting multiple via one osc call to sclang
	((msg.size - 2)/2).do({ |n|
		// [msg[n*2 + 2], msg[n*2 + 2 + 1]].postln;
		~creatures[uid].set(msg[n*2 + 2], msg[n*2 + 2 + 1]);
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
)