#include "cinder/app/AppNative.h"
#include "cinder/gl/gl.h"

// my own grid-thingy
#include "grid.h"

// warp-block
#include "WarpPerspective.h"

// osc-block
#include "OscListener.h"

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

class checker3App : public AppNative {
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
	osc::Listener mOscListener;
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
    gl::Texture				mFrameTexture, mInfoTexture;
    void loadMovie(string movieFile);
    
    
    // udp server stuff
    void						accept();
	UdpServerRef				mServer;
	UdpSessionRef				mSession;
	int                         udpMtu;
	void						onAccept( UdpSessionRef session );
	void						onError( std::string err, size_t bytesTransferred );
	void						onRead( ci::Buffer buffer );
	void						onReadComplete();
    
};

void checker3App::setup() {
	
    //	setFullScreen(true);
    //    gl::enableAlphaBlending();
    //    gl::enableAdditiveBlending();
    //    gl::enableWireframe();
    
    playback["grid"] = true;
    playback["video"] = false;
    playback["syphon"] = false;
//    playback = "grid"; // 'grid', 'video', 'syphon', ...
//    playback = "video";
	
	// grid stuff
	oneGrid = new Grid(24, 36);
    //	oneGrid->setup(getWindowWidth(), getWindowHeight());
	oneGrid->setup(1280, 800);
	
	// warping stuff
	mWarps.push_back(WarpPerspective::create());
	mWarps[0]->setSize(getWindowWidth(), getWindowHeight());
	fs::path settings = getAssetPath("") / "warps.xml";
	if( fs::exists( settings ) ) {
		mWarps = Warp::readSettings(loadFile(settings));
	}
	
	// osc... duh
    oscListenerRunning = false;
    oscListenerPort = 5000;
    oscListenerNewPort = oscListenerPort;
    while (!oscListenerRunning && oscListenerPort <= 5010) {
        console() << "trying to setup osc listener on port " << oscListenerPort << endl;
        try {
            mOscListener.setup(oscListenerPort);
            oscListenerNewPort = oscListenerPort;
            oscListenerRunning = true;
        } catch (...) {
            console() << "couldn't setup osc listener on port " << oscListenerPort << endl;
            oscListenerPort += 1;
        }
    }
    
    udpMtu = 1496;
    // udp server, see examples in https://github.com/BanTheRewind/Cinder-Asio
    mServer = UdpServer::create( io_service() );
	// Add callbacks to work with the server asynchronously.
	mServer->connectAcceptEventHandler( &checker3App::onAccept, this );
	mServer->connectErrorEventHandler( &checker3App::onError, this );
	
	// Start listening.
	accept();
    
	
	// gui setup
	gui = new SimpleGUI(this, Font(loadResource("pf_tempesta_seven.ttf"), 8));
	gui->lightColor = ColorA(1, 1, 0, 1);
    //	gui->addLabel("Grid Control");
	gui->addPanel();
	gui->addParam("Grid X", &gridx, 1, 45, 24);
	gui->addParam("Grid Y", &gridy, 1, 45, 16);
	gui->addParam("OSC Port", &oscListenerNewPort, 5000, 5010, oscListenerPort);
	gui->addButton("Load state")->registerClick(this, &checker3App::loadState);
	gui->addButton("Save state")->registerClick(this, &checker3App::saveState);
    gui->addSeparator();
    gui->addLabel("Playback");
    gui->addParam("Grid", &playback["grid"], true, 1);
    gui->addParam("Video", &playback["video"], false, 1);
    gui->addParam("Syphon", &playback["syphon"], false, 1);
	gui->load(CONFIG_FILE);
    
    loadMovie("anna.mov");
    
    //// syphon
    mClientSyphon.setup();
//    mClientSyphon.set("front", "3dTest2Debug"); // front back bottom chessboard
//    mClientSyphon.set("chessboard", "chessBoard_2Debug");
    mClientSyphon.set("", "Simple Server");
    mClientSyphon.bind();
    mSyphonFbo = gl::Fbo(1280, 800, GL_RGB);
}
void checker3App::loadMovie(string movieFile) {
    try {
        mMovie = qtime::MovieGl::create(loadAsset(movieFile));
        mMovie->setLoop();
        mMovie->play();
    } catch( ... ) {
        console() << "Couldn't load move file!" << endl;
    }
}
bool checker3App::loadState(MouseEvent event) {
	gui->load(CONFIG_FILE);
	fs::path settings = getAssetPath("") / "warps.xml";
	if( fs::exists( settings ) ) {
		mWarps = Warp::readSettings(loadFile(settings));
	}
	Warp::handleResize(mWarps);
	return true;
}
bool checker3App::saveState(MouseEvent event) {
	gui->save(CONFIG_FILE);
	fs::path settings = getAssetPath("") / "warps.xml";
	Warp::writeSettings( mWarps, writeFile( settings ) );
	return true;
}

void checker3App::update() {
	oneGrid->update();
    
    // set new osc listener if port has changed
    if(oscListenerNewPort != oscListenerPort) {
        mOscListener.setup(oscListenerNewPort);
        oscListenerPort = oscListenerNewPort;
        accept();
    }
	
	if(gridx != oneGrid->dimensions.x || gridy != oneGrid->dimensions.y) {
		oneGrid->updateDimensions(gridx, gridy);
	}
	
	while(mOscListener.hasWaitingMessages()) {
		osc::Message message;
		mOscListener.getNextMessage( &message );
		if(message.getAddress() == "/grid") {
			oneGrid->oscMessage(message);
		}
        // setting what to play (grid, video, syphon, ...)
        if(message.getAddress() == "/setOutput" &&
           message.getNumArgs() == 1 &&
           message.getArgType(0) == osc::TYPE_STRING) {
            console() << "output " <<message.getArgAsString(0) << endl;
            for (std::map<string,bool>::iterator it=playback.begin(); it!=playback.end(); ++it){
                playback[it->first] = false;
            }
            playback[message.getArgAsString(0)] = true;
//            playback = message.getArgAsString(0);
        }
        
        // resetting video to 0
        if(message.getAddress() == "/video") {
            mMovie->seekToStart();
        }
        // set video
        if(message.getAddress() == "/video" &&
           message.getNumArgs() == 1 &&
           message.getArgType(0) == osc::TYPE_STRING) {
            string videofile = message.getArgAsString(0);
            loadMovie(videofile);
        }
        
        // syphon???
        if(message.getAddress() == "/syphon" &&
           message.getNumArgs() == 2 &&
           message.getArgType(0) == osc::TYPE_STRING &&
           message.getArgType(1) == osc::TYPE_STRING) {
            mClientSyphon.setup();
            string serverName = message.getArgAsString(0);
            string appName = message.getArgAsString(1);
            mClientSyphon.set(serverName, appName);
            mClientSyphon.bind();
        }
	}
    
    // update video file    
    if(playback["video"] && mMovie)
		mFrameTexture = mMovie->getTexture();
}

void checker3App::draw() {
    gl::enableAlphaBlending();
	// clear out the window with black
//	gl::clear(Colorf(0.f, 0.f, 0.f) );
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
            if(mMovie) {
                warp->draw(mFrameTexture);
            }
        } else if (playback["syphon"]) {
            mSyphonFbo.bindFramebuffer();
            Area viewport = gl::getViewport();
            gl::setViewport(mSyphonFbo.getBounds() );
            gl::pushMatrices();
            gl::clear(Color::black());
            gl::color(Color::white());
            mClientSyphon.draw(0, 0, mSyphonFbo.getWidth(), mSyphonFbo.getHeight());
            gl::popMatrices();
            gl::setViewport(viewport);
            mSyphonFbo.unbindFramebuffer();
            gl::Texture tex = mSyphonFbo.getTexture();
            warp->draw(tex);
        }
	}
	
	gui->draw();
}

void checker3App::mouseMove(MouseEvent event) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseMove( mWarps, event ) )
	{
		// let your application perform its mouseMove handling here
	}
}
void checker3App::mouseDown( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDown( mWarps, event ) )
	{
		// let your application perform its mouseDown handling here
	}
}

void checker3App::mouseDrag( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDrag( mWarps, event ) )
	{
		// let your application perform its mouseDrag handling here
	}
}

void checker3App::mouseUp( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseUp( mWarps, event ) )
	{
		// let your application perform its mouseUp handling here
	}
}

void checker3App::keyDown( KeyEvent event ) {
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

void checker3App::keyUp( KeyEvent event ) {
	// pass this key event to the warp editor first
	if( ! Warp::handleKeyUp( mWarps, event ) )
	{
		// let your application perform its keyUp handling here
	}
}

void checker3App::resize() {
    // tell the warps our window has been resized,
    // so they properly scale up or down
    Warp::handleResize(mWarps);
	
}



/////// udp stuff, stolen from cinder-asio sample "udpserver"
void checker3App::accept() {
	if ( mSession ) {
		mSession.reset();
	}
	if ( mServer ) {
		// This is how you start listening for a connection. Once
		// a connection occurs, a session will be created and passed
		// in through the onAccept method.
		mServer->accept((uint16_t)oscListenerPort+100);
		console() <<  "Listening on port: " << oscListenerPort << endl;
	}
}
void checker3App::onAccept( UdpSessionRef session ) {
	// Get the session from the argument and set callbacks.
	mSession = session;
	mSession->connectErrorEventHandler( &checker3App::onError, this );
	mSession->connectReadCompleteEventHandler( &checker3App::onReadComplete, this );
	mSession->connectReadEventHandler( &checker3App::onRead, this );
    
	// Start reading data from the client.
	mSession->read(udpMtu);
}
void checker3App::onRead( ci::Buffer buffer ) {
//	console() << buffer.getDataSize() << " bytes read" << endl;
    
	// Data is packaged as a ci::Buffer. This allows
	// you to send any kind of data. Because it's more common to
	// work with strings, the session object has static convenience
	// methods for converting between std::string and ci::Buffer.
	
//	console() << buffer.getDataSize() << endl;
//    int *pInt = static_cast<int*>(buffer.getData()); // cast from void* to int*
    
//    uint8_t* buf = reinterpret_cast<uint8_t*>(buffer.getData());
    if(buffer.getDataSize() > 8) {
        string response	= UdpSession::bufferToString(buffer);
        response = response.substr(0, 4);
//        int offset = data[7];
//        console() << offset << endl;
        if(response == "grid") {
            oneGrid->byteMessage(buffer);
        }
        buffer.reset();
    }
    
	// Continue reading.
	mSession->read(udpMtu);
}

void checker3App::onReadComplete() {
//	console() << "Read complete" << endl;
    
	// Continue reading new responses.
//	mSession->read(udpMtu);
}
void checker3App::onError( string err, size_t bytesTransferred ) {
	string text = "Error";
	if ( !err.empty() ) {
		text += ": " + err;
	}
    console() << text << endl;
}




CINDER_APP_NATIVE( checker3App, RendererGl )
