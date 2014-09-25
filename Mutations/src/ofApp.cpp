#include "ofApp.h"

#include "ofxCv.h"

#include "ofxAndroidVibrator.h"

#include "json.h"

// bgraf stuff obviously
void drawMarker(float size, const ofColor & color){
	ofDrawAxis(size);
	ofPushMatrix();
    // move up from the center by size*.5
    // to draw a box centered at that point
    ofTranslate(0,size*0.5,0);
    ofFill();
    ofSetColor(color,50);
    ofBox(size);
    ofNoFill();
    ofSetColor(color);
    ofBox(size);
	ofPopMatrix();
}

//--------------------------------------------------------------
void ofApp::setup(){
	ofBackground(255,255,255);
	ofSetLogLevel(OF_LOG_NOTICE);
	ofSetOrientation(OF_ORIENTATION_90_LEFT);

	noconnectionImg.loadImage("noconnection-error.png");
	noboardfoundImg.loadImage("nosurface-warning.png");

	if(!grabber.isInitialized()) {
		grabber.initGrabber(640, 480);
	}

	// calculate draw size to avoid scaling video content to strange ratios
	// (video will be drawn at maximum size fitting in the screen with bars usually left and right)
	// scale height to resolution-height and check if videowidth is smaller that resolution width
	// if not, do the same for width, that should work then
	float fact = ofGetHeight() / (float)grabber.getHeight();
	drawSize.x = grabber.getWidth() * fact;
	drawSize.y = grabber.getHeight() * fact;
	if(drawSize.x > ofGetWidth()) {
		float fact = ofGetWidth() / (float)grabber.getWidth();
		drawSize.y = ofGetHeight() * fact;
		drawSize.x = ofGetWidth() * fact;
	}
	drawOffset.x = (ofGetWidth() - drawSize.x) / 2.f;
	drawOffset.y = (ofGetHeight() - drawSize.y) / 2.f;

	// connect time for tcp connection
	connectTime = ofGetElapsedTimeMillis();

	lastAutofocus = 0.f;
    debugMsgStr = " ";

//    oscSender.setup("10.0.1.3", 12332);

	//aruco.setThreaded(false);
	aruco.setup("intrinsics.int", grabber.getWidth(), grabber.getHeight(), "");

    // set planes, size must fit actual planes, should put that somewhere else...
    ProjectionSurface psurf0(691, "boardConfigurationF0.yml", ofVec2f(4.3, 1.7));
    projectionSurfaces.push_back(psurf0);
    ProjectionSurface psurf1(268, "boardConfigurationF1.yml", ofVec2f(4.3, 1.7));
    projectionSurfaces.push_back(psurf1);
    ProjectionSurface psurf2(581, "boardConfigurationF2.yml", ofVec2f(4.3, 3.95));
    projectionSurfaces.push_back(psurf2);
    ProjectionSurface psurf3(761, "boardConfigurationF3.yml", ofVec2f(3.0, 1.7));
    projectionSurfaces.push_back(psurf3);
    ProjectionSurface psurf4(528, "boardConfigurationF4.yml", ofVec2f(3.0, 1.7));
    projectionSurfaces.push_back(psurf4);
    ProjectionSurface psurf5(286, "boardConfigurationF5.yml", ofVec2f(4.3, 1.7));
    projectionSurfaces.push_back(psurf5);
    ProjectionSurface psurf6(484, "boardConfigurationF6.yml", ofVec2f(4.3, 1.7));
    projectionSurfaces.push_back(psurf6);
    ProjectionSurface psurf7(99, "boardConfigurationF7.yml", ofVec2f(4.3, 3.95));
    projectionSurfaces.push_back(psurf7);
    ProjectionSurface psurf8(222, "boardConfigurationF8.yml", ofVec2f(3.0, 1.7));
    projectionSurfaces.push_back(psurf8);
    ProjectionSurface psurf9(903, "boardConfigurationF9.yml", ofVec2f(3.0, 1.7));
    projectionSurfaces.push_back(psurf9);

    for (int i = 0; i < projectionSurfaces.size(); i++) {
        ProjectionSurface surfc = projectionSurfaces[i];
        aruco.addBoardConf(surfc.boardConfigurationFile);
        projectionSurfaces[i].setBoard(aruco.getBoards()[i]);
    }

	showMarkers = true;
	showBoard = true;
	showBoardImage = false;

	setupDrawStuff();

	// android!!
	ofxAndroidLockScreenSleep();
}
void ofApp::setupDrawStuff() {
	// bgraf setup stuff
	ofSetFrameRate(30);
	ofDisableArbTex();
	ofEnableAlphaBlending();

	hitmapFbo.allocate(grabber.getWidth(), grabber.getHeight(), GL_RGBA);
	hitmapPixels.allocate(grabber.getWidth(), grabber.getHeight(), OF_PIXELS_RGBA);
	hitmapPixels.setColor(ofColor::black);
	setupHitmapImages();

	visiFbo.allocate(grabber.getWidth(), grabber.getHeight(), GL_RGBA);
}
void ofApp::setupHitmapImages() {
// prepare 3 detection images for now, maybe improve this later (by using only half the colors or something, should be enough anyways...)
	// prepare 3 detection images
    for (int i = 0; i < 3; i++) {
        ofImage img;
        img.allocate(128, 128, OF_IMAGE_COLOR); // size must be pow2, but that's exactly half of 8bit color which is nice
        hitmapImgs.push_back(img);
    }
    // sorry, need to do this 3 times as well, don't know how to generalize
    for (int y = 0; y < 128; y++) {
        for (int x = 0; x < 128; x++) {
            ofColor c(0, 0, 0);
            c.r = x / 128.0 * 255;
            c.g = y / 128.0 * 255;
            c.b = 0;
            hitmapImgs[0].setColor(x, y, c);
            c.r = 0;
            c.g = x / 128.0 * 255;
            c.b = y / 128.0 * 255;
            hitmapImgs[1].setColor(x, y, c);
            c.r = y / 128.0 * 255;
            c.g = 0;
            c.b = x / 128.0 * 255;
            hitmapImgs[2].setColor(x, y, c);
//            hitmapImgs[3].setColor(x, y, c);
//            hitmapImgs[4].setColor(x, y, c);
//            hitmapImgs[5].setColor(x, y, c);
        }
    }
    for(int i = 0; i < 3; i++) {
        hitmapImgs[i].update();
    }
}

//--------------------------------------------------------------
void ofApp::update(){
	if(!tcpClient.isConnected()) {
		//if we are not connected lets try and reconnect every 3 seconds
		long deltaTime = ofGetElapsedTimeMillis() - connectTime;
		if( deltaTime > 3000 ){
			ofLog(OF_LOG_WARNING, "trying to connect to tcp");
			tcpClient.setup("10.0.0.5", 12333);
			connectTime = ofGetElapsedTimeMillis();
		}
	}

	grabber.update();
	if(grabber.isFrameNew()){
		// grafi
		aruco.detectBoards(grabber.getPixelsRef());
	}

}

//--------------------------------------------------------------
void ofApp::draw(){
	float foundBoard = false;
	ofClear(0);
    grabber.draw(drawOffset.x, drawOffset.y, drawSize.x, drawSize.y);

    // this does the actual boardy stuff
    int hitmapPlaneCounter = 0;
    hitmapFbo.begin();
    ofClear(0);
    hitmapFbo.end();
    visiFbo.begin();
    ofClear(0);
    visiFbo.end();
    for (int i = 0; i < aruco.getNumBoards() && hitmapPlaneCounter < 3; i++) {
        if (aruco.getBoardProbabilities()[i] > 0.03) {
            // board is in view
            hitmapPlaneToBoard[hitmapPlaneCounter] = i;
            foundBoard = true;

            // draw hitmap
            hitmapFbo.begin();
            ofPushMatrix();
            aruco.beginBoard(i);
            ofSetColor(ofColor::white);
            ofRotateX(90);
            hitmapImgs[hitmapPlaneCounter].bind();
            projectionSurfaces[i].drawHitmap();
            hitmapImgs[hitmapPlaneCounter].unbind();
            ofRotateX(-90);
            aruco.end();
            ofPopMatrix();
            hitmapFbo.end();

            // draw visualization thing
            visiFbo.begin();
            ofPushMatrix();
            aruco.beginBoard(i);
            ofRotateX(90);
            projectionSurfaces[i].drawVisu();
            ofRotateX(-90);
            aruco.end();
            ofPopMatrix();
            visiFbo.end();

            hitmapPlaneCounter += 1;
        }
    }

//    ofSetColor(ofColor(255, 255, 255, 127));
//    hitmapFbo.draw(0, ofGetHeight()*2, ofGetWidth(), -ofGetHeight()*2);

    ofSetColor(ofColor(255, 255, 255, 255));
//    visiFbo.draw(0, ofGetHeight()*2, ofGetWidth(), -ofGetHeight()*2);
    if(tcpClient.isConnected() && foundBoard) {
    	visiFbo.draw(drawOffset.x, drawOffset.y + drawSize.y, drawSize.x, drawSize.y * -1);
    }

    ofSetColor(ofColor(255, 255, 255, 255));
    if(!tcpClient.isConnected()) {
    	noconnectionImg.draw(drawOffset.x, drawOffset.y, drawSize.x, drawSize.y);
    }
    if(tcpClient.isConnected() && !foundBoard) {
    	noboardfoundImg.draw(drawOffset.x, drawOffset.y, drawSize.x, drawSize.y);
    }


    /*
	ofSetHexColor(0xF00FF0);
	ofDrawBitmapString("fps: " + ofToString(ofGetFrameRate()),700,10);
	ofDrawBitmapString("camera fps: " + ofToString(camera_fps),700,30);
	ofDrawBitmapString("Well done!",700,50);
    ofDrawBitmapString("markers detected: " + ofToString(aruco.getNumMarkers()),700, 70);
    ofDrawBitmapString(ofToString(ofGetWidth()),700, 90);
    ofDrawBitmapString(ofToString(ofGetHeight()),700, 110);
    ofDrawBitmapString(debugMsgStr, 700, 130);
	*/
}

//--------------------------------------------------------------
void ofApp::keyPressed  (int key){ 
	
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key){ 
	
}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h){

}

//--------------------------------------------------------------
void ofApp::touchDown(int x, int y, int id){
	if(ofGetElapsedTimef() - lastAutofocus > 15) {
		((ofxAndroidVideoGrabber*)grabber.getGrabber().get())->setAutoFocus(true);
		lastAutofocus = ofGetElapsedTimef();
	}
    hitmapFbo.readToPixels(hitmapPixels);
    ofLog(OF_LOG_WARNING, "Event!");

    // scale clicks to fbo size
//    int fbox = (int)(x / (float)ofGetWidth() * grabber.getWidth());
	int fbox = (int)((x - drawOffset.x) / (float)drawSize.x * grabber.getWidth());

    // fbo is being stored upside down...
    // there's also this weird scaling thing, I need to draw the fbo twice the size...?
//    int fboy = grabber.getHeight() - (int)(y / 2.f / (float)ofGetHeight() * grabber.getHeight());
	int fboy = grabber.getHeight() - (int)((y - drawOffset.y) / (float)drawSize.y * grabber.getHeight());

    ofColor c = hitmapPixels.getColor(fbox, fboy);
    ofVec2f pc(0.f, 0.f);
    bool foundPlane = false;
    int psurfid = -1;
    // cout << hitmapPlaneToBoard[0] << " " << hitmapPlaneToBoard[1] << " " << hitmapPlaneToBoard[2] << endl;
    ofLog(OF_LOG_WARNING, "event" + ofToString(x) + " " + ofToString(y));
    ofLog(OF_LOG_WARNING, "fbo-pos " + ofToString(fbox) + " " + ofToString(fboy));
    ofLog(OF_LOG_WARNING, "Color " + ofToString(c));
    if(c.r > 0 && c.g > 0 && c.b == 0) {
        // plane 0
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[0]];
        psurfid = psurf.id;
        pc.x = c.r / 255.f;
        pc.y = c.g / 255.f;
        foundPlane = true;
    }
    if(c.r == 0 && c.g > 0 && c.b > 0) {
        // plane 1
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[1]];
        psurfid = psurf.id;
        pc.x = c.g / 255.f;
        pc.y = c.b / 255.f;
        foundPlane = true;
    }
    if(c.r > 0 && c.g == 0 && c.b > 0) {
        // plane 2
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[2]];
        psurfid = psurf.id;
        pc.x = c.b / 255.f;
        pc.y = c.r / 255.f;
        foundPlane = true;
    }

    if(foundPlane) {
    	ofxAndroidVibrator::vibrate(45);
//        ofxOscMessage m;
//		m.setAddress("/hit");
//		m.addIntArg(psurfid);
//		m.addFloatArg(pc.x);
//		m.addFloatArg(pc.y);
//		oscSender.sendMessage(m);
//        cout << "sending osc message" << endl;
//        cout << "/hit" << " " << psurfid << " " << pc.x << " " << pc.y << endl;
		Json::Value root;
		root["x"] = pc.x;
		root["y"] = pc.y;
		root["id"] = psurfid;
		root["event"] = "press";
		ofLog(OF_LOG_WARNING, "hit " + ofToString(psurfid) + " " + ofToString(pc));
		Json::FastWriter jwrite;
//		ofLog(OF_LOG_WARNING, jwrite.write(root));
		tcpClient.sendRaw(jwrite.write(root));
    }
    std::stringstream msg;
    msg << "osc: " << psurfid << ", " << pc;
    debugMsgStr = msg.str(); // returns std::string object
}

//--------------------------------------------------------------
void ofApp::touchMoved(int x, int y, int id){
}

//--------------------------------------------------------------
void ofApp::touchUp(int x, int y, int id){
	if(ofGetElapsedTimef() - lastAutofocus > 15) {
		((ofxAndroidVideoGrabber*)grabber.getGrabber().get())->setAutoFocus(true);
		lastAutofocus = ofGetElapsedTimef();
	}
    hitmapFbo.readToPixels(hitmapPixels);
    ofLog(OF_LOG_WARNING, "Event!");

    // scale clicks to fbo size
//    int fbox = (int)(x / (float)ofGetWidth() * grabber.getWidth());
	int fbox = (int)((x - drawOffset.x) / (float)drawSize.x * grabber.getWidth());

    // fbo is being stored upside down...
    // there's also this weird scaling thing, I need to draw the fbo twice the size...?
//    int fboy = grabber.getHeight() - (int)(y / 2.f / (float)ofGetHeight() * grabber.getHeight());
	int fboy = grabber.getHeight() - (int)((y - drawOffset.y) / (float)drawSize.y * grabber.getHeight());

    ofColor c = hitmapPixels.getColor(fbox, fboy);
    ofVec2f pc(0.f, 0.f);
    bool foundPlane = false;
    int psurfid = -1;
    // cout << hitmapPlaneToBoard[0] << " " << hitmapPlaneToBoard[1] << " " << hitmapPlaneToBoard[2] << endl;
    ofLog(OF_LOG_WARNING, "event" + ofToString(x) + " " + ofToString(y));
    ofLog(OF_LOG_WARNING, "fbo-pos " + ofToString(fbox) + " " + ofToString(fboy));
    ofLog(OF_LOG_WARNING, "Color " + ofToString(c));
    if(c.r > 0 && c.g > 0 && c.b == 0) {
        // plane 0
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[0]];
        psurfid = psurf.id;
        pc.x = c.r / 255.f;
        pc.y = c.g / 255.f;
        foundPlane = true;
    }
    if(c.r == 0 && c.g > 0 && c.b > 0) {
        // plane 1
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[1]];
        psurfid = psurf.id;
        pc.x = c.g / 255.f;
        pc.y = c.b / 255.f;
        foundPlane = true;
    }
    if(c.r > 0 && c.g == 0 && c.b > 0) {
        // plane 2
        ProjectionSurface psurf = projectionSurfaces[hitmapPlaneToBoard[2]];
        psurfid = psurf.id;
        pc.x = c.b / 255.f;
        pc.y = c.r / 255.f;
        foundPlane = true;
    }

    if(foundPlane) {
//      ofxOscMessage m;
//		m.setAddress("/hit");
//		m.addIntArg(psurfid);
//		m.addFloatArg(pc.x);
//		m.addFloatArg(pc.y);
//		oscSender.sendMessage(m);
//        cout << "sending osc message" << endl;
//        cout << "/hit" << " " << psurfid << " " << pc.x << " " << pc.y << endl;
		Json::Value root;
		root["x"] = pc.x;
		root["y"] = pc.y;
		root["id"] = psurfid;
		root["event"] = "release";
		ofLog(OF_LOG_WARNING, "hit " + ofToString(psurfid) + " " + ofToString(pc));
		Json::FastWriter jwrite;
//		ofLog(OF_LOG_WARNING, jwrite.write(root));
		tcpClient.sendRaw(jwrite.write(root));
    }
    std::stringstream msg;
    msg << "osc: " << psurfid << ", " << pc;
    debugMsgStr = msg.str(); // returns std::string object
}

//--------------------------------------------------------------
void ofApp::touchDoubleTap(int x, int y, int id){

}

//--------------------------------------------------------------
void ofApp::touchCancelled(int x, int y, int id){

}

//--------------------------------------------------------------
void ofApp::swipe(ofxAndroidSwipeDir swipeDir, int id){

}

//--------------------------------------------------------------
void ofApp::pause(){
	ofxAndroidUnlockScreenSleep();
	// this is a hack to avoid paused state (which confuses everything on resume, most notably gl and it's textures)
	std::exit(0);
}

//--------------------------------------------------------------
void ofApp::stop(){
	ofxAndroidUnlockScreenSleep();
	// this is a hack to avoid paused state (which confuses everything on resume, most notably gl and it's textures)
	std::exit(0);
}

//--------------------------------------------------------------
void ofApp::resume(){
	// this is never called because of the hack in pause() and stop()
	setupDrawStuff();
}

//--------------------------------------------------------------
void ofApp::reloadTextures(){
	// this is never called because of the hack in pause() and stop()
	setupDrawStuff();
}

//--------------------------------------------------------------
bool ofApp::backPressed(){
	return false;
}

//--------------------------------------------------------------
void ofApp::okPressed(){

}

//--------------------------------------------------------------
void ofApp::cancelPressed(){

}
