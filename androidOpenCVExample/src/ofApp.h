#pragma once

#include "ofMain.h"
#include "ofxAndroid.h"

#include "ofxAruco.h"
#include "ofxOpenCv.h"

#include "ofxOsc.h"
#include "ofxNetwork.h"

#include "projectionSurface.h"


class ofApp : public ofxAndroidApp{
	
	public:
		
		void setup();
		void update();
		void draw();

		void setupHitmapImages();
		void setupDrawStuff();

		void keyPressed(int key);
		void keyReleased(int key);
		void windowResized(int w, int h);

		void touchDown(int x, int y, int id);
		void touchMoved(int x, int y, int id);
		void touchUp(int x, int y, int id);
		void touchDoubleTap(int x, int y, int id);
		void touchCancelled(int x, int y, int id);
		void swipe(ofxAndroidSwipeDir swipeDir, int id);

		void pause();
		void stop();
		void resume();
		void reloadTextures();

		bool backPressed();
		void okPressed();
		void cancelPressed();

		int one_second_time;
		int camera_fps;
		int frames_one_sec;

		////// new stuff from bgraf
	    ofVideoGrabber grabber;
	    ofVideoPlayer player;
	    ofxOscSender oscSender;
		ofxTCPClient tcpClient;
		int connectTime;

	    ofImage testImage;

	    ofBaseVideoDraws * video;

	    ofxAruco aruco;
	    bool useVideo;
	    bool showMarkers;
	    bool showBoard;
	    bool showBoardImage;

	    vector<ProjectionSurface> projectionSurfaces;

	    vector<ofImage> hitmapImgs;
	    vector<ofPlanePrimitive> hitmapPlanes;
	    ofFbo hitmapFbo;
	    map<int, int> hitmapPlaneToBoard;

	    ofPixels hitmapPixels;

	    string debugMsgStr;

	    float lastAutofocus;
};
