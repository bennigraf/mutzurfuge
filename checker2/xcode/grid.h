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
    TileAnimation(string type, string direction, vector<Vec3f> nodes, ColorAf color);
    bool isFinished();
    void draw(int pxlW, int pxlH);
    void drawFold(int pxlW, int pxlH);
    void drawShift(int pxlW, int pxlH);
    void drawExplode(int pxlW, int pxlH);
    void drawFall(int pxlW, int pxlH);
    
    bool finished;
    vector<Vec3f> nodes; // original nodes to operate on
    string type;
    string direction;
    ColorAf color;
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
    void setTileColor(int x, int y, ColorAf col);
    void setTileColorNeighbour(int x, int y, ColorAf col, string nb);
    
    vector<Vec3f> getTileNodes(int, int);
    
    Vec2i dimensions;
    vector<Vec3f> nodes;
    
    vector<ColorAf> tileColors;
    vector<TileAnimation> tileAnimations;
    
    gl::Fbo mFbo;

};





