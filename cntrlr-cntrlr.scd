
// 1ST: SETUP
//--------------------------------------------------------------------
(
~clients = [
	["10.0.0.1", 5000],
	["10.0.0.2", 5001]
];
)


// 2ND: EXECUTE CODEBLOCK BELOW
//--------------------------------------------------------------------



// 3RD: USE THESE FUNCTIONS
//--------------------------------------------------------------------

// connect clients
~connectNetwork.value("TCP"); // use UDP for classic UDP mode

// set mode of all connected clients
~setMode.value("video", "anna.mov");
~setMode.value("video", "tafeln.mov");
~setMode.value("video"); // resets video to first frame
~setMode.value("syphon", "", "Simple Server"); // app name, server name


// execute this code block to define some functions
//--------------------------------------------------------------------
(
~setMode = { | ...args|
	var msg = [];
	if(args[0] == "video") {
		Routine.run({
			if(args[1].isNil, {
				~sendMsg.value('/video');
			}, {
				~sendMsg.value('/video', args[1]);
			});
			~sendMsg.value('/setOutput', 'video');
		});

	};
	if(args[0] == "syphon") {
		~sendMsg.value('/syphon', args[1], args[2]);
		~sendMsg.value('/setOutput', 'syphon');
	};
	"set mode " ++ args[0];
};

~sendMsg = { | ...args |
	~netAddrs.do({ |c|
		c.sendMsg(*args);
	});
};

~clearNetwork = {
	~netAddrs.notNil.if({
		~netAddrs.do({|n|
			n.disconnect();
		});
	});
	~netAddrs = [];
};
~clearNetwork.value();

~connectNetwork = { |mode = "TCP"|
	~clearNetwork.value();
	~clients.do({ |c|
		var na = NetAddr(c[0], c[1]);
		~netAddrs = ~netAddrs.add(na);
	});
	if(mode == "TCP") {
		~netAddrs.do({ |na, i|
			try({
				na.connect(~disconnected);
			}, {
				"couldn't connect to client:".postln;
				na.postln;
			});
		});
	};
	~netAddrs;
};

~disconnected = { |client|
	var n = nil;
	"TCP connection lost".postln;
	client.postln;
	~netAddrs.do({|c, i|
		if(c == client, { n = i });
	});
	n.notNil.if({
		~netAddrs.removeAt(n);
	});
};
)
