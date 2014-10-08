(
SynthDef(\tick, {

	var presnd, snd, snd1, snd2, trig, nv, nv2, microdelay;
	var dtrig, seq, d, x;

	var tme = In.kr(~div_buses['tempo']).reciprocal * 2;
	var note = TChoose.kr(In.kr(~div_buses[0.5]), [-3, -2, 0, 6]);
	var mod = 1;

	presnd = LPF.ar(Saw.ar((75+note).midicps), 88.midicps) * LFPulse.ar(13, 0, 0.14).softclip * -13.dbamp;
	presnd = FreeVerb.ar(presnd, 0.7, 0.8, 0.2);
	presnd = RHPF.ar(presnd,
		EnvGen.ar(Env.linen(1.9, 10, 10), 1).linexp(0, 1, 18000, 2000) + LFNoise2.kr(1/3.8).range(-400, 800),
		EnvGen.ar(Env.linen(1.9, 10, 10), 1).linlin(0, 1, 0.3, 0.93));
	presnd = presnd * SinOsc.ar(1/Rand(1.1, 3.2), Rand(0, 2pi)).range(-5.dbamp, 1);

	note = 0;

	trig = In.kr(~div_buses[4]) * ToggleFF.kr(Dust.kr(1/4));
	trig = trig * (1-Trig1.kr(TDelay.kr(trig), 3));
	// trig = PulseDivider.kr(trig, 2, 2);

	dtrig = Select.kr(mod>1, [In.kr(~div_buses[32]), In.kr(~div_buses[16])]);
	seq = Dseq([Dshuf([0, 3, 5, 9, 11, -3, -5]), 0] , 1);
	d = Demand.kr(dtrig, trig, seq);
	d = d * Trig1.kr(trig, tme * 5.3 *mod).lag(0.09) + DelayC.kr(d, tme * 6 *mod, tme * 6 *mod);

	nv = EnvGen.kr(Env.perc(0.01, 0.21), Changed.kr(d));
	nv2 = Trig1.kr(trig, tme * 11.7 *mod).lag(0.09);
	snd1 = LPF.ar(Pulse.ar((75+note+d).midicps), 71.midicps, 9.dbamp);
	snd2 = (Saw.ar((75+d+note).midicps.lag(0.01)) * Decay.ar(Trig.ar(dtrig, 0.03), 0.01).softclip);
	snd = SelectX.ar(TRand.kr(0, 1, dtrig).lag(0.1), [snd1, snd2]);

	snd = (snd + BrownNoise.ar(-43.dbamp)) * nv * nv2;
	snd = (snd * 20.dbamp).softclip * -22.dbamp;

	snd = FreeVerb.ar(snd, 0.48, 0.33, 0.1);
	microdelay = CombC.ar(snd, tme, tme/4 + LFNoise2.kr(1/3).range(-0.02, 0.02), 2*mod, -10.dbamp);
	snd = snd + Compander.ar(microdelay, snd, -39.dbamp, 1, 1/8, 0.01, 0.23);
	snd = snd + LPF.ar(CombC.ar(snd, 3, tme * 4, 7, 1), 1230, -8.dbamp);
	snd = RLPF.ar(snd, 4493 + SinOsc.kr(1/23, Rand(0, 2pi)).range(-1233, 2493), 0.7);

	presnd = Compander.ar(presnd, snd, -39.dbamp, 1, 1/6, 0.01, 2.4);
	snd = snd + presnd;
	snd = snd * EnvGen.ar(Env.asr(1.1, 1, 2.5), \alive.ar(1), doneAction: 2);

	snd = snd * -15.dbamp;

	// Out.ar(0, snd!2);
	~myPanningLaw.value(snd);

	x = {
		var fft = FFT(LocalBuf(512), snd);
		var onset = Onsets.kr(fft, -10.dbamp);
		SendReply.kr(onset, '/fromCreature', [11, d]);
	}.value();

	x = {
		var t = TDelay.kr(trig, tme * 11.7 *mod);
		SendReply.kr(t, '/fromCreature', [19]);
	}.value();
}).add;
)

(
SynthDef(\bassdr01, {
	var snd, del, x;

	var stream = [
		In.kr(~div_buses[4]),
		PulseDivider.kr(In.kr(~div_buses[8]), 4, 2),
		PulseDivider.kr(In.kr(~div_buses[8]), 3, 2),
		PulseDivider.kr(In.kr(~div_buses[4]), 3, 2),
		PulseDivider.kr(In.kr(~div_buses[8]), 5, 4)
	];
	var trig = TChoose.kr(1, stream);

	var dfacts = [[3, 5], [3, 3], [5, 8], [1, 2], [0.25, 2]];
	var tme = In.kr(~div_buses['tempo']).reciprocal * 2;

	var nv = EnvGen.kr(Env.perc(0.01, 0.27), trig);
	var note = TChoose.kr(In.kr(~div_buses[1]), [-3, -2, 0, 4]);

	snd = LPF.ar(Saw.ar((32+note).midicps), 60);
	snd = snd + LPF.ar(BrownNoise.ar(-12.dbamp), 88);
	snd = snd * nv;
	snd = (snd * 13.dbamp).softclip * -6.dbamp;

	dfacts = TChoose.kr(1, dfacts);
	del = RHPF.ar(CombC.ar(snd, 3, tme * dfacts[0], dfacts[1], 1), 230 + SinOsc.kr(1/18).range(-30, 100), 0.8);

	snd = snd + del;

	SendReply.kr(trig, '/fromCreature', [13]);
	x = {
		var fft = FFT(LocalBuf(512), del);
		var onset = Onsets.kr(fft, -30.dbamp);
		// Trig1.kr(onset, 0.3).poll;
		SendReply.kr(Trig1.kr(onset, 0.5), '/fromCreature', [14]);
	}.value();

	snd = snd * EnvGen.ar(Env.asr(0, 1, 7.5), \alive.ar(1), doneAction: 2);
	// Out.ar(0, snd!2);
	snd = snd * 6.dbamp;
	// Amplitude.ar(snd, 0, 2).ampdb.poll;

	~myPanningLaw.value(snd);
}).add;
);

(
SynthDef(\bss01, {
	var snd, nv, fnv, ftrig, tme, note, mod;
	var fnv2;
	var rev, spc;

	mod = TRand.kr(2, 6, In.kr(~div_buses[1])).round/2;
	ftrig = In.kr(~div_buses[16]);
	ftrig = PulseDivider.kr(ftrig, mod);
	tme = (In.kr(~div_buses['tempo']).reciprocal * 8 / SelectX.kr(mod, [0, 2, 1.5, 1, 0.75, 0.5])); // 8 is probably eights

	note = TChoose.kr(In.kr(~div_buses[1]), [-2, 0, 3, 5]).lag(0.3);
	note = 32 + note;

	snd = LFPulse.ar(note.midicps) + Saw.ar(note.midicps + LFNoise1.kr(1/17.3).range(-2, 2), pi/3);
	nv = 1-EnvGen.kr(Env.perc(0, tme/2, 1, 2), ftrig);
	snd = snd * nv;

	fnv = 1-Decay2.kr(ftrig, 0, 0.5).clip(0, 1);
	fnv = 1-EnvGen.kr(Env.perc(0, tme, 1, 2), ftrig);

	snd = RLPF.ar(snd, fnv.linlin(0, 1, 48, Rand(639, 1233)), 0.2);

	snd = (snd * -8.dbamp).clip * 4.dbamp;
	snd = RLPF.ar(snd, 5922, 2.5);
	snd = MidEQ.ar(snd, 53, 0.8, 12);

	fnv2 = SinOsc.kr(1/Rand(11, 19), Rand(0, 2pi));
	snd = RLPF.ar(snd, fnv2.range(69, 1000), 0.4);
	snd = snd + (DelayC.ar(snd, 0.05, SinOsc.ar(1/Rand(16, 12)).range(0, 0.05)) * SinOsc.kr(1/Rand(11, 19), Rand(0, 2pi)));

	snd = snd * -35.dbamp;

	snd = snd * EnvGen.ar(Env.asr(1.2, 1, 3.5), \alive.ar(1), doneAction: 2);
	rev = HPF.ar(GVerb.ar(snd, 63, 4.2, 0.48, drylevel: 0, mul: -11.dbamp), 440);
	spc = EnvGen.ar(Env.asr(7.3, 1, 3), \alive.ar(1), doneAction: 2) ** 1;

	snd = SelectX.ar(spc, [rev, snd]);

	snd = MidEQ.ar(snd, 93, 1.8, 6);

	fnv = fnv * SinOsc.kr(1/Rand(11, 19), Rand(0, 2pi)).range(0, 1);
	SendReply.kr(Impulse.kr(20), '/fromCreature', [11, fnv ** 0.5]);

	snd = snd.sum * -12.dbamp;

	// Out.ar(0, snd!2);
	// Amplitude.ar(snd).ampdb.poll;

	~myPanningLaw.value(snd);
}).add;
)


s.volume.volume = -88

(
SynthDef(\rectr, {
	var snd, cmbsnd;
	var panenv1, panenv2, panenv3, panenv4;
	var pannedout1, pannedout2, pannedout3, pannedout4;
	var frqs = {|n|
		83 + (n * 30) + Rand(-10, 10) * LFNoise1.kr(1/4.8).range(0.9, 1.1)
	}!4;

	var filtfrq = (((\rotation.kr(0) % (pi/2)) / (pi/2)) * pi).sin * 800 + 193;

	// this is supposed to avoid double triggers, but it doesn't work...
	// var wallhit = Trig.ar(Trig.ar(\wallhit.tr, 0.1).poll * (1 - Trig.ar(TDelay.ar(Trig.ar(\wallhit.tr), 0.05), 1.2)).poll);
	var wallhit = Trig.ar(\wallhit.tr);

	frqs = frqs + \speed.kr(0).linexp(0, 1, 0.1, 200).lag(3) + \size.kr(0).linexp(0.001, 1, 220, 1).lag(0.02);

	snd = SinOsc.ar(frqs, Rand(0, pi), -12.dbamp).sum.softclip;
	snd = RLPF.ar(snd, filtfrq, 0.3);
	snd = HPF.ar(snd, 180);

	// on "wall hit", feed stuff into short delay
	cmbsnd = CombC.ar(snd * Trig.kr(\wallhit.tr(0), 0.03).lagud(0.0, 0.04), 0.1, 0.03, 1.3);
	cmbsnd = HPF.ar((cmbsnd * 22.dbamp).softclip, 5892, -0.dbamp);
	cmbsnd = MidEQ.ar(cmbsnd, 11000, 1, 4);
	cmbsnd = cmbsnd * EnvGen.ar(Env.linen(0, 0.3, 1.1), TDelay.ar(wallhit, 0.08));
	cmbsnd = FreeVerb.ar(cmbsnd, 0.45, 0.89, 0.01, 6.dbamp) * EnvGen.ar(Env.linen(0.73, 3, 1), wallhit);
	cmbsnd = cmbsnd * 12.dbamp;
	snd = snd + cmbsnd;


	snd = snd * EnvGen.ar(Env.asr(0, 1, 0.5), \alive.ar(1), doneAction: 2);
	snd = snd * -24.dbamp;

	~myPanningLaw.value(snd);
}).add;
)




(
SynthDef(\lilquad, {
	var snd, revsnd, x;
	var panenv1, panenv2, panenv3, panenv4;
	var pannedout1, pannedout2, pannedout3, pannedout4;

	var offstep = \offstep.tr(0);
	var baseFreq = TRand.kr(0, 1, offstep).linexp(0, 1, 5329, 8392);
	var offstepEnv = EnvGen.ar(Env.asr(0.01, 1, 0.2), offstep);
	snd = SinOsc.ar(baseFreq, 0, 44.dbamp).softclip * LFPulse.ar(19, 0, 0.3) * offstepEnv;
	snd = HPF.ar(snd, 4839);

	revsnd = GVerb.ar(snd, 93, 8, 0.1, drylevel: 0, earlyreflevel: 0, taillevel: 1).sum * -8.dbamp;
	revsnd = BPF.ar(revsnd, baseFreq + 1000, \raysum.kr(0).linlin(0, 1, 0.1, 0.001).lag(2), 20.dbamp);

	snd = MulAdd(snd, -8.dbamp) + (revsnd * \raysum.kr(0).linexp(0, 1, -40, 6).dbamp.lag(2));

	snd = snd * EnvGen.ar(Env.asr(0, 1, 0.5), \alive.ar(1), doneAction: 2);

	x = {
		// this starts a ray
		var rayTrig = In.kr(~div_buses[16]);
		rayTrig = Trig1.kr(Dust.kr(Rand(1, 5.5)), 1/4) * rayTrig;
		SendReply.kr(rayTrig, '/fromCreature', [11]);
		Out.kr(13, rayTrig);
	}.value();

	snd = snd * -26.dbamp;
	// Out.ar(0, snd);

	~myPanningLaw.value(snd);

}).add;
)

(
SynthDef(\snare01, {
		var snd, tick, trig1, trig2, trig3, nv1, nv2, dshot;
	var seq, sntone, snvol, tme;

	tme = In.kr(~div_buses['tempo']).reciprocal * 4;
	// tme.poll;

	snd = PinkNoise.ar + BrownNoise.ar(0.dbamp).softclip;

	trig1 = In.kr(~div_buses[16]);
	nv1 = EnvGen.kr(Env.perc(0.01, 0.051), trig1);

	tick = snd * nv1;
	tick = FreeVerb.ar(tick, 0.69, 0.47, 0.65);
	tick = Compander.ar(tick, tick, -31.dbamp, 1, 1/3, 0.006, 0.2, mul: 8.dbamp);
	tick = ({ RHPF.ar(tick, 3100 + LFNoise2.kr(1/8).range(-2200, 6000), 0.031) }!4).sum;

	trig2 = PulseDivider.kr(In.kr(~div_buses[8]), 4, 2);
	nv2 = EnvGen.kr(Env.perc(0.02, 0.6), trig2);

	trig3 = Trig.ar(Select.kr(Rand(0, 2), [In.kr(~div_buses[0.5]),In.kr(~div_buses[1]),In.kr(~div_buses[2])]));

	seq = Dseq({IRand(77, 107)}!(3+3.rand), inf);
	sntone = Duty.ar(Dseq([1, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6].scramble.keep(4+2.rand) * tme / 2, inf), trig3, seq).midicps;
	snvol = TRand.ar(-16, 0, Changed.ar(sntone));
	// sntone = Demand.kr(trig2, 0, seq).midicps;

	snd = PinkNoise.ar() * EnvGen.ar(Env.perc(0.01,0.011), Changed.ar(sntone)) * snvol.dbamp;
	snd = snd + BrownNoise.ar(5.dbamp).clip * EnvGen.ar(Env.linen(0.01, 0.01, 0.0), Changed.ar(sntone)) * snvol.dbamp;
	snd = RHPF.ar(snd, sntone, LFNoise1.kr(1/1.3).range(0.12, 0.41), 21.dbamp);

	snd = snd + HPF.ar(CombC.ar(snd, 1, tme / IRand(1, 5), tme * 3), 6200, -9.dbamp);
	snd = snd + GVerb.ar(snd, 23, 1.1, mul: -12.dbamp);
	snd = snd * LFPulse.ar(28, 0, 0.4).softclip.range(-9, 0).dbamp;

	// snd = (snd * 2).softclip * nv2;
	// snd = BPF.ar(snd, EnvGen.kr(Env.perc(0.28, 0.8), trig2) * 3893 + 813, 0.4);
	// snd = Decay.kr(trig2, 0.8) * snd * 12.dbamp;
	snd = CompanderD.ar(snd, -24.dbamp, 4, 1, 0.0031, 0.11);

	// occasinal delay shot
	dshot = CombC.ar(tick+snd * Decay.ar(Dust.ar(1/6.3), 1), 0.5, 0.05 + LFNoise2.kr(1/2.8).range(-0.04, 0.05), 6.4);
	snd = snd + (dshot * -12.dbamp);

	snd = snd + (tick * -14.dbamp).softclip;
	snd = Limiter.ar(snd);

	snd = snd * EnvGen.ar(Env.asr(0.5, 1, 0.5), \alive.ar(1), doneAction: 2);

	snd = snd.sum * -28.dbamp;
	// Amplitude.ar(snd).ampdb.poll;

	SendReply.kr(Changed.kr(A2K.kr(sntone)), '/fromCreature', [11, sntone.cpsmidi]);

	~myPanningLaw.value(snd);
}).add;
);

(
var basepath = "/Users/bennigraf/Documents/Studium/MA/stublic-14/code/mutzurfuge/chckr-sounddesign/samples/piano/";
~pnobufs.do({ |b| b.free });
~pnobufs = ['Ab','Bb','Db', 'Eb', 'Gb'].collect({|t|
	Buffer.read(s, basepath++t++"3-3.wav");
});
SynthDef(\pno, {
	var snd, rev, buf, trig, tme, tmp;
	var x;

	var mod = IRand(6, 14)/2;
	trig = PulseDivider.kr(In.kr(~div_buses[8]), mod);
	buf = ~pnobufs.choose;
	buf = Dser(Dshuf(~pnobufs, 1), inf);
	buf = Demand.kr(trig, 0, buf);
	tme = (In.kr(~div_buses['tempo']).reciprocal * 16) * (mod/2); // 16 is probably quarts
	tmp = Trig1.kr(trig, tme - 0.05);
	snd = PlayBuf.ar(2, buf, tmp, trig);
	rev = PlayBuf.ar(2, buf, tmp * -1, trig, (tme - 0.03) * BufSampleRate.ir(buf));

	snd = snd + CombC.ar(snd, 3, tme.lag(10) / 6, tme / 6, -12.dbamp);
	snd = snd + FreeVerb.ar(snd, 1, 0.7, 0.2, 6.dbamp);
	snd = CompanderD.ar(snd, -18.dbamp, 1, 1/4);

	snd = snd + rev * -22.dbamp;

	SendReply.kr(trig, '/fromCreature', [11, tme]);

	snd = snd * EnvGen.ar(Env.asr(0.1, 1, 0.1), \alive.ar(1), doneAction: 2);
	SendReply.kr(PulseCount.kr(trig) > IRand(2, 7), '/fromCreature', [19]);

	~myPanningLaw.value(snd.sum);
}).add;
);

(
~myPanningLaw = { |snd|
	var panenv1, panenv2, panenv3, panenv4;
	var pannedout1, pannedout2, pannedout3, pannedout4;

	panenv1 = EnvGen.ar(Env.linen(0.8, 1/5, 0.8), Trig1.ar(\pantrig0.tr(0), 0.1));
	panenv2 = EnvGen.ar(Env.linen(0.8, 1/5, 0.8), Trig1.ar(\pantrig1.tr(0), 0.1));
	panenv3 = EnvGen.ar(Env.linen(0.8, 1/5, 0.8), Trig1.ar(\pantrig2.tr(0), 0.1));
	panenv4 = EnvGen.ar(Env.linen(0.8, 1/5, 0.8), Trig1.ar(\pantrig3.tr(0), 0.1));

	pannedout1 = PanX.ar(6, snd, \panpos0.kr(0).lag(1), panenv1);
	pannedout2 = PanX.ar(6, snd, \panpos1.kr(0).lag(1), panenv2);
	pannedout3 = PanX.ar(6, snd, \panpos2.kr(0).lag(1), panenv3);
	pannedout4 = PanX.ar(6, snd, \panpos3.kr(0).lag(1), panenv4);

	Out.ar(0, pannedout1 * -6.dbamp);
	Out.ar(0, pannedout2 * -6.dbamp);
	Out.ar(0, pannedout3 * -6.dbamp);
	Out.ar(0, pannedout4 * -6.dbamp);
}
)


