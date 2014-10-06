// s.options.device_(ServerOptions.devices[4]);
s.options.memSize_(s.options.memSize * 32)
s.boot
s.quit
s.scope
s.latency_(0.01)

s.volume.volume = -100;


OSCFunc.trace(false)


(
OSCdef(\worldtick, { |msg|
	// msg.postln;
	~world_divider.set(\ticktrig, 1);
	~world_ticks.set(\ticktrig, 1);
}, '/world/tick', nil, nil, [{|myarg| myarg == 'tick' }]);

)