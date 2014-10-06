(
~world_divider.free;
~div_buses.do({|b|b.free});
~div_buses = ();
[32, 16, 8, 4, 2, 1, 0.5, 'tempo'].collect({|d|
	~div_buses[d] = Bus.control(s, 1);
});
~world_divider = {
	var rawtrig = \ticktrig.tr(0);

	var tme = Timer.kr(rawtrig).lag(25).max(0.0001);
	var ticktrig = Impulse.kr((tme.reciprocal * 8).max(0.1));
	// var ticktrig = Impulse.kr(15 * 16);
	// var tme = Timer.kr(ticktrig).lag(25);

	// pulse dividers from here...
	var thrtytws = PulseDivider.kr(ticktrig, 16);
	var sxtns = PulseDivider.kr(thrtytws, 2);
	var eights = PulseDivider.kr(sxtns, 2);
	var quarts = PulseDivider.kr(eights, 2);
	var halfs = PulseDivider.kr(quarts, 2);
	var wholes = PulseDivider.kr(halfs, 2);
	var doubles = PulseDivider.kr(wholes, 2);
	SendReply.kr(thrtytws, '/triggers/thrtytws', 1);
	SendReply.kr(sxtns, '/triggers/sxtns', 1);
	SendReply.kr(eights, '/triggers/eights', 1);
	SendReply.kr(quarts, '/triggers/quarts', 1);
	SendReply.kr(halfs, '/triggers/halfs', 1);
	SendReply.kr(wholes, '/triggers/wholes', 1);
	SendReply.kr(doubles, '/triggers/doubles', 1);
	Out.kr(~div_buses[32], thrtytws);
	Out.kr(~div_buses[16], sxtns);
	Out.kr(~div_buses[8], eights);
	Out.kr(~div_buses[4], quarts);
	Out.kr(~div_buses[2], halfs);
	Out.kr(~div_buses[1], wholes);
	Out.kr(~div_buses[0.5], doubles);
	Out.kr(~div_buses['tempo'], tme.reciprocal.max(0.000000001));
	0;
}.play;
)

(
~world_ticks.free;
~world_ticks = SynthDef(\worldticker, {
	var delsnd = Silence.ar;
	// var ticktrig = In.kr(~div_buses[32]);
	var ticktrig = Impulse.kr(In.kr(~div_buses['tempo']) * 2);
	var action = \action.kr(0).linlin(0, 0.1, 0, 1);

	var snd = SinOsc.ar(6382 + TRand.ar(0, 9283, ticktrig));
	var nv = EnvGen.ar(Env.linen(0.001, 0, 0.001), ticktrig);

	snd = BPF.ar(snd, 1382 + {TRand.ar(0, 9283, ticktrig)}!2, 0.3);
	snd = HPF.ar(snd, (17000 - (action * 13000)), (-12 * (1-action)).dbamp);
	snd = BHiShelf.ar(snd, 1800, 3, -19);

	snd = snd * nv * 4.dbamp;

	4.do({|n|
		var trig = TWChoose.kr(In.kr(~div_buses[8]), [1, 0], [1/100, 99/100]);
		var nv = EnvGen.kr(Env.linen(8, 7, 13, 1, 'cub'), trig);
		var time = (0.3 * (n+1)).postln + LFNoise1.kr(1/7.3).range(-0.03, 0.03);
		delsnd = delsnd + CombC.ar(snd, time, 60 / 75 / 2 / 2 / 2, 3.3, nv);
	});
	snd = snd + (delsnd * -12.dbamp);


	snd = snd + GVerb.ar(snd, 63, 4.8, 0.33, mul: 3.dbamp).sum;

	Out.ar(0, snd!2 * -10.dbamp);
}).play
)