n = NetAddr("127.0.0.1", 5000)


n.sendMsg('/grid', 1, 1, 1.0.rand,1.0.rand,1.0.rand)
n.sendMsg('/grid', 1, 5, 0.0,1.0,0.0)
n.sendMsg('/grid', 'fold', 34.rand, 21.rand, ['top', 'right', 'down', 'left'].choose)

({inf.do({ |i|
	// pos.postln;
	// n.sendMsg('/grid', 34.rand, 21.rand, clr[1], clr[2], clr[3]);
	n.sendMsg('/grid', 34.rand, 21.rand, 1.0.rand,1.0.rand,1.0.rand);
	(1/20).wait;
})}.fork;);

({inf.do({
	n.sendMsg('/grid', 'fold', 34.rand, 21.rand, ['top', 'right', 'down', 'left'].choose, 1);
	0.1.rand.wait;
})}.fork);


((34*21).do({|i|
	var x = i%34;
	n.sendMsg('/grid', x, (i/34).floor.asInt, 1/(34*21)*i, 1-(1/(34*21)*i), 0.0);
}));