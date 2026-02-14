// ==============================
// GEOMETRY ENGINE PRO - PHASE 6 MULTI-LEVEL
// ==============================

// CONFIG
const CONFIG = {
    WIDTH:854, HEIGHT:480,
    TARGET_FPS:60,
    GRAVITY:2000,
    PLAYER_SPEED:300,
    SPEED_MULTIPLIERS:[1,1.2,1.5,2],
    GROUND_Y:380,
    CEILING_Y:100
};

// CANVAS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");

let globalAttempt = 1;
let progress = 0;

// START BUTTON
startBtn.onclick = ()=>{ menu.classList.add("hidden"); canvas.classList.remove("hidden"); Engine.start(); };

// INPUT
const Input={keys:{},init(){window.addEventListener("keydown",e=>this.keys[e.code]=true);
window.addEventListener("keyup",e=>this.keys[e.code]=false);}, pressed(code){return!!this.keys[code];}};
Input.init();

// COLLISION
function intersects(a,b){return a.x<a.width+b.x && a.x+a.width>b.x && a.y<a.height+b.y && a.y+a.height>b.y;}

// PARTICLES
class Particle{constructor(x,y,color="white"){this.x=x;this.y=y;this.dx=(Math.random()-0.5)*400;this.dy=(Math.random()-0.5)*400;this.life=1;this.color=color;}
update(dt){this.life-=dt;this.x+=this.dx*dt;this.y+=this.dy*dt;}
draw(){ctx.globalAlpha=this.life;ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,4,4);ctx.globalAlpha=1;}}

// PLAYER
class Player{constructor(offsetY=0){this.offsetY=offsetY;this.reset();}
reset(){this.x=150;this.y=CONFIG.GROUND_Y-this.offsetY;this.width=40;this.height=40;this.velocityY=0;this.gravityDir=1;
this.mode="cube";this.speedIndex=1;this.mini=false;this.portalCooldown=0;this.alive=true;}
update(dt){
    if(!this.alive)return;
    if(this.portalCooldown>0)this.portalCooldown-=dt;
    const gravity=CONFIG.GRAVITY*this.gravityDir;
    switch(this.mode){
        case"cube":if(Input.pressed("Space")&&this.onGround())this.velocityY=-750*this.gravityDir;
        this.velocityY+=gravity*dt;this.y+=this.velocityY*dt;break;
        case"wave":this.y+=(Input.pressed("Space")?-600:600)*dt;break;}
    if(this.y>CONFIG.GROUND_Y-this.offsetY){this.y=CONFIG.GROUND_Y-this.offsetY;this.velocityY=0;}
    if(this.y<CONFIG.CEILING_Y-this.offsetY){this.y=CONFIG.CEILING_Y-this.offsetY;this.velocityY=0;}}
onGround(){return this.gravityDir>0?this.y>=CONFIG.GROUND_Y-this.offsetY:this.y<=CONFIG.CEILING_Y-this.offsetY;}
draw(){if(!this.alive)return;ctx.fillStyle="cyan";ctx.fillRect(this.x,this.y,this.mini?25:this.width,this.mini?25:this.height);}}

// GAME OBJECT
class GameObject{constructor(x,y,type,data=null){this.x=x;this.y=y;this.width=40;this.height=40;this.type=type;this.data=data;this.active=true;}
update(dt,speed){this.x-=speed*dt;}
draw(){if(!this.active||this.x<-50||this.x>CONFIG.WIDTH+50)return;
switch(this.type){case"block":ctx.fillStyle="white";ctx.fillRect(this.x,this.y,this.width,this.height);break;
case"spike":ctx.fillStyle="red";ctx.beginPath();ctx.moveTo(this.x,this.y+40);ctx.lineTo(this.x+20,this.y);ctx.lineTo(this.x+40,this.y+40);ctx.fill();break;
case"orb":ctx.fillStyle="yellow";ctx.beginPath();ctx.arc(this.x+20,this.y+20,15,0,Math.PI*2);ctx.fill();break;}}}

// LEVEL MANAGER
const Levels=[
    {name:"Easy",length:18000,themeH:0,objects:[],difficulty:1},
    {name:"Normal",length:22000,themeH:60,objects:[],difficulty:2},
    {name:"Hard",length:30000,themeH:120,objects:[],difficulty:3},
    {name:"Extreme",length:36000,themeH:180,objects:[],difficulty:4},
    {name:"Insane",length:42000,themeH:240,objects:[],difficulty:5}
];

function generateLevels(){
    Levels.forEach((level,index)=>{
        let spacing=400;
        let x=600;
        while(x<level.length){
            let y=CONFIG.GROUND_Y;
            let type="spike";
            if(Math.random()<0.2) {y=300; type="orb";}
            if(Math.random()<0.15) {y=350; type="block";}
            level.objects.push(new GameObject(x,y,type));
            x+=spacing - index*30; // harder levels = tighter spacing
        }
    });
}
generateLevels();

// ENGINE
const Engine={
    accumulator:0,lastTime:0,timestep:1/CONFIG.TARGET_FPS,
    currentLevel:0,
    player1:new Player(0),
    dual:false,
    objects:[],
    particles:[],
    shake:0,

    start(){this.loadLevel(this.currentLevel);this.lastTime=performance.now();requestAnimationFrame(this.loop.bind(this));},

    loadLevel(index){this.objects=Levels[index].objects.map(o=>Object.assign(Object.create(Object.getPrototypeOf(o)),o));},

    death(player){for(let i=0;i<3;i++){player.alive=false;globalAttempt++;for(let j=0;j<30;j++)this.particles.push(new Particle(player.x,player.y,"cyan"));}this.shake=0.3;setTimeout(()=>{this.reset();},800);},

    reset(){this.player1.reset();this.particles=[];this.loadLevel(this.currentLevel);},

    nextLevel(){this.currentLevel=(this.currentLevel+1)%Levels.length;this.reset();},

    loop(time){let delta=(time-this.lastTime)/1000;this.lastTime=time;this.accumulator+=delta;
        while(this.accumulator>=this.timestep){this.update(this.timestep);this.accumulator-=this.timestep;}
        this.render();requestAnimationFrame(this.loop.bind(this));},

    update(dt){
        const speed=CONFIG.PLAYER_SPEED*CONFIG.SPEED_MULTIPLIERS[this.player1.speedIndex];
        this.player1.update(dt);

        this.objects.forEach(obj=>{
            obj.update(dt,speed);
            if(intersects(this.player1,obj)){
                if(obj.type==="spike"||obj.type==="block") this.death(this.player1);
                if(obj.type==="orb") this.player1.velocityY=-900;
            }
        });

        this.particles=this.particles.filter(p=>p.life>0); this.particles.forEach(p=>p.update(dt));

        let levelLength=Levels[this.currentLevel].length;
        let firstObjX=this.objects[0]?.x||0;
        progress=Math.min(100, ((levelLength-firstObjX)/levelLength)*100);

        // Level end
        if(firstObjX<=-50) this.nextLevel();

        if(this.shake>0)this.shake-=dt;
    },

    render(){
        ctx.clearRect(0,0,CONFIG.WIDTH,CONFIG.HEIGHT);
        if(this.shake>0){ctx.save();ctx.translate((Math.random()-0.5)*10,(Math.random()-0.5)*10);}
        ctx.fillStyle=`hsl(${Levels[this.currentLevel].themeH},100%,20%)`;
        ctx.fillRect(0,0,CONFIG.WIDTH,CONFIG.HEIGHT);
        this.player1.draw();
        this.objects.forEach(o=>o.draw());
        this.particles.forEach(p=>p.draw());
        if(this.shake>0)ctx.restore();

        // UI
        ctx.fillStyle="white"; ctx.font="20px Arial";
        ctx.fillText(`Attempt: ${globalAttempt}`,20,30);
        ctx.fillRect(200,20,400,10);
        ctx.fillStyle="lime"; ctx.fillRect(200,20,4*progress,10);
        ctx.fillText(`Level: ${Levels[this.currentLevel].name}`,620,30);
    }
};// Add this to Input.init()
window.addEventListener("keydown", e=>{
    if(e.code === "Escape"){
        Engine.pause();
    }
});

// ENGINE MODIFICATION
const Engine = {
    accumulator:0,lastTime:0,timestep:1/CONFIG.TARGET_FPS,
    currentLevel:0,
    player1:new Player(0),
    dual:false,
    objects:[],
    particles:[],
    shake:0,
    running:false, // track if loop is running

    start(){
        this.running = true;
        this.loadLevel(this.currentLevel);
        this.lastTime=performance.now();
        requestAnimationFrame(this.loop.bind(this));
    },

    pause(){
        this.running=false;
        menu.classList.remove("hidden");
        canvas.classList.add("hidden");
        this.reset();
    },

    loop(time){
        if(!this.running) return; // stop the loop when paused
        let delta=(time-this.lastTime)/1000;
        this.lastTime=time;
        this.accumulator+=delta;
        while(this.accumulator>=this.timestep){
            this.update(this.timestep);
            this.accumulator-=this.timestep;
        }
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    },

    // ... rest of Engine stays the same (update(), render(), reset(), nextLevel(), death())
};
