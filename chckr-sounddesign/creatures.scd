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

	panenv1 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig0.tr(0), 0.1));
	panenv2 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig1.tr(0), 0.1));
	panenv3 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig2.tr(0), 0.1));
	panenv4 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig3.tr(0), 0.1));
	pannedout1 = PanX.ar(4, snd, \panpos0.kr(0).lag(1), panenv1);
	pannedout2 = PanX.ar(4, snd, \panpos1.kr(0).lag(1), panenv2);
	pannedout3 = PanX.ar(4, snd, \panpos2.kr(0).lag(1), panenv3);
	pannedout4 = PanX.ar(4, snd, \panpos3.kr(0).lag(1), panenv4);

	// Out.ar(0, snd * -6.dbamp);
	Out.ar(0, pannedout1 * -6.dbamp);
	Out.ar(0, pannedout2 * -6.dbamp);
	Out.ar(0, pannedout3 * -6.dbamp);
	Out.ar(0, pannedout4 * -6.dbamp);
}).add;
)




(
SynthDef(\lilquad, {
	var snd, revsnd;
	var panenv1, panenv2, panenv3, panenv4;
	var pannedout1, pannedout2, pannedout3, pannedout4;

	var offstep = \offstep.tr(0);
	var baseFreq = TRand.kr(0, 1, offstep).linexp(0, 1, 5329, 8392);
	var offstepEnv = EnvGen.ar(Env.asr(0.01, 1, 0.2), offstep);
	snd = SinOsc.ar(baseFreq, 0, 44.dbamp).softclip * LFPulse.ar(19, 0, 0.3) * offstepEnv;
	snd = HPF.ar(snd, 4839);

	revsnd = GVerb.ar(snd, 93, 8, 0.1, drylevel: 0, earlyreflevel: 0, taillevel: 1).sum * -12.dbamp;
	revsnd = BPF.ar(revsnd, baseFreq + 1000, \raysum.kr(0).linlin(0, 1, 0.1, 0.001).lag(2), 20.dbamp);

	snd = MulAdd(snd, -8.dbamp) + (revsnd * \raysum.kr(0).linexp(0, 1, -55, 0).dbamp.lag(2));

	snd = snd * -6.dbamp;

	snd = snd * EnvGen.ar(Env.asr(0, 1, 0.5), \alive.ar(1), doneAction: 2);

	// Out.ar(0, snd);

	panenv1 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig0.tr(0), 0.1));
	panenv2 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig1.tr(0), 0.1));
	panenv3 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig2.tr(0), 0.1));
	panenv4 = EnvGen.ar(Env.linen(0.8, 1/20, 0.8), Trig1.ar(\pantrig3.tr(0), 0.1));
	pannedout1 = PanX.ar(4, snd, \panpos0.kr(0).lag(1), panenv1);
	pannedout2 = PanX.ar(4, snd, \panpos1.kr(0).lag(1), panenv2);
	pannedout3 = PanX.ar(4, snd, \panpos2.kr(0).lag(1), panenv3);
	pannedout4 = PanX.ar(4, snd, \panpos3.kr(0).lag(1), panenv4);

	Out.ar(0, [pannedout1.sum + pannedout2.sum, pannedout3.sum + pannedout4.sum]);
	// Out.ar(0, pannedout1 * -6.dbamp);
	// Out.ar(0, pannedout2 * -6.dbamp);
	// Out.ar(0, pannedout3 * -6.dbamp);
	// Out.ar(0, pannedout4 * -6.dbamp);
}).add;
)