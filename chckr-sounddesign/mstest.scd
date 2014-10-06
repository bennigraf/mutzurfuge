

(
~mstest.free;
~mstest = {
	var snd, pnd, ms, bck;
	snd = PinkNoise.ar() * Decay.ar(Impulse.ar(4));
	snd = BPF.ar(snd, 1829, 1.5);
	pnd = Pan2.ar(snd, LFSaw.kr(1/4));

	ms = [pnd.sum, pnd[0] - pnd[1]];

	ms[1] = ms[1] * -1.dbamp;

	bck = [ms.sum/2, ms[0] - ms[1] / 2];

	// ms * -12.dbamp;
	bck * -12.dbamp * [1, 1];
	// pnd * -12.dbamp;
}.play;
)