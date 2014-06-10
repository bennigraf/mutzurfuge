//
//  grid.h
//  checker
//
//  Created by Benjamin Graf on 01.06.14.
//
//

#ifndef __checker__grid__
#define __checker__grid__

#include <iostream>

#include "cinder/gl/Fbo.h"
#include "OscListener.h"
#include "cinder/Timeline.h";


#endif /* defined(__checker__grid__) */

using namespace cinder;
using namespace std;


class TileAnimation {
public:
    TileAnimation(string type, string direction);
    void setNodes(vector<Vec3f> nodes);
    void draw(int pxlW, int pxlH);
    void drawFold(int pxlW, int pxlH);
    void drawShift(int pxlW, int pxlH);
    void drawExplode(int pxlW, int pxlH);
    void drawFall(int pxlW, int pxlH);
    
    vector<Vec3f> nodes; // original nodes to operate on
    string type;
    string direction;
    Anim<float> a; // this "animates" from 0 to 1 over a specific time
};


class Grid {
public:
    Grid(int, int);
    void setup(int, int);
    void update();
    void updateDimensions(int x, int y);
    void draw();
    void drawBasicGrid();
    void oscMessage(osc::Message);
    
    void setTiles();
    void setNodes();
    
    Vec2i dimensions;
    vector<Vec3f> nodes;
    
    vector<Colorf> tileColors;
    vector<TileAnimation> tileAnimations;
    
    gl::Fbo mFbo;

};





