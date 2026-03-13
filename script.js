const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const centerX = width/2;
const centerY = height/2;
const holeSize = .2;
let subSteps = 40;
let totalFrameCount = 50;
let gravity = .4;
let ballCount = 1000;

//Scene Objects
let rings = new Array();
let decayingRings = new Array();
let ballArray = new Array();
let GravityEffectors = new Array();

//Sim Constants
let wallRestitution = 1;
let ballRestitution = .75;
let ballSize = 5;

//Baking Log Variables
let bakedPositions = new Array();
let bakedRings = new Array();
let currentFrame = 0;

class GravityEffectorCircle
{
    constructor(r)
    {
        this.posX = centerX;
        this.posY = centerY;
        this.radius = r;
        this.r = 100;
        this.g = 100;
        this.b = 100;
    }
    drawGravityEffectorCircle()
    {
        ctx.beginPath();
        ctx.arc(this.posX,this.posY,this.radius,0,Math.PI*2);
        ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b},${1})`;
        ctx.fill();
        ctx.closePath();
    }
}

class Ring
{
    constructor(offset, radius)
    {
        this.offSet = offset;
        this.radius = radius;

        this.r = Math.floor(Math.random()*256);
        this.g = Math.floor(Math.random()*256);
        this.b = Math.floor(Math.random()*256);
        this.a = 1;
    }

    moveRotatingCircle()
    {
        this.offSet+=.01;
        if(rings[0].radius>150)
        {
            this.radius-=1;
            if(this.radius<1)
            {
                this.radius=1;
            }
        }
        if(decayingRings.indexOf(this)>-1)
        {
            if(this.a>=0)
            {
                this.a-=.033;
            }
            else
            {
                decayingRings.shift();
            }
        }
    }

    drawRotatingCircle()
    {
        ctx.beginPath();
        const startAngle = 0 + (this.offSet);
        const endAngle = (Math.PI * (2-holeSize))+this.offSet;
        ctx.arc(centerX,centerY,this.radius,startAngle,endAngle);
        ctx.strokeStyle = `rgba(${this.r}, ${this.g}, ${this.b},${this.a})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

class Ball
{
    constructor()
    {
        this.ballXPos = centerX+Math.random()*100-50;
        this.ballYPos = centerY+Math.random()*100-50;
        this.ballXVel = Math.random()*10-5;
        this.ballYVel = Math.random()*10-5;
        this.ballSize = ballSize;

        this.r = Math.floor(Math.random()*256);
        this.g = Math.floor(Math.random()*256);
        this.b = Math.floor(Math.random()*256);
        /*this.r=150;
        this.g=150;
        this.b=0;*/
    }

    drawBall()
    {
        //Fill
        ctx.beginPath();
        ctx.arc(this.ballXPos, this.ballYPos, this.ballSize, 0, Math.PI*2);

        ctx.fillStyle = `rgb(${this.r}, ${this.g}, ${this.b})`;
        ctx.fill();
        ctx.closePath();
        
        /*Border
        ctx.beginPath();
        ctx.arc(this.ballXPos,this.ballYPos,this.ballSize,0,Math.PI*2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = .1;
        ctx.stroke();
        ctx.closePath();*/
    }

    ballPhysics()
    {
        let distance = 0;
        this.g = 0;

        let newR = 25*Math.sqrt(Math.pow(this.ballXVel,2)+Math.pow(this.ballYVel,2));
        if(newR>255)
        {
            this.r = 255;
        }
        this.r = newR;
        let newB = 255-(25*Math.sqrt(Math.pow(this.ballXVel,2)+Math.pow(this.ballYVel,2)));
        if(newB<0)
        {
            this.b = 0;
        }
        this.b = newB;

        //Ball Gravity
        this.ballYVel += gravity/subSteps;

        //Gravity Effector Interaction
        for(let i=0;i<GravityEffectors.length;i++)
        {
            distance = Math.sqrt(Math.pow(GravityEffectors[i].posX-this.ballXPos,2)+Math.pow(GravityEffectors[i].posY-this.ballYPos,2));
            this.ballXVel += (200*(GravityEffectors[i].posX-this.ballXPos)/Math.pow(distance,2))/subSteps;
            this.ballYVel += (200*(GravityEffectors[i].posY-this.ballYPos)/Math.pow(distance,2))/subSteps;
        }

        //Inter-Ball Collision
        for(let i=ballArray.indexOf(this)+1;i<ballArray.length;i++)
        {
            //Find Distance Between Balls
            distance = Math.sqrt(Math.pow(ballArray[i].ballXPos-this.ballXPos,2)+Math.pow(ballArray[i].ballYPos-this.ballYPos,2));
            if(distance<this.ballSize+ballArray[i].ballSize)
            {
                //Find Normal
                const normalAngle = Math.atan2(ballArray[i].ballYPos-this.ballYPos, ballArray[i].ballXPos-this.ballXPos);

                const cos = Math.cos(normalAngle);
                const sin = Math.sin(normalAngle);

                //Find Normal Velocity
                const v1 = this.ballXVel * cos + this.ballYVel * sin;
                const v2 = ballArray[i].ballXVel * cos + ballArray[i].ballYVel * sin;

                //Only Collide If Moving Towards Each Other
                if (v1 - v2 > 0)
                {
                    //Find Impulse Velocity
                    let impV = (v1 - v2)*ballRestitution;
                    
                    //Calculate New Velocities
                    this.ballXVel -= impV*cos;
                    this.ballYVel -= impV*sin;
                    ballArray[i].ballXVel += impV*cos;
                    ballArray[i].ballYVel += impV*sin;
                }
                
                //Move Ball Away From Other Ball
                const overlap = ((this.ballSize) + (ballArray[i].ballSize)) - distance;
                this.ballXPos -= (overlap/2)*cos;
                this.ballYPos -= (overlap/2)*sin;
                ballArray[i].ballXPos += (overlap/2)*cos;
                ballArray[i].ballYPos += (overlap/2)*sin;
            }
        }

        //Gravity Effector Collision
        for(let i=0;i<GravityEffectors.length;i++)
        {
            distance = Math.sqrt(Math.pow(GravityEffectors[i].posX-this.ballXPos,2)+Math.pow(GravityEffectors[i].posY-this.ballYPos,2));
            if(distance<GravityEffectors[i].radius+this.ballSize)
            {
                const normalAngle = Math.atan2(this.ballYPos-GravityEffectors[i].posY, this.ballXPos-GravityEffectors[i].posX);

                const cos = Math.cos(normalAngle);
                const sin = Math.sin(normalAngle);

                const dotProduct = this.ballXVel*cos+this.ballYVel*sin;
                if(dotProduct>0) 
                {
                    this.ballXVel -= 2*dotProduct*cos*wallRestitution;
                    this.ballYVel -= 2*dotProduct*sin*wallRestitution;
                }
                
                //Move Ball Away
                this.ballXPos = GravityEffectors[i].posX+(GravityEffectors[i].radius+this.ballSize)*cos;
                this.ballYPos = GravityEffectors[i].posY+(GravityEffectors[i].radius+this.ballSize)*sin;
            }
        }

        //Wall Collision
        distance = Math.sqrt(Math.pow(centerX-this.ballXPos,2)+Math.pow(centerY-this.ballYPos,2));
        if(rings.length>0)
        {
            if(rings[0].radius-3-this.ballSize<distance)
            {
                const startAngle = rings[0].offSet%(2*Math.PI);
                const endAngle = (rings[0].offSet + (Math.PI * (2 - holeSize))) % (Math.PI * 2);

                const normalAngle = (Math.atan2(this.ballYPos - centerY, this.ballXPos - centerX) + Math.PI * 2) % (Math.PI * 2);
                const cos = Math.cos(normalAngle);
                const sin = Math.sin(normalAngle);
                if(startAngle > endAngle ? (normalAngle > endAngle && normalAngle < startAngle) : (normalAngle > endAngle || normalAngle < startAngle))
                {
                    //Remove Broken Ring
                    decayingRings.push(rings[0]);
                    rings.shift();
                }
                else
                {
                    const dotProduct = this.ballXVel*cos+this.ballYVel*sin;
                    if(dotProduct>0) 
                    {
                        this.ballXVel -= 2*dotProduct*cos*wallRestitution;
                        this.ballYVel -= 2*dotProduct*sin*wallRestitution;
                    }
                    
                    //Move Ball Away
                    this.ballXPos = centerX+(rings[0].radius-3.1-this.ballSize)*cos;
                    this.ballYPos = centerY+(rings[0].radius-3.1-this.ballSize)*sin;
                }
                refillBalls();
            }
        }
    }

    ballMove()
    {
        this.ballXPos+=this.ballXVel/subSteps;
        this.ballYPos+=this.ballYVel/subSteps;
    }
}

function refillBalls()
{
    //Create Balls
    for(let i = ballArray.length; i < ballCount; i++)
    {
        ballArray.push(new Ball());
    }
}

function refillRings()
{
    //Create Rings
    for(let i=rings.length;i<30;i++)
    {
        if(rings.length==0)
        {
            rings.push(new Ring(Math.random()*Math.PI*2, 300));
        }
        else
        {
            rings.push(new Ring(rings.at(i-1).offSet+(Math.PI/3.0), rings.at(i-1).radius+25));
        }
    }
}

function reset()
{
    rings = new Array();
    decayingRings = new Array();
    ballArray = new Array();
    bakedPositions = new Array();
    bakedRings = new Array();
    currentFrame=0;
}

function bake()
{
    currentFrame=0;
    reset();
    checkUserParameters()
    //Bake Out All Frames
    for(let f=0;f<totalFrameCount;f++)
    {
        refillRings();
        refillBalls();
        console.log(f);

        //RINGS
        bakedRings.push(new Array());
        //Ring Movement
        for(let i=0;i<rings.length;i++)
        {
            rings[i].moveRotatingCircle();
            bakedRings[f].push(new Array(rings[i].offSet, rings[i].radius, rings[i].r, rings[i].g, rings[i].b, rings[i].a));
        }
        for(let i=0;i<decayingRings.length;i++)
        {
            bakedRings[f].push(new Array(decayingRings[i].offSet, decayingRings[i].radius, decayingRings[i].r, decayingRings[i].g, decayingRings[i].b, decayingRings[i].a));
            decayingRings[i].moveRotatingCircle();
        }

        //BALL
        bakedPositions.push(new Array());
        //Ball Physics
        for(let i=0; i<subSteps; i++)
        {
            for(let i=0; i<ballArray.length; i++)
            {
                ballArray[i].ballPhysics();
                ballArray[i].ballMove();
            }
        }
        //Assign Ball Positions
        for(let i = 0; i < ballArray.length; i++)
        {
            bakedPositions[f].push(new Array(ballArray[i].ballXPos,ballArray[i].ballYPos,ballArray[i].r,ballArray[i].g,ballArray[i].b));
        }
    }

}

function checkUserParameters()
{
    const input = document.getElementById("totalFrames").value;
    const parsedInput = parseInt(input);
    totalFrameCount = parsedInput;

    const subStepsInput = document.getElementById("subSteps").value;
    const parsedSubSteps = parseInt(subStepsInput);
    subSteps = parsedSubSteps;

    const ballCountInput = document.getElementById("ballCount").value;
    const parsedBallCount = parseInt(ballCountInput);
    ballCount = parsedBallCount;

    const ballSizeInput = document.getElementById("ballSize").value;
    const parsedBallSize = parseFloat(ballSizeInput);
    ballSize = parsedBallSize;

    const gravityInput = document.getElementById("gravity").value;
    const parsedGravity = parseFloat(gravityInput);
    gravity = parsedGravity;

    const wallRestitutionInput = document.getElementById("wallRestitution").value;
    const parsedWallRestitution = parseFloat(wallRestitutionInput);
    wallRestitution = parsedWallRestitution;

    const ballRestitutionInput = document.getElementById("ballRestitution").value;
    const parsedBallRestitution = parseFloat(ballRestitutionInput);
    ballRestitution = parsedBallRestitution;
}

function save()
{
    const data = {
        bakedPositions: bakedPositions,
        bakedRings: bakedRings,
        totalFrameCount: totalFrameCount,
        ballCount: ballCount,
        ballSize: ballSize,
        gravity: gravity,
        wallRestitution: wallRestitution,
        ballRestitution: ballRestitution
    };
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baked_video.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function load()
{
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const jsonData = e.target.result;
            const data = JSON.parse(jsonData);


            totalFrameCount = data.totalFrameCount;
            ballCount = data.ballCount;
            ballSize = data.ballSize;
            gravity = data.gravity;
            wallRestitution = data.wallRestitution;
            ballRestitution = data.ballRestitution;
            currentFrame = 0;

            reset();
            refillRings();
            refillBalls();

            //Ball Loading
            for(let i=0;i<data.bakedPositions.length;i++)
            {
                bakedPositions.push(new Array());
                for(let j=0;j<data.bakedPositions[i].length;j++)                
                {
                    bakedPositions[i].push(new Array(data.bakedPositions[i][j][0], data.bakedPositions[i][j][1], data.bakedPositions[i][j][2], data.bakedPositions[i][j][3], data.bakedPositions[i][j][4]));
                }
            }
            
            //Ring Loading
            for(let i=0;i<data.bakedRings.length;i++)
            {
                bakedRings.push(new Array());
                for(let j=0;j<data.bakedRings[i].length;j++)                
                {
                    bakedRings[i].push(new Array(data.bakedRings[i][j][0], data.bakedRings[i][j][1], data.bakedRings[i][j][2], data.bakedRings[i][j][3], data.bakedRings[i][j][4], data.bakedRings[i][j][5]));
                }
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function animate()
{ 
    if(currentFrame>=totalFrameCount)
    {
        currentFrame=0;
    }
    //Draw Background Circle
    ctx.beginPath();
    ctx.arc(centerX,centerY, 3000, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${63}, ${255}, ${245},${.4})`;
    ctx.fill();
    ctx.closePath();

    //Draw Rings
    for(let i=0;i<bakedRings[currentFrame].length;i++)
    {
        r = new Ring(0,0);
        r.offSet=bakedRings[currentFrame][i][0];
        r.radius=bakedRings[currentFrame][i][1];
        r.r=bakedRings[currentFrame][i][2];
        r.g=bakedRings[currentFrame][i][3];
        r.b=bakedRings[currentFrame][i][4];
        r.a=bakedRings[currentFrame][i][5];
        r.drawRotatingCircle();
    }

    //Draw Gravity Effectors
    for(let i=0;i<GravityEffectors.length;i++)
    {
        GravityEffectors[i].drawGravityEffectorCircle();
    }

    //Draw Balls
    for(let i = 0; i < ballArray.length; i++)
    {  
        let X = bakedPositions[currentFrame][i][0];
        let Y = bakedPositions[currentFrame][i][1];
        let R = bakedPositions[currentFrame][i][2];
        let G = bakedPositions[currentFrame][i][3];
        let B = bakedPositions[currentFrame][i][4];
        ballArray[i].ballXPos=X;
        ballArray[i].ballYPos=Y;
        ballArray[i].r=R;
        ballArray[i].g=G;
        ballArray[i].b=B;
        ballArray[i].drawBall();
    }

    console.log(currentFrame);

    //Update Frame
    currentFrame++;
    requestAnimationFrame(animate);
}
GravityEffectors.push(new GravityEffectorCircle(30));
bake();
requestAnimationFrame(animate);