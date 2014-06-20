#include "testApp.h"

ofxSyphonServerDirectory ssd;

//--------------------------------------------------------------
void testApp::setup(){
    backgroundimage.loadImage("bilder/IMG_20140204_163224.jpg");
    ofSetWindowShape(backgroundimage.width/5, backgroundimage.height/5);
    
    if(ofFile::doesFileExist("movies/1.mov")) {
        movie1.loadMovie("movies/1.mov");
        movie1.play();
    }
    if(ofFile::doesFileExist("movies/2.mov")) {
        movie2.loadMovie("movies/2.mov");
        movie2.play();
    }
    
	ssd.setup();
    ofAddListener(ssd.events.serverAnnounced, this, &testApp::serverAnnounced);
    ofAddListener(ssd.events.serverRetired, this, &testApp::serverRetired);
    
    errorImg.loadImage("bilder/nosourcefound.jpg");
}

void testApp::serverAnnounced(ofxSyphonServerDirectoryEventArgs &arg) {
    for( auto& dir : arg.servers ){ // this runs only once since arg contains only the newly added server!
        ofLogNotice("ofxSyphonServerDirectory Server Announced")<<" Server Name: "<<dir.serverName <<" | App Name: "<<dir.appName;
        if(!mClient1.isSetup()) {
            mClient1.set(dir);
            mClient1.setup();
        } else {
            mClient2.set(dir);
            mClient2.setup();
        }
    }
}
void testApp::serverRetired(ofxSyphonServerDirectoryEventArgs &arg) {
    for( auto& dir : arg.servers ){
        ofLogNotice("ofxSyphonServerDirectory Server Retired")<<" Server Name: "<<dir.serverName <<" | App Name: "<<dir.appName;
        ///*
        if(dir.serverName == mClient1.getServerName() && dir.appName == mClient1.getApplicationName()) {
            mClient1 = ofxSyphonClient();
        } else if (dir.serverName == mClient2.getServerName() && dir.appName == mClient2.getApplicationName()) {
            mClient2 = ofxSyphonClient();
        }
         // */
    }
}

//--------------------------------------------------------------
void testApp::update(){
    movie1.update();
    movie2.update();
    
//    mClient1.setup();
    //    cout << mClient1.getApplicationName() << " " << mClient1.getWidth() << "\n";
    if (mClient1.isSetup()) {
        cout << "Client1: " << mClient1.getApplicationName() << " " << mClient1.getServerName() << " " << mClient1.getWidth() << "\n";
    }
    if (mClient2.isSetup()) {
        cout << "Client2: " << mClient2.getApplicationName() << " " << mClient2.getServerName() << " " << mClient2.getWidth() << "\n";
    }
    
}

//--------------------------------------------------------------
void testApp::draw(){
   	ofSetColor(255);
    backgroundimage.draw(0, 0, 2448/5, 3264/5);

    // draw image IMG_20140204_163224.jpg
    //    2448x3264
    // tl 463/497
    // tr 1914/472
    // br 1948/1257
    // bl 444/1280
    // somehow  morph 2d video into adjusted plane... however...
    // maybe create movement-vector for each thingy? for x-dir and y-dir
    //
    
    
    // draw to area 1
    
    ofVec2f tlv(463, 497);
    ofVec2f trv(1914, 472);
    ofVec2f brv(1948, 1257);
    ofVec2f blv(444, 1280);
    ofVec2f xvec1 = trv - tlv; // vector along the top edge
    ofVec2f xvec2 = brv - blv; // vector along the bottom edge
    ofVec2f yvec1 = blv - tlv; // vector along the left edge
    ofVec2f yvec2 = brv = blv; // vector along the right
    
    int nChannels;
    unsigned char * pixels;
    int mediawidth, mediaheight;
    
    if (movie1.isLoaded()) { // check for video source
        pixels = movie1.getPixels();
        nChannels = movie1.getPixelsRef().getNumChannels();
        mediawidth = movie1.getWidth();
        mediaheight = movie1.getHeight();
    } else if (mClient1.isSetup()) {
        // use syphon source
        // draw syphon to fbo to get pixels
        ofFbo fbo;
        fbo.allocate(mClient1.getWidth(), mClient1.getHeight(), GL_RGBA);
        fbo.begin();
        mClient1.draw(0, 0);
        fbo.end();
        ofPixels feedPxl;
        fbo.readToPixels(feedPxl);
        
        pixels = feedPxl.getPixels();
        nChannels = feedPxl.getNumChannels();
        mediawidth = feedPxl.getWidth();
//        mediawidth = 320;
        mediaheight = feedPxl.getHeight();
//        mediaheight = 240;
    } else {
        // error image
        pixels = errorImg.getPixels();
        nChannels = 3;
        mediawidth = errorImg.getWidth();
        mediaheight = errorImg.getHeight();
    }
    
    
    // let's move through the "RGB(A)" char array
    for (int i = 0; i < mediawidth; i+=1){
        // make y vect at specific col
        float coloffset = 1.0 / (float)mediawidth * i;
        ofVec2f colp1 = tlv + xvec1 * coloffset;
        ofVec2f colp2 = blv + xvec2 * coloffset;
        ofVec2f thisyvec(colp2.x - colp1.x, colp2.y - colp1.y);
        
        for (int j = 0; j < mediaheight; j+=1){
            unsigned char r = pixels[(j * mediawidth + i)*nChannels];
            unsigned char g = pixels[(j * mediawidth + i)*nChannels+1];
            unsigned char b = pixels[(j * mediawidth + i)*nChannels+2];
            
            ofSetColor(r, g, b);
            
            float rowoffset = 1.0/(float)mediaheight * j;
            ofVec2f pos = colp1 + thisyvec * rowoffset;
            ofRect(pos.x/5, pos.y/5, 1, 1);
        }
    }
    
    
    
    
    
    ////////// 2nd thing
    ofVec2f tlv2(444, 1280);
    ofVec2f trv2(1948, 1257);
    ofVec2f brv2(1640, 1560);
    ofVec2f blv2(794, 1569);
    ofVec2f xvec12 = trv2 - tlv2; // vector along the top edge
    ofVec2f xvec22 = brv2 - blv2; // vector along the bottom edge
    ofVec2f yvec12 = blv2 - tlv2; // vector along the left edge
    ofVec2f yvec22 = brv2 = blv2; // vector along the right
    
    if (movie2.isLoaded()) { // check for video source
        pixels = movie2.getPixels();
        nChannels = movie2.getPixelsRef().getNumChannels();
        mediawidth = movie2.getWidth();
        mediaheight = movie2.getHeight();
    } else if (mClient2.isSetup()) {
        // use syphon source
        // draw syphon to fbo to get pixels
        ofFbo fbo;
        fbo.allocate(mClient2.getWidth(), mClient2.getHeight(), GL_RGBA);
        fbo.begin();
        mClient2.draw(0, 0);
        fbo.end();
        ofPixels feedPxl;
        fbo.readToPixels(feedPxl);
        
        pixels = feedPxl.getPixels();
        nChannels = feedPxl.getNumChannels();
        mediawidth = feedPxl.getWidth();
        mediaheight = feedPxl.getHeight();
    } else {
        // error image
        pixels = errorImg.getPixels();
        nChannels = 3;
        mediawidth = errorImg.getWidth();
        mediaheight = errorImg.getHeight();
    }

    // let's move through the "RGB(A)" char array
    for (int i = 0; i < mediawidth; i+=1){
        // make y vect at specific col
        float coloffset = 1.0 / (float)mediawidth * i;
        ofVec2f colp1 = tlv2 + xvec12 * coloffset;
        ofVec2f colp2 = blv2 + xvec22 * coloffset;
        ofVec2f thisyvec(colp2.x - colp1.x, colp2.y - colp1.y);
        
        for (int j = 0; j < mediaheight; j+=1){
            unsigned char r = pixels[(j * mediawidth + i)*nChannels];
            unsigned char g = pixels[(j * mediawidth + i)*nChannels+1];
            unsigned char b = pixels[(j * mediawidth + i)*nChannels+2];
            
            ofSetColor(r, g, b);
            
            float rowoffset = 1.0/(float)mediaheight * j;
            ofVec2f pos = colp1 + thisyvec * rowoffset;
            ofRect(pos.x/5, pos.y/5, 1, 1);
        }
    }
}

//--------------------------------------------------------------
void testApp::keyPressed(int key){
    
    printf("%d", ssd.size() + 17);
    printf("%d", 13);
}

//--------------------------------------------------------------
void testApp::keyReleased(int key){

}

//--------------------------------------------------------------
void testApp::mouseMoved(int x, int y){

}

//--------------------------------------------------------------
void testApp::mouseDragged(int x, int y, int button){

}

//--------------------------------------------------------------
void testApp::mousePressed(int x, int y, int button){

}

//--------------------------------------------------------------
void testApp::mouseReleased(int x, int y, int button){

}

//--------------------------------------------------------------
void testApp::windowResized(int w, int h){

}

//--------------------------------------------------------------
void testApp::gotMessage(ofMessage msg){

}

//--------------------------------------------------------------
void testApp::dragEvent(ofDragInfo dragInfo){ 

}