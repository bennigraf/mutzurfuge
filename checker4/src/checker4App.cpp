#include "cinder/app/AppNative.h"
#include "cinder/gl/gl.h"

// my own grid-thingy
#include "grid.h"

// warp-block
#include "WarpPerspective.h"

// osc-block
// #include "OscListener.h"

// osc-block with tcp osc
#include "OscServer.h"

// gui-stuff
#include "SimpleGUI.h"

#include "cinderSyphon.h"
#include "cinder/qtime/QuickTime.h"

// udp server instead of osc
#include "UdpServer.h"

using namespace ci;
using namespace ci::app;
using namespace ph::warping; // warping
using namespace mowa::sgui; // gui
using namespace std;

#define CONFIG_FILE "settings.sgui.txt"

class checker4App : public AppNative {
private:
    SimpleGUI* gui;
public:
	void setup();
	void update();
	void draw();
	void resize();
	
	void mouseMove( MouseEvent event );
	void mouseDown( MouseEvent event );
	void mouseDrag( MouseEvent event );
	void mouseUp( MouseEvent event );
	
	void keyDown( KeyEvent event );
	void keyUp( KeyEvent event );
	
	bool saveState(MouseEvent event);
	bool loadState(MouseEvent event);
    
	WarpList mWarps;
    
    // new osc with tcp (apparently)
    bool oscReceived( const mndl::osc::Message &message );
    mndl::osc::ServerRef mListener;
    mndl::osc::ServerRef mUDPListener;
    
    int oscListenerPort;    // both are used for setting new ports
    int oscListenerNewPort;
    bool oscListenerRunning;
    
    
    
    syphonClient mClientSyphon;
    ci::gl::Fbo  mSyphonFbo;
    
//    std::string playback;
    map<string, bool> playback; // easier to control with gui
	
    Grid* oneGrid;
	int gridx; // num of gridtiles
	int gridy;
    
    qtime::MovieGlRef		mMovie;
//    qtime::MovieGl          mMovie;
    gl::Texture				mFrameTexture;
    void                    loadMovie(string movieFile);
    bool                    newMovieFlag;
    string                  newMovieFilename;
    bool                    resetMovieFlag;
    
    
    bool                        setOSCPortButton(MouseEvent event);
    void                        setOSCPort();
    
};

void checker4App::setup() {
    
    playback["grid"] = true;
    playback["video"] = false;
    playback["syphon"] = false;
	
	// grid stuff
	oneGrid = new Grid(24, 36);
    //	oneGrid->setup(getWindowWidth(), getWindowHeight());
	oneGrid->setup(1280, 800);
	
	// warping stuff
	mWarps.push_back(WarpPerspective::create());
	mWarps[0]->setSize(getWindowWidth(), getWindowHeight());
    console() << getAssetPath("") << endl;
	fs::path settings = getAssetPath("") / "warps.xml";
	if( fs::exists( settings ) ) {
		mWarps = Warp::readSettings(loadFile(settings));
	}
	
    // new osc using tcp
    
    oscListenerRunning = false;
    oscListenerPort = 5000;
    oscListenerNewPort = oscListenerPort;
    while (!oscListenerRunning && oscListenerPort <= 5010) {
        console() << "trying to setup osc listener on port " << oscListenerPort << endl;
        try {
            mListener = mndl::osc::Server::create(oscListenerPort, mndl::osc::PROTO_TCP);
            oscListenerNewPort = oscListenerPort;
            oscListenerRunning = true;
        } catch (...) {
            console() << "couldn't setup osc listener on port " << oscListenerPort << endl;
            oscListenerPort += 1;
        }
    }
    if(oscListenerRunning) {
        mListener->registerOscReceived< checker4App >( &checker4App::oscReceived, this );
        
        // also setup udp listener
        console() << "create UDP Listener on port " << oscListenerPort << endl;
        mUDPListener = mndl::osc::Server::create(oscListenerPort, mndl::osc::PROTO_UDP);
        mUDPListener->registerOscReceived< checker4App >( &checker4App::oscReceived, this );
    }
    
    
	// gui setup
	gui = new SimpleGUI(this, Font(loadResource("pf_tempesta_seven.ttf"), 8));
	gui->lightColor = ColorA(1, 1, 0, 1);
    //	gui->addLabel("Grid Control");
	gui->addPanel();
	gui->addParam("Grid X", &gridx, 1, 45, 24);
	gui->addParam("Grid Y", &gridy, 1, 45, 16);
    gui->addSeparator();
    gui->addParam("OSC Port", &oscListenerNewPort, 5000, 5010, oscListenerPort);
    gui->addButton("Set OSC Port")->registerClick(this, &checker4App::setOSCPortButton);
    gui->addSeparator();
    gui->addLabel("Playback");
    gui->addParam("Grid", &playback["grid"], true, 1);
    gui->addParam("Video", &playback["video"], false, 1);
    gui->addParam("Syphon", &playback["syphon"], false, 1);
    gui->addSeparator();
	gui->addButton("Load state")->registerClick(this, &checker4App::loadState);
	gui->addButton("Save state")->registerClick(this, &checker4App::saveState);
	gui->load(string(getAssetPath("").native()) + string("/") + string(CONFIG_FILE));
    
    // set osc port from settings loaded by gui
    setOSCPort();
    
    loadMovie("tafeln.mov");
    newMovieFlag = false;
    resetMovieFlag = false;

    //// syphon
    mClientSyphon.setup();
//    mClientSyphon.set("", "Simple Server");
    mClientSyphon.set("", "Simple Server");
    mClientSyphon.bind();
    ci::gl::Texture sTex = mClientSyphon.getTexture();
    
}
void checker4App::loadMovie(string movieFile) {
    try {
//        newMovieFlag = true;
//        mMovie = qtime::MovieGl::create(loadAsset(movieFile));
        mMovie = qtime::MovieGl::create(loadAsset(movieFile));
        mMovie->setLoop();
        mMovie->play();
    } catch( ... ) {
        console() << "Couldn't load movie file!" << endl;
        mMovie->reset();
    }
    mFrameTexture.reset();
}
bool checker4App::loadState(MouseEvent event) {
	gui->load(string(getAssetPath("").native()) + string("/") + string(CONFIG_FILE));
	fs::path settings = getAssetPath("") / "warps.xml";
	if( fs::exists( settings ) ) {
		mWarps = Warp::readSettings(loadFile(settings));
	}
	Warp::handleResize(mWarps);
	return true;
}
bool checker4App::saveState(MouseEvent event) {
	gui->save(string(getAssetPath("").native()) + string("/") + string(CONFIG_FILE));
	fs::path settings = getAssetPath("") / "warps.xml";
	Warp::writeSettings( mWarps, writeFile( settings ) );
	return true;
}

void checker4App::update() {
	oneGrid->update();
	
	if(gridx != oneGrid->dimensions.x || gridy != oneGrid->dimensions.y) {
		oneGrid->updateDimensions(gridx, gridy);
	}
    
    
    // working with flags here since osc receiver runs in another thread
    if(newMovieFlag && newMovieFilename != "") {
        loadMovie(newMovieFilename);
        newMovieFlag = false;
        newMovieFilename = "";
    }
    if(resetMovieFlag && mMovie) {
        mMovie->seekToStart();
        resetMovieFlag = false;
    }
    if(mMovie) {
        mFrameTexture = mMovie->getTexture();
    }
}

void checker4App::draw() {
    gl::enableAlphaBlending();
	// clear out the window with black
    gl::clear(Color::black());
	
	// draws to fbo only
	oneGrid->draw(Warp::isEditModeEnabled());
	
	gl::color(Color::white());
	for(WarpConstIter itr=mWarps.begin();itr!=mWarps.end();++itr) {
		WarpRef warp(*itr);
        if(playback["grid"]) {
            gl::Texture tex = oneGrid->mFbo.getTexture();
            warp->draw(tex);
        } else if (playback["video"]) {
            if( mFrameTexture ) {
                warp->draw(mFrameTexture);
            }
        } else if (playback["syphon"]) {
            // strangely I can't get the texture unless syphon draws
            gl::color(Color::black());
            mClientSyphon.draw(0, 0, 1, 1);
            gl::color(Color::white());
            gl::Texture tex = mClientSyphon.getTexture();
            warp->draw(tex);
        }
	}
	
	gui->draw();
}

bool checker4App::setOSCPortButton(MouseEvent event) {
    setOSCPort();
    return true;
}

void checker4App::setOSCPort() {
    // set new osc listener if port has changed
    if(oscListenerNewPort != oscListenerPort) {
        
        oscListenerRunning = false;
        mListener->unregisterOscReceived(0);
        mUDPListener->unregisterOscReceived(0);
        
        console() << "trying to setup osc listener on port " << oscListenerNewPort << endl;
        try {
            mListener = mndl::osc::Server::create(oscListenerNewPort, mndl::osc::PROTO_TCP);
            oscListenerPort = oscListenerNewPort;
            oscListenerRunning = true;
            console() << "created new OSC Listener on port " << oscListenerNewPort << endl;
        } catch (...) {
            console() << "couldn't setup osc listener on port " << oscListenerPort << endl;
        }
        
        if(oscListenerRunning) {
            mListener->registerOscReceived< checker4App >( &checker4App::oscReceived, this );
            
            // also setup udp listener
            console() << "create UDP Listener on port " << oscListenerPort << endl;
            try {
                mUDPListener = mndl::osc::Server::create(oscListenerPort, mndl::osc::PROTO_UDP);
                mUDPListener->registerOscReceived< checker4App >( &checker4App::oscReceived, this );
            } catch (...) {
                
            }
        }
    }
}

bool checker4App::oscReceived( const mndl::osc::Message &message ) {
    
    console() << getElapsedSeconds() << " message received " << message.getAddressPattern() << endl;
    
    if(message.getAddressPattern() == "/grid") {
//        oneGrid->oscMessage(message);
    }
    // setting what to play (grid, video, syphon, ...)
    if(message.getAddressPattern() == "/setOutput" &&
       message.getNumArgs() == 1 &&
       message.getArgType(0) == mndl::osc::TYPE_STRING) {
        console() << "output " <<message.getArg<string>(0) << endl;
        for (std::map<string,bool>::iterator it=playback.begin(); it!=playback.end(); ++it){
            playback[it->first] = false;
        }
        playback[message.getArg<string>(0)] = true;
    }
    
    // resetting video to 0
    if(message.getAddressPattern() == "/video") {
        resetMovieFlag = true;
    }
    // set video file
    if(message.getAddressPattern() == "/video" &&
       message.getNumArgs() == 1 &&
       message.getArgType(0) == mndl::osc::TYPE_STRING) {
        string videofile = message.getArg<string>(0);
        newMovieFilename = videofile;
        newMovieFlag = true;
    }
    
    // set syphon server
    if(message.getAddressPattern() == "/syphon" &&
        message.getNumArgs() == 2 &&
        message.getArgType(0) == mndl::osc::TYPE_STRING &&
        message.getArgType(1) == mndl::osc::TYPE_STRING) {
        mClientSyphon.setup();
        string serverName = message.getArg<string>(0);
        string appName = message.getArg<string>(1);
        mClientSyphon.set(serverName, appName);
        mClientSyphon.bind();
        
    }
    
    
    return true;
}

void checker4App::mouseMove(MouseEvent event) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseMove( mWarps, event ) )
	{
		// let your application perform its mouseMove handling here
	}
}
void checker4App::mouseDown( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDown( mWarps, event ) )
	{
		// let your application perform its mouseDown handling here
	}
}

void checker4App::mouseDrag( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDrag( mWarps, event ) )
	{
		// let your application perform its mouseDrag handling here
	}
}

void checker4App::mouseUp( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseUp( mWarps, event ) )
	{
		// let your application perform its mouseUp handling here
	}
}

void checker4App::keyDown( KeyEvent event ) {
	// pass this key event to the warp editor first
	if( ! Warp::handleKeyDown( mWarps, event ) )
	{
		// warp editor did not handle the key, so handle it here
		switch( event.getCode() )
		{
			case KeyEvent::KEY_ESCAPE:
				// quit the application
				quit();
				break;
			case KeyEvent::KEY_f:
				// toggle full screen
				setFullScreen(!isFullScreen());
				Warp::handleResize(mWarps);
				break;
			case KeyEvent::KEY_w:
				// toggle warp edit mode
				Warp::enableEditMode( ! Warp::isEditModeEnabled() );
				break;
			case KeyEvent::KEY_a:
				break;
			case KeyEvent::KEY_SPACE:
				break;
		}
		
		// gui stuff
		switch(event.getChar()) {
			case 'd': gui->dump(); break; //prints values of all the controls to the console
			case 'g': gui->setEnabled(!gui->isEnabled()); break;
		}
	}
}

void checker4App::keyUp( KeyEvent event ) {
	// pass this key event to the warp editor first
	if( ! Warp::handleKeyUp( mWarps, event ) )
	{
		// let your application perform its keyUp handling here
	}
}

void checker4App::resize() {
    // tell the warps our window has been resized,
    // so they properly scale up or down
    Warp::handleResize(mWarps);
	
}




CINDER_APP_NATIVE( checker4App, RendererGl )
