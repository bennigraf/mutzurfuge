#pragma once

#include "ofMain.h"

#include "ofxSyphon.h"

class testApp : public ofBaseApp{
	public:
		void setup();
		void update();
		void draw();
		
		void keyPressed(int key);
		void keyReleased(int key);
		void mouseMoved(int x, int y);
		void mouseDragged(int x, int y, int button);
		void mousePressed(int x, int y, int button);
		void mouseReleased(int x, int y, int button);
		void windowResized(int w, int h);
		void dragEvent(ofDragInfo dragInfo);
		void gotMessage(ofMessage msg);
    
        void serverAnnounced(ofxSyphonServerDirectoryEventArgs &arg);
        void serverRetired(ofxSyphonServerDirectoryEventArgs &arg);
    
        ofImage backgroundimage;
    
        // 2 movie streams and 2 syphon streams
        ofVideoPlayer movie1;
        ofVideoPlayer movie2;
    
        ofxSyphonClient mClient1;
        ofxSyphonClient mClient2;
    
        ofxSyphonServerDirectory ssd;
    
    
        ofImage errorImg;
};