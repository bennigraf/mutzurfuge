//
//  projectionSurface.h
//  localArucoTest
//
//  Created by Benjamin Graf on 07.06.14.
//
//

#ifndef __localArucoTest__projectionSurface__
#define __localArucoTest__projectionSurface__

#include <iostream>
#include "ofVec2f.h"
#include "of3dPrimitives.h"
#include "ofxAruco.h"

class ProjectionSurface {
public:
    ProjectionSurface(int id, string boardConf, ofVec2f size);
    void setBoard(aruco::Board);
    
    int id;
    string boardConfigurationFile;
    ofPlanePrimitive plane;
    aruco::Board board;
};





#endif /* defined(__localArucoTest__projectionSurface__) */
