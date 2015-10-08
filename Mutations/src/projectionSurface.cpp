//
//  projectionSurface.cpp
//  localArucoTest
//
//  Created by Benjamin Graf on 07.06.14.
//
//

#include "projectionSurface.h"


ProjectionSurface::ProjectionSurface(int myid, string boardConf, ofVec2f _size) {
    id = myid;
    boardConfigurationFile = boardConf;
    size = _size;
    plane.set(_size.x, _size.y);
    plane.setResolution(2, 2);
    plane.setPosition(0, 0, 0);
    aruco::Board board;
}

void ProjectionSurface::setBoard(aruco::Board board) {
    board = board;
}

void ProjectionSurface::drawHitmap() {
	plane.draw();
}

void ProjectionSurface::drawVisu() {
//	ofSetColor(ofColor::white);
	ofSetColor(ofColor(235, 116, 5, 255));
	float x = size.x / -2.f;
	float y = size.y / -2.f;
	float w = size.x;
	float h = size.y;
	ofLine(x, y, x+w, y);
	ofLine(x+w, y, x+w, y+h);
	ofLine(x+w, y+h, x, y+h);
	ofLine(x, y+h, x, y);

	float xoffs = ofRandom(-1.f, 1.f);
	float yoffs = ofRandom(-1.f, 1.f);
	float c = xoffs * yoffs;
	ofColor col = ofColor::red;
	col.a = c * 127 + 127;
	ofSetColor(col);
	xoffs = (xoffs + 1) / 2.f;
	yoffs = (yoffs + 1) / 2.f;
	float tw = size.x / 10;
	float th = size.y / 10;
	ofRect(x + xoffs * (size.x-tw), y + yoffs * (size.y-th), tw, th);

}




