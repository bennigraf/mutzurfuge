//
//  projectionSurface.cpp
//  localArucoTest
//
//  Created by Benjamin Graf on 07.06.14.
//
//

#include "projectionSurface.h"


ProjectionSurface::ProjectionSurface(int myid, string boardConf, ofVec2f size) {
    id = myid;
    boardConfigurationFile = boardConf;
    plane.set(size.x, size.y);
    plane.setResolution(2, 2);
    plane.setPosition(0, 0, 0);
    aruco::Board board;
}

void ProjectionSurface::setBoard(aruco::Board board) {
    board = board;
}