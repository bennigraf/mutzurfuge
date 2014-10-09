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
	// var ticktrig = Impulse.kr(15 * 4);
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
	snd = snd * { SinOsc.ar(1/Rand(10, 22), Rand(0, 2pi)).range(-9, 0).dbamp }!6;

	Out.ar(0, snd * -17.dbamp);
}).play
)
s.scope
({
	var lammpsnum = 4;
	if(~bss_bus.isNil, {
		~bss_bus = Bus.audio(s, lammpsnum * 3);
	});
	if(~bss_kbus.isNil, {
		~bss_kbus = Bus.control(s, lammpsnum * 3);
	});
	~bss_recv.free;
	s.sync();
	~bss_recv = {
		var buses = In.ar(~bss_bus, lammpsnum * 3);

		var lammpsnum = 4;
		var fakesig;

		/*
		var dels = ({ |m| (2pi / lammpsnum * m).cos }!lammpsnum) / 2 - 0.5;
		dels = dels.abs;
		lammpsnum.do({ |n|
			dels.do({|d, m|
				var ndx = (m+n*3).wrap(0, lammpsnum*3-1);
				3.do({|o|
					b = buses[ndx + o];
					// buses[ndx + o] = b + DelayL.ar(b, 0.6, 0.6 * d, d > 0);
				});
			});
		});
		*/

		lammpsnum.do({ |n|
			var col = [buses[n*3], buses[n*3+1], buses[n*3+2]] * 0.1;
			(lammpsnum - 1).do({ |m|
				3.do({|l|
					var d;
					b = buses[(n + m+1)%lammpsnum * 3 + l];
					d = CombL.ar(b, 0.3, 0.3, 2) * 0.5;
					buses[(n + m+1)%lammpsnum * 3 + l] = d + b;
				});
			});
		});

		fakesig = { SinOsc.ar(1/Rand(12, 19), Rand(0, 2pi)).range(0, 0.3)}!(lammpsnum*3);
		fakesig = Compander.ar(fakesig, buses, 0.2, 1, 1/20, 0, 0.7);

		buses = Clip.ar(buses, 0, 1);

		// ReplaceOut.ar(~bss_bus, buses);
		Out.kr(~bss_kbus, A2K.kr(fakesig + buses));
		0;
	}.play(addAction: \addToTail);
}.fork);

(
~world_master.free;
~world_master = {
	var snd = In.ar(0, 6);
	var subwoof;

	// Amplitude.ar(snd).ampdb.poll(1);
	snd = CompanderD.ar(snd, -19.dbamp, 1, 1/3, 0.01, 0.04);
	snd = Limiter.ar(snd, -3.dbamp);

	subwoof = LPF.ar(snd.sum * -3.dbamp, 80);
	subwoof = Limiter.ar(subwoof, -3.dbamp);
	Out.ar(7, subwoof);

	// snd = snd * -88.dbamp;

	// ReplaceOut.ar(0, snd);
	snd = snd.collect({|snd, n| Pan2.ar(snd, (1/5 * n * 2 - 1)) }).sum;
	ReplaceOut.ar(0, snd ++ [0, 0, 0, 0]);
	0;
}.play(addAction: \addToTail)
);