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

	trig2 = PulseDivider.kr(In.kr(~div_buses[8]), 6, 2);
	nv2 = EnvGen.kr(Env.perc(0.02, 0.6), trig2);

	snd = PinkNoise.ar() * EnvGen.ar(Env.perc(0.01,0.1), trig2);
	snd = RHPF.ar(snd, 1204, 0.12, 21.dbamp);
	snd = FreeVerb.ar(snd, 0.5, 0.8, 0.6);

	// snd = (snd * 2).softclip * nv2;
	// snd = BPF.ar(snd, EnvGen.kr(Env.perc(0.28, 0.8), trig2) * 3893 + 813, 0.4);
	// snd = Decay.kr(trig2, 0.8) * snd * 12.dbamp;
	// snd = GVerb.ar(snd, 33, 2.1).sum;
	snd = CompanderD.ar(snd, -24.dbamp, 4, 1, 0.0031, 0.11);

	// occasinal delay shot
	dshot = CombC.ar(tick+snd * Decay.ar(Dust.ar(1/6.3), 1), 0.5, 0.05 + LFNoise2.kr(1/2.8).range(-0.04, 0.05), 6.4);
	snd = snd + (dshot * -8.dbamp);

	snd = snd + (tick * -12.dbamp).softclip;
	snd = Limiter.ar(snd);
	snd!2 * -23.dbamp;
}.play
)

s.volume.volume = 0
// TODO: hh, globfx (wenn ein threshold überschritten wird, bricht alles zusammen und es gibt einen 'reboot', z.B. superspace, superdistortion/bitcrush, buffer wird laaaaangsam, ...)


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

