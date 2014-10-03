(
~clap.free;
~clap = {
	var trig = PulseDivider.kr(In.kr(~div_buses[8]), 5, 1);

	var env1, env2, out, noise1, noise2;

	env1 = EnvGen.ar(Env.new([0, 1, 0, 1, 0, 1, 0, 1, 0], [0.001, 0.013, 0, 0.01, 0, 0.01, 0, 0.03], [0, -3, 0, -3, 0, -3, 0, -4]), trig);
	env2 = EnvGen.ar(Env.new([0, 1, 0], [0.02, 0.3], [0, -4]), trig);

	noise1 = WhiteNoise.ar(env1);
	noise1 = HPF.ar(noise1, 600);
	noise1 = BPF.ar(noise1, 2000, 3);

	noise2 = WhiteNoise.ar(env2);
	noise2 = HPF.ar(noise2, 1000);
	noise2 = BPF.ar(noise2, 1200, 0.7, 0.7);

	out = noise1 + noise2;
	out = out * 2;
	out = out.softclip * -23.dbamp;

	out!2;
}.play;
)

(
~snare.free;
~snare = {
	var snd, tick, trig1, trig2, nv1, nv2, dshot;

	snd = PinkNoise.ar + BrownNoise.ar(0.dbamp).softclip;

	trig1 = In.kr(~div_buses[16]);
	nv1 = EnvGen.kr(Env.perc(0.01, 0.051), trig1);

	tick = snd * nv1;
	tick = FreeVerb.ar(tick, 0.69, 0.47, 0.65);
	tick = Compander.ar(tick, tick, -31.dbamp, 1, 1/3, 0.006, 0.2, mul: 8.dbamp);
	tick = ({ RHPF.ar(tick, 3100 + LFNoise2.kr(1/8).range(-2200, 6000), 0.031) }!4).sum;

	trig2 = PulseDivider.kr(In.kr(~div_buses[1]), 2, 2);
	nv2 = EnvGen.kr(Env.perc(0.02, 0.6), trig2);

	snd = (snd * 2).softclip * nv2;
	snd = BPF.ar(snd, EnvGen.kr(Env.perc(0.28, 0.8), trig2) * 3893 + 813, 0.4);
	snd = Decay.kr(trig2, 0.8) * snd * 12.dbamp;
	snd = GVerb.ar(snd, 33, 2.1).sum;
	snd = CompanderD.ar(snd, -24.dbamp, 4, 1, 0.0031, 0.11);

	// occasinal delay shot
	dshot = CombC.ar(tick+snd * Decay.ar(Dust.ar(1/7.3), 1), 0.5, 0.05 + LFNoise2.kr(1/2.8).range(-0.04, 0.05), 6.4);
	snd = snd + (dshot * -8.dbamp);

	snd = snd + (tick * -12.dbamp).softclip;
	snd = Limiter.ar(snd);
	snd!2 * -23.dbamp;
}.play
)

s.volume.volume = 0
// TODO: hh, globfx (wenn ein threshold überschritten wird, bricht alles zusammen und es gibt einen 'reboot', z.B. superspace, superdistortion/bitcrush, buffer wird laaaaangsam, ...)


(
~tick.free;
~tick = {
	var snd, snd1, snd2, trig, nv, nv2, microdelay;
	var dtrig, seq, d;

	var tme = In.kr(~div_buses['tempo']).reciprocal * 2;
	var note = TChoose.kr(In.kr(~div_buses[0.5]), [-3, -2, 0, 6]);
	var mod = 1;

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

	snd!2;
}.play;

)


(
var basepath = "/Users/bennigraf/Documents/Studium/MA/stublic-14/code/mutzurfuge/chckr-sounddesign/samples/piano/";
~pnobufs.do({ |b| b.free });
~pnobufs = [];
['Ab','Bb','Db', 'Eb', 'Gb'].do({|t|
	~pnobufs = ~pnobufs.add(Buffer.read(s, basepath++t++"3-3.wav"));
});
)
~pnobufs.choose.play;
(
~pno.free;
~pno = {
	var snd, rev, buf, trig, tme, tmp;
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

	snd + rev * -12.dbamp;
}.play;
)

(
~bss01.free;
~bss01 = {
	var snd, nv, fnv, ftrig, tme, note, mod;

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

	snd = RLPF.ar(snd, fnv.linlin(0, 1, 48, 882), 0.2);

	snd = (snd * -8.dbamp).clip * 4.dbamp;
	snd = RLPF.ar(snd, 5922, 2.5);
	snd = MidEQ.ar(snd, 53, 0.8, 12);

	snd = RLPF.ar(snd, SinOsc.kr(1/Rand(11, 19), Rand(0, 2pi)).range(69, 1000), 0.4);
	snd = snd + (DelayC.ar(snd, 0.05, SinOsc.ar(1/Rand(16, 12)).range(0, 0.05)) * SinOsc.kr(1/Rand(11, 19), Rand(0, 2pi)));

	snd!2 * -24.dbamp;
}.play;
)