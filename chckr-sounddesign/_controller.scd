Server.default = Server.internal
s.options.device_(ServerOptions.devices[4]);
s.options.memSize_(s.options.memSize * 32)
s.boot
s.quit
s.scope
s.latency_(0.01)


~setVol = { |v|
	s.volume.volume = v.min(0);
	v.min(0);
}

~setVol.value(10);
s.volume.volume = 10

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

n = NetAddr.new("10.0.0.3", 7000);
n = nil
(
Tdef(\test, {
	inf.do({ |m|
		var lnum = 4; // lammpsnum
		var v = ~bss_kbus.getnSynchronous(12);
		lnum.do({ |l|
			var vals = v[(l*3)..(l*3+2)];
			// vals.postln;
			vals = (vals.clip(0, 1) * 255).round.asInt!4;
			vals = vals.flatten;
			// vals.postln;
			n.notNil.if({
				n.sendMsg('/LAMMPS', l, *vals);
			});
		});
		(1/25).wait;
	});
});
)
~bss_bus.getn(12)
~bss_kbus.getnSynchronous(12)
~bss_bus.scope
~bss_kbus.scope

Bus
Tdef(\test).play
Tdef(\test).stop