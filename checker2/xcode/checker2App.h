//
//  checker2App.h
//  checker2
//
//  Created by Benjamin Graf on 13.06.14.
//
//

#ifndef checker2_checker2App_h
#define checker2_checker2App_h

#include "cinder/gl/gl.h"

// my own grid-thingy
#include "grid.h"

// warp-block
#include "WarpPerspective.h"

// osc-block
#include "OscListener.h"

// gui-stuff
#include "SimpleGUI.h"

//#include "cinder/qtime/QuickTime.h"
#include "cinder/gl/Texture.h"
#include "cinder/Utilities.h"

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
    
    ph::warping::WarpList mWarps;
	osc::Listener mOscListener;
	mowa::sgui::SimpleGUI* gui;
	
    Grid* oneGrid;
	int gridx; // num of gridtiles
	int gridy;
    
    qtime::MovieGlRef		mMovie;
    gl::Texture				mFrameTexture, mInfoTexture;
};







#endif
