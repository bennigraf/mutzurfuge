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

#include "cinder/qtime/QuickTime.h"
#include "cinder/gl/Texture.h"
#include "cinder/Utilities.h"

using namespace ci;
using namespace ci::app;
using namespace ph::warping; // warping
using namespace mowa::sgui; // gui
using namespace std;

#define CONFIG_FILE "settings.sgui.txt"

class checkerApp : public AppNative {
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
	SimpleGUI* gui;
	
    Grid* oneGrid;
	int gridx; // num of gridtiles
	int gridy;
    
    qtime::MovieGlRef		mMovie;
    gl::Texture				mFrameTexture, mInfoTexture;
};

void checkerApp::setup() {
	
    //	setFullScreen(true);
//    gl::enableAlphaBlending();
//    gl::enableAdditiveBlending();
//    gl::enableWireframe();
	
	// grid stuff
    //	oneGrid = new Grid(24, 16);
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
	mOscListener.setup(5000);
	
	// gui setup
	gui = new SimpleGUI(this, Font(loadResource("pf_tempesta_seven.ttf"), 8));
	gui->lightColor = ColorA(1, 1, 0, 1);
    //	gui->addLabel("Grid Control");
	gui->addPanel();
	gui->addParam("Grid X", &gridx, 1, 45, 24);
	gui->addParam("Grid Y", &gridy, 1, 45, 16);
	gui->addButton("Load state")->registerClick(this, &checkerApp::loadState);
	gui->addButton("Save state")->registerClick(this, &checkerApp::saveState);
	gui->load(CONFIG_FILE);
    
    
    mMovie = qtime::MovieGl::create("anna.mov");
    mMovie->setLoop();
    mMovie->play();
}
bool checkerApp::loadState(MouseEvent event) {
	gui->load(CONFIG_FILE);
	fs::path settings = getAssetPath("") / "warps.xml";
	if( fs::exists( settings ) ) {
		mWarps = Warp::readSettings(loadFile(settings));
	}
	Warp::handleResize(mWarps);
	return true;
}
bool checkerApp::saveState(MouseEvent event) {
	gui->save(CONFIG_FILE);
	fs::path settings = getAssetPath("") / "warps.xml";
	Warp::writeSettings( mWarps, writeFile( settings ) );
	return true;
}

void checkerApp::update() {
	oneGrid->update();
	
	if(gridx != oneGrid->dimensions.x || gridy != oneGrid->dimensions.y) {
		oneGrid->updateDimensions(gridx, gridy);
	}
	
	while(mOscListener.hasWaitingMessages()) {
		osc::Message message;
		mOscListener.getNextMessage( &message );
        //		console() << "New message received" << std::endl;
        //		console() << "Address: " << message.getAddress() << std::endl;
        //		console() << "Num Arg: " << message.getNumArgs() << std::endl;
		for	(int i = 0; i < message.getNumArgs(); i++ ) {
            //			console() << "arg " << i << ": ";
            //			console() << message.getArgTypeName(i) << " - ";
			if (i<2) {
                //				console() << message.getArgAsInt32(i) << "; ";
			} else {
                //				console() << message.getArgAsFloat(i) << "; ";
			}
		}
		if(message.getAddress() == "/grid") {
			oneGrid->oscMessage(message);
		}
        if(message.getAddress() == "/video") {
            mMovie->reset();
        }
	}
    
    if( mMovie )
		mFrameTexture = mMovie->getTexture();
}

void checkerApp::draw() {
    gl::enableAlphaBlending();
	// clear out the window with black
	gl::clear(Colorf(0.f, 0.f, 0.f) );
//    gl::clear(Color::white());
	
	// draws to fbo only
	oneGrid->draw();
	
	gl::color(Color::white());
	for(WarpConstIter itr=mWarps.begin();itr!=mWarps.end();++itr) {
		WarpRef warp(*itr);
		ci::gl::Texture tex = oneGrid->mFbo.getTexture();
//		warp->draw(tex);
        warp->draw(mFrameTexture);
	}
	
	gui->draw();
}

void checkerApp::mouseMove(MouseEvent event) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseMove( mWarps, event ) )
	{
		// let your application perform its mouseMove handling here
	}
}
void checkerApp::mouseDown( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDown( mWarps, event ) )
	{
		// let your application perform its mouseDown handling here
	}
}

void checkerApp::mouseDrag( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseDrag( mWarps, event ) )
	{
		// let your application perform its mouseDrag handling here
	}
}

void checkerApp::mouseUp( MouseEvent event ) {
	// pass this mouse event to the warp editor first
	if( ! Warp::handleMouseUp( mWarps, event ) )
	{
		// let your application perform its mouseUp handling here
	}
}

void checkerApp::keyDown( KeyEvent event ) {
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

void checkerApp::keyUp( KeyEvent event ) {
	// pass this key event to the warp editor first
	if( ! Warp::handleKeyUp( mWarps, event ) )
	{
		// let your application perform its keyUp handling here
	}
}

void checkerApp::resize() {
    // tell the warps our window has been resized,
    // so they properly scale up or down
    Warp::handleResize(mWarps);
	
}



CINDER_APP_NATIVE( checkerApp, RendererGl )
