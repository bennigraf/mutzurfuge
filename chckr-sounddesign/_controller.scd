s.options.device_(ServerOptions.devices[4]);
s.options.memSize_(s.options.memSize * 32)
s.boot
s.quit
s.scope
s.latency_(0.01)


~setVol = { |v|
	s.volume.volume = v.min(-10);
	v.min(-10);
}

~setVol.value(-30);

OSCFunc.trace(false)


(
OSCdef(\worldtick, { |msg|
	// msg.postln;
	~world_divider.set(\ticktrig, 1);
	~world_ticks.set(\ticktrig, 1);
}, '/world/tick', nil, nil, [{|myarg| myarg == 'tick' }]);

)

(
100.do({ |n|
	s.sendMsg('/n_free', 4700 + n)
});
)