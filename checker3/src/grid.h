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
#include "cinder/Timeline.h"


#endif /* defined(__checker__grid__) */


class TileAnimation {
public:
    TileAnimation(std::string type, std::string direction, std::vector<cinder::Vec3f> nodes, cinder::ColorAf color);
    bool isFinished();
    void draw(int pxlW, int pxlH);
    void drawFold(int pxlW, int pxlH);
    void drawShift(int pxlW, int pxlH);
    void drawExplode(int pxlW, int pxlH);
    void drawFall(int pxlW, int pxlH);
    
    bool finished;
    std::vector<cinder::Vec3f> nodes; // original nodes to operate on
    std::string type;
    std::string direction;
    cinder::ColorAf color;
    cinder::Anim<float> a; // this "animates" from 0 to 1 over a specific time
};


class Grid {
public:
    Grid(int, int);
    void setup(int, int);
    void update();
    void updateDimensions(int x, int y);
    void draw();
    void drawBasicGrid();
    void oscMessage(cinder::osc::Message);
    
    void setTiles();
    void setNodes();
    void setTileColor(int x, int y, cinder::ColorAf col);
    void setTileColorNeighbour(int x, int y, cinder::ColorAf col, std::string nb);
    
    std::vector<cinder::Vec3f> getTileNodes(int, int);
    
    cinder::Vec2i dimensions;
    std::vector<cinder::Vec3f> nodes;
    
    std::vector<cinder::ColorAf> tileColors;
    std::vector<TileAnimation> tileAnimations;
    
    cinder::gl::Fbo mFbo;
    
};





