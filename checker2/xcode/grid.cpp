//
//  grid.cpp
//  checker
//
//  Created by Benjamin Graf on 01.06.14.
//
//

#include "grid.h"
#include "cinder/gl/Fbo.h"

using namespace ci;
using namespace ci::app;
using namespace std;

Grid::Grid(int width, int height) {
    dimensions.set(width, height);
    // update tiles
    setTiles();
}

void Grid::setup(int pxlWidth, int pxlHeight) {
    console() << "Grid loaded!" << endl;
    
    mFbo = gl::Fbo(pxlWidth, pxlHeight);
    mFbo.getTexture(0).setFlipped(true);
}

void Grid::setTiles() {
    tileColors.clear();
    tileColors.reserve(dimensions.x * dimensions.y);
    for (int i = 0; i < dimensions.x * dimensions.y; i++) {
        //        tileColors.push_back(Colorf(i / 255.f, 1.f, 0.f));
        tileColors.push_back(Colorf(1.f, 1.f, 1.f));
    }
}
void Grid::setNodes() {
    nodes.clear();
    // setup nodes of grid
    for (int h = 0; h <= dimensions.y; h++) {
        float y = h/(float)dimensions.y;
        for (int w = 0; w <= dimensions.x; w++) {
            float x = w/(float)dimensions.x;
            nodes.push_back(Vec3f(x, y, 0));
        }
    }
}

void Grid::update() {
    
}
void Grid::updateDimensions(int x, int y) {
    dimensions.set(x, y);
    setTiles();
    setNodes();
}

void Grid::oscMessage(osc::Message msg) {
    // message to set tile color
    // message should be int x, int y, float r, float g, float b
    if(msg.getNumArgs() == 5 &&
       msg.getArgType(0) == osc::TYPE_INT32 &&
       msg.getArgType(1) == osc::TYPE_INT32 &&
       msg.getArgType(2) == osc::TYPE_FLOAT &&
       msg.getArgType(3) == osc::TYPE_FLOAT &&
       msg.getArgType(4) == osc::TYPE_FLOAT) {
        int x = msg.getArgAsInt32(0);
        int y = msg.getArgAsInt32(1);
        float r = msg.getArgAsFloat(2);
        float g = msg.getArgAsFloat(3);
        float b = msg.getArgAsFloat(4);
        tileColors[y * dimensions.x + x] = Colorf(r, g, b);
        console() << "setting stuff" << endl;
    }
    // trigger tile animation -- i.e. fold over, direction
    // message: /grid type tilex tiley direction
    // type is: 'fold', 'shift', 'fall', 'explode'
    // direction is: 'up', 'left', 'down', 'right'
    if(msg.getNumArgs() == 4 &&
       msg.getArgType(0) == osc::TYPE_STRING &&
       msg.getArgType(1) == osc::TYPE_INT32 &&
       msg.getArgType(2) == osc::TYPE_INT32 &&
       msg.getArgType(3) == osc::TYPE_STRING) {
        console() << "folding something... " << msg.getArgAsString(0);
        // how would I go from here??
        // 1. create an TileAnimation-item with a type, tilepos and direction
        // 1.a add it to a TileAnimation-vector living in this grid instance
        // 2. inside this, there's a draw function which draws only that specific tile
        // 2.a use app:timeline for easing
        // 3. deconstruct the object on finish somehow and delete it from the vector...
        //      maybe some kind of callback?
        TileAnimation ta(msg.getArgAsString(0), msg.getArgAsString(3));
        vector<Vec3f> animNodes;
        int tPosX = msg.getArgAsInt32(1);
        int tPosY = msg.getArgAsInt32(2);
        int ndxTL = tPosY * (dimensions.x + 1) + tPosX;
        int ndxTR = tPosY * (dimensions.x + 1) + tPosX + 1;
        int ndxBL = (tPosY + 1) * (dimensions.x + 1) + tPosX;
        int ndxBR = (tPosY + 1) * (dimensions.x + 1) + tPosX + 1;
        animNodes.push_back(nodes[ndxTL]);
        animNodes.push_back(nodes[ndxTR]);
        animNodes.push_back(nodes[ndxBR]);
        animNodes.push_back(nodes[ndxBL]);
        ta.setNodes(animNodes);
        tileAnimations.push_back(ta);
//        tileAnimations
    }
    
}

void Grid::drawBasicGrid() {
    int pxlWidth = mFbo.getWidth();
    int pxlHeight = mFbo.getHeight();
    
    // draw upside down into fbo because later it's going to be inverted when drawn to screen
//    gl::translate(Vec2f( 0, mFbo.getHeight()));
//    gl::scale(Vec2f(1, -1));
    
    for (int h = 0; h < dimensions.y; h++) {
        for(int w = 0; w < dimensions.x; w++) {
            int ndx = h * (dimensions.x+1) + w; // +1 because the rightmost nodes are also included
            Vec3f node = nodes[ndx];
            float xpos = node.x * pxlWidth;
            float ypos = node.y * pxlHeight;
            float xsize = pxlWidth/(float)dimensions.x - 1;
            float ysize = pxlHeight/(float)dimensions.y - 1;

            gl::color(tileColors[h * dimensions.x + w]);
//            gl::color(Colorf(1.f/(float)dimensions.y * (float)h, 1.f, 1.f));
            gl::drawSolidRect(Rectf(xpos, ypos, xpos + xsize, ypos + ysize));
//            gl::drawLine(Vec2f(xpos, ypos), Vec2f(xpos + xsize, ypos + ysize));
        }
    }
    
}

// drawing pipeline, handles animations as well
void Grid::draw() {
    mFbo.bindFramebuffer();
    gl::pushMatrices();
    gl::clear(Colorf(0.f, 0.f, 0.f));
    
    drawBasicGrid();
    
    for (int i = 0; i < tileAnimations.size(); i++) {
        tileAnimations.at(i).draw(mFbo.getWidth(), mFbo.getHeight());
    }
    
    gl::popMatrices();
    mFbo.unbindFramebuffer();
}

TileAnimation::TileAnimation(string aType, string aDirection) {
    type = aType;
    direction = aDirection;
    a = 0.f;
//    a = 0.5;
    nodes.reserve(4);
    timeline().apply(&a, 2.0f, 5.0f);
}
void TileAnimation::setNodes(vector<Vec3f> someNodes) {
    nodes = someNodes;
}
void TileAnimation::draw(int pxlW, int pxlH) {
    // switch doesn't work with strings... duh
    // going to do this with function pointers at some point or class inheritance
    if(type == "fold") {
        drawFold(pxlW, pxlH);
    } else if(type == "shift") {
        drawShift(pxlW, pxlH);
    } else if(type == "fall") {
        drawFall(pxlW, pxlH);
    } else if(type == "explode") {
        drawExplode(pxlW, pxlH);
    }
}
void TileAnimation::drawFold(int pxlW, int pxlH) {
    Vec3f scl(pxlW, pxlH, 1);
    Vec3f t(0, 0, 10);
    Vec3f size(nodes[2] - nodes[0]);
    Vec3f cntr(nodes[2] - size/2);
    vector<Vec3f> newNodes;
    newNodes[0] = nodes[0];
    newNodes[0].x = nodes[0].x + a * size.x * 2;

    // right:
    // tl.x = tl.x + a
    // tl.y = tl.y
    // tr = tr
    // br = br
    // bl.x = bl.x + a
    // bl.y = bl.y
    
    gl::pushMatrices();
    gl::scale(a * 5, a * 5);
    gl::color(0.f, 1.f, 0.f);
    gl::lineWidth(10);
    gl::drawLine(nodes[0]*scl+t, nodes[1]*scl+t);
    gl::drawLine(nodes[1]*scl+t, nodes[2]*scl+t);
    gl::drawLine(nodes[2]*scl+t, nodes[3]*scl+t);
    gl::drawLine(nodes[3]*scl+t, nodes[0]*scl+t);
    gl::color(0.f, 0.f, 1.f);
    glBegin(GL_QUAD_STRIP); // start drawing
    gl::vertex(nodes[0] * scl+t);
    gl::vertex(nodes[1] * scl+t);
    gl::vertex(nodes[3] * scl+t);
    gl::vertex(nodes[2] * scl+t);
    glEnd(); // stop drawing
    gl::popMatrices();
}
void TileAnimation::drawShift(int pxlW, int pxlH) { }
void TileAnimation::drawFall(int pxlW, int pxlH) { }
void TileAnimation::drawExplode(int pxlW, int pxlH) { }







