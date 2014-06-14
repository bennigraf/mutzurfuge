//
//  grid.cpp
//  checker
//
//  Created by Benjamin Graf on 01.06.14.
//
//

#include "grid.h"
#include "cinder/gl/Fbo.h"
#include "cinder/Rand.h"

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
    
    mFbo = gl::Fbo(pxlWidth, pxlHeight, GL_RGBA);
    mFbo.getTexture(0).setFlipped(true);
}

void Grid::setTiles() {
    tileColors.clear();
    tileColors.reserve(dimensions.x * dimensions.y);
    for (int i = 0; i < dimensions.x * dimensions.y; i++) {
        //        tileColors.push_back(Colorf(i / 255.f, 1.f, 0.f));
        tileColors.push_back(ColorAf(1.f, 1.f, 1.f, 1.f));
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
    vector<int> removeMe;
    for (int i = tileAnimations.size()-1; i >= 0; i--) {
        if (tileAnimations[i].isFinished()) {
            removeMe.push_back(i);
        }
    }
    for (int i = 0; i < removeMe.size(); i++) {
        tileAnimations.erase(tileAnimations.begin() + removeMe[i]);
    }
    
}
void Grid::updateDimensions(int x, int y) {
    dimensions.set(x, y);
    setTiles();
    setNodes();
}

void Grid::oscMessage(osc::Message msg) {
    // ========= message to set tile color
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
        if(tileColors.size() > y*dimensions.x+x) {
            tileColors[y * dimensions.x + x] = ColorAf(r, g, b, 1);
        }
        //        console() << "setting stuff " << ColorAf(r, g, b, 1) << endl;
    }
    // ========= message to clear grid
    if(msg.getArgType(0) == osc::TYPE_STRING &&
       msg.getArgAsString(0) == "clear") {
        for (int i = 0; i < tileColors.size(); i++) {
            tileColors[i] = ColorAf(1, 1, 0, 1);
        }
        //        console() << "clear" << endl;
    }
    
    // ========= message to set many
    if(msg.getArgType(0) == osc::TYPE_STRING &&
       msg.getArgAsString(0) == "setMany" &&
       msg.getArgType(1) == osc::TYPE_INT32) {
        int offset = msg.getArgAsInt32(1);
        //        for (int i = 0; i < tileColors.size(); i++) {
        //            int ndx = 2 + i * 3;
        //            console() << ndx << " " << msg.getNumArgs() << endl;
        //            if() {
        //                float r = msg.getArgAsFloat(ndx + 0);
        //                float g = msg.getArgAsFloat(ndx + 1);
        //                float b = msg.getArgAsFloat(ndx + 2);
        //                tileColors[i] = ColorAf(r, g, b, 1);
        //            }
        //        }
        for (int i = 2; i < msg.getNumArgs(); i++) {
            int clrNdx = offset + i / 3;
            if (tileColors.size() >= clrNdx) {
                float r = msg.getArgAsFloat(i++);
                float g = msg.getArgAsFloat(i++);
                float b = msg.getArgAsFloat(i);
                tileColors[clrNdx] = ColorAf(r, g, b, 1);
                //                console() << r << " " << g << " " << b << endl;
            }
        }
    }
    
    // ========= trigger tile animation -- i.e. fold over, direction
    // message: /grid type tilex tiley direction
    // type is: 'fold', 'shift', 'fall', 'explode'
    // direction is: 'up', 'left', 'down', 'right'
    if((msg.getNumArgs() == 4 || msg.getNumArgs() == 5) &&
       msg.getArgType(0) == osc::TYPE_STRING &&
       msg.getArgType(1) == osc::TYPE_INT32 &&
       msg.getArgType(2) == osc::TYPE_INT32 &&
       msg.getArgType(3) == osc::TYPE_STRING) {
        //        console() << "folding something... " << msg.getArgAsString(0);
        string type = msg.getArgAsString(0);
        int tPosX = msg.getArgAsInt32(1);
        int tPosY = msg.getArgAsInt32(2);
        string dir = msg.getArgAsString(3);
        ColorAf tileC = tileColors[tPosY * dimensions.x + tPosX];
        TileAnimation ta(type, dir, getTileNodes(tPosX, tPosY), tileC);
        tileAnimations.push_back(ta);
        // clear on with special flag
        if(msg.getNumArgs() == 5 &&
           msg.getArgType(4) == osc::TYPE_INT32 &&
           msg.getArgAsInt32(4) == 1) {
            tileColors[tPosY * dimensions.x + tPosX] = ColorAf(1, 1, 1, 1);
            timeline().add([=]{ setTileColorNeighbour(tPosX, tPosY, tileC, dir); },
                           timeline().getCurrentTime() + 0.28);
        }
    }
}
vector<Vec3f> Grid::getTileNodes(int posx, int posy) {
    int ndxTL = posy * (dimensions.x + 1) + posx;
    int ndxTR = ndxTL + 1;
    int ndxBL = ndxTR + dimensions.x;
    int ndxBR = ndxBL + 1;
    vector<Vec3f> thisnodes;
    thisnodes.push_back(nodes[ndxTL]);
    thisnodes.push_back(nodes[ndxTR]);
    thisnodes.push_back(nodes[ndxBR]);
    thisnodes.push_back(nodes[ndxBL]);
    return thisnodes;
}
void Grid::setTileColor(int x, int y, ColorAf col) {
    tileColors[y * dimensions.x + x] = col;
}
void Grid::setTileColorNeighbour(int x, int y, ColorAf col, string nb) {
    Vec2i newTile(-1, -1);
    if (nb == "top" && y > 1) {
        newTile.set(x, y-1);
    }
    if(nb == "left" && x > 1) {
        newTile.set(x-1, y);
    }
    if (nb == "bottom" && y < dimensions.y - 1) {
        newTile.set(x, y+1);
    }
    if(nb == "right" && x < dimensions.x - 1) {
        newTile.set(x+1, y);
    }
    if (newTile.x >= 0) {
        setTileColor(newTile.x, newTile.y, col);
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
            //            float xsize = pxlWidth/(float)dimensions.x - 1;
            //            float ysize = pxlHeight/(float)dimensions.y - 1;
            float xsize = pxlWidth/(float)dimensions.x;
            float ysize = pxlHeight/(float)dimensions.y;
            
            //            gl::color(Colorf(1.f/(float)dimensions.y * (float)h, 1.f, 1.f));
            //            console() << tileColors[h * dimensions.x + w] << endl;
            //            gl::color(ColorAf(1, 0, 1, 1));
            gl::color(tileColors[h * dimensions.x + w]);
            gl::drawSolidRect(Rectf(xpos, ypos, xpos + xsize, ypos + ysize));
            //            console() << "drawing" <<endl;
            //            gl::drawLine(Vec2f(xpos, ypos), Vec2f(xpos + xsize, ypos + ysize));
        }
    }
    
}

// drawing pipeline, handles animations as well
void Grid::draw() {
    mFbo.bindFramebuffer();
    // this is done to set the right viewport
    Area viewport = gl::getViewport();
    gl::setViewport(mFbo.getBounds() );
    
    gl::pushMatrices();
    gl::setMatricesWindowPersp(mFbo.getSize() );
    gl::clear(Colorf(1, 1, 1));
    
    drawBasicGrid();
    
    for (int i = 0; i < tileAnimations.size(); i++) {
        tileAnimations.at(i).draw(mFbo.getWidth(), mFbo.getHeight());
    }
    
    gl::popMatrices();
    // restore projection matrix thingy
    gl::setViewport(viewport);
    mFbo.unbindFramebuffer();
}






TileAnimation::TileAnimation(string aType, string aDirection, vector<Vec3f> tileNodes, ColorAf aColor) {
    finished = false;
    type = aType;
    direction = aDirection;
    nodes = tileNodes;
    color = aColor;
    a = 0.f;
    nodes.reserve(4);
    timeline().apply(&a, 1.0f, 0.28f, EaseInOutQuad());
    //    timeline().apply(&a, 1.0f, 0.28f, EaseInOutCubic());
    
}
bool TileAnimation::isFinished() {
    return a >= 1.f;
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
    Vec3f scl(pxlW, pxlH, 1.f);
    Vec3f t(0, 0, 0.1);
    Vec3f size(nodes[2] - nodes[0]);
    vector<Vec3f> newNodes;
    for (int i = 0; i < nodes.size(); i++) {
        newNodes.push_back(nodes[i]);
    }
    
    // fold top:
    if (direction == "top") {
        newNodes[2].y = nodes[2].y + a * size.y * -2;
        newNodes[3].y = nodes[3].y + a * size.y * -2;
        newNodes[2].x = nodes[2].x + math<float>::sin(a*M_PI) * size.x * 0.3;
        newNodes[3].x = nodes[3].x + math<float>::sin(a*M_PI) * size.x * -0.3;
        newNodes[2].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
        newNodes[3].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
    }
    // fold right:
    if (direction == "right") {
        newNodes[0].x = nodes[0].x + a * size.x * 2;
        newNodes[3].x = nodes[3].x + a * size.x * 2;
        newNodes[0].y = nodes[0].y + math<float>::sin(a*M_PI) * size.y * -0.3;
        newNodes[3].y = nodes[3].y + math<float>::sin(a*M_PI) * size.y * -0.3;
        newNodes[0].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
        newNodes[3].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
    }
    // fold down:
    if (direction == "down") {
        newNodes[0].y = nodes[0].y + a * size.y * 2;
        newNodes[1].y = nodes[1].y + a * size.y * 2;
        newNodes[0].x = nodes[0].x + math<float>::sin(a*M_PI) * size.x * -0.3;
        newNodes[1].x = nodes[1].x + math<float>::sin(a*M_PI) * size.x * 0.3;
        newNodes[0].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
        newNodes[1].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
    }
    // fold left:
    if (direction == "left") {
        newNodes[1].x = nodes[1].x + a * size.x * -2;
        newNodes[2].x = nodes[2].x + a * size.x * -2;
        newNodes[1].y = nodes[1].y + math<float>::sin(a*M_PI) * size.y * -0.3;
        newNodes[2].y = nodes[2].y + math<float>::sin(a*M_PI) * size.y * -0.3;
        newNodes[1].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
        newNodes[2].z = math<float>::sin(a * M_PI) * (float)size.x * 2.f;
    }
    
    gl::pushMatrices();
    gl::color(color);
    glBegin(GL_QUAD_STRIP); // start drawing
    gl::vertex(newNodes[0] * scl+t);
    gl::vertex(newNodes[1] * scl+t);
    gl::vertex(newNodes[3] * scl+t);
    gl::vertex(newNodes[2] * scl+t);
    glEnd(); // stop drawing
    gl::popMatrices();
}
void TileAnimation::drawShift(int pxlW, int pxlH) { }
void TileAnimation::drawFall(int pxlW, int pxlH) { }
void TileAnimation::drawExplode(int pxlW, int pxlH) { }







