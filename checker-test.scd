n = NetAddr("127.0.0.1", 5000)


n.sendMsg('/grid', 23, 15, 1.0.rand,1.0.rand,1.0.rand)
n.sendMsg('/grid', 1, 5, 0.0,1.0,0.0)

(
{
	10000.do({ |i|
		var clr = {1.0.rand}!3;
		var pos = [24.rand, 16.rand];
		// pos.postln;
		n.sendMsg('/grid', pos[0], pos[1], clr[0], clr[1], clr[2]);
		(1/60).wait;
	});
}.fork;
);