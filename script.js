// ==============================
// GEOMETRY ENGINE PRO - FINAL ENGINE
// ==============================

// CONFIG
const CONFIG = {
    WIDTH: 854,
    HEIGHT: 480,
    TARGET_FPS: 60,
    GRAVITY: 2000,
    PLAYER_SPEED: 400,
    SPEED_MULTIPLIERS: [0.8, 1, 1.3, 1.6],
    GROUND_Y: 380,
    CEILING_Y: 100
};

// CANVAS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");

let attempt = 1;
let progress = 0;

startBtn.onclick = () => {
    menu.classList.add("hidden");
    canvas.classList.remove("hidden");
    Engine.start();
};

// INPUT
const Input = {
    keys: {},
    init() {
        window.addEventListener("keydown", e => this.keys[e.code] = true);
        window.addEventListener("keyup", e => this.keys[e.code] = false);
    },
    pressed(code) { return !!this.keys[code]; }
};
Input.init();

// COLLISION
function intersects(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// PARTICLES
class Particle {
    constructor(x,y,color="white") {
        this.x=x; this.y=y;
        this.dx=(Math.random()-0.5)*400;
        this.dy=(Math.random()-0.5)*400;
        this.life=1; this.color=color;
    }
    update(dt){ this.life-=dt; this.x+=this.dx*dt; this.y+=this.dy*dt; }
    draw(){
        ctx.globalAlpha=this.life;
        ctx.fillStyle=this.color;
        ctx.fillRect(this.x,this.y,4,4);
        ctx.globalAlpha=1;
    }
}

// PLAYER
class Player {
    constructor(offsetY=0) { this.offsetY = offsetY; this.reset(); }
    reset() {
        this.x=150; this.y=CONFIG.GROUND_Y-this.offsetY;
        this.width=40; this.height=40;
        this.velocityY=0; this.gravityDir=1;
        this.mode="cube"; this.speedIndex=1;
        this.mini=false; this.portalCooldown=0;
        this.alive=true;
    }
    update(dt){
        if(!this.alive) return;
        if(this.portalCooldown>0) this.portalCooldown-=dt;
        const gravity = CONFIG.GRAVITY*this.gravityDir;

        switch(this.mode){
            case "cube": if(Input.pressed("Space")&&this.onGround()) this.velocityY=-750*this.gravityDir;
                         this.velocityY+=gravity*dt; this.y+=this.velocityY*dt; break;
            case "ship": this.velocityY+=(Input.pressed("Space")?-2000:2000)*dt; this.y+=this.velocityY*dt; break;
            case "ball": if(Input.pressed("Space")&&this.onGround()) this.gravityDir*=-1;
                         this.velocityY+=gravity*dt; this.y+=this.velocityY*dt; break;
            case "ufo": if(Input.pressed("Space")) this.velocityY=-600*this.gravityDir;
                        this.velocityY+=gravity*dt; this.y+=this.velocityY*dt; break;
            case "wave": this.y+=(Input.pressed("Space")?-600:600)*dt; break;
            case "robot": if(Input.pressed("Space")&&this.onGround()) this.velocityY=-950*this.gravityDir;
                          this.velocityY+=gravity*dt; this.y+=this.velocityY*dt; break;
            case "spider": if(Input.pressed("Space")&&this.portalCooldown<=0){this.gravityDir*=-1;
                         this.y=this.gravityDir>0?CONFIG.GROUND_Y:CONFIG.CEILING_Y; this.portalCooldown=0.2;} break;
        }

        if(this.y>CONFIG.GROUND_Y-this.offsetY){this.y=CONFIG.GROUND_Y-this.offsetY; this.velocityY=0;}
        if(this.y<CONFIG.CEILING_Y-this.offsetY){this.y=CONFIG.CEILING_Y-this.offsetY; this.velocityY=0;}
    }
    onGround(){ return this.gravityDir>0?this.y>=CONFIG.GROUND_Y-this.offsetY:this.y<=CONFIG.CEILING_Y-this.offsetY; }
    draw(){
        if(!this.alive) return;
        ctx.fillStyle={cube:"cyan",ship:"red",ball:"yellow",ufo:"magenta",wave:"lime",robot:"orange",spider:"purple"}[this.mode];
        ctx.fillRect(this.x,this.y,this.mini?25:this.width,this.mini?25:this.height);
    }
}

// GAME OBJECT
class GameObject {
    constructor(x,y,type,data=null){
        this.x=x; this.y=y; this.width=40; this.height=40;
        this.type=type; this.data=data; this.active=true;
    }
    update(dt,speed){ this.x-=speed*dt; }
    draw(){
        if(!this.active||this.x<-50||this.x>CONFIG.WIDTH+50) return;
        switch(this.type){
            case "block": ctx.fillStyle="white"; ctx.fillRect(this.x,this.y,this.width,this.height); break;
            case "spike": ctx.fillStyle="red"; ctx.beginPath();
                          ctx.moveTo(this.x,this.y+40); ctx.lineTo(this.x+20,this.y); ctx.lineTo(this.x+40,this.y+40); ctx.fill(); break;
            case "orb": ctx.fillStyle="yellow"; ctx.beginPath(); ctx.arc(this.x+20,this.y+20,15,0,Math.PI*2); ctx.fill(); break;
        }
    }
}

// ENGINE
const Engine = {
    accumulator:0, lastTime:0, timestep:1/CONFIG.TARGET_FPS,
    player1:new Player(0), player2:new Player(200), dual:false,
    objects:[], particles:[], levelLength:5000, cameraX:0, shake:0,

    start(){ this.generateLevel(); this.lastTime=performance.now(); requestAnimationFrame(this.loop.bind(this)); },

    generateLevel(){
        this.objects=[];
        for(let i=600;i<4500;i+=300) this.objects.push(new GameObject(i,CONFIG.GROUND_Y,"spike"));
        this.objects.push(new GameObject(1500,300,"orb"));
        this.objects.push(new GameObject(2500,350,"block"));
        this.objects.push(new GameObject(3500,200,"orb"));
        this.objects.push(new GameObject(4000,300,"block"));
    },

    death(player){
        player.alive=false;
        for(let i=0;i<30;i++) this.particles.push(new Particle(player.x,player.y,player.mode==="cube"?"cyan":"white"));
        this.shake=0.3;
        setTimeout(()=>{ attempt++; this.reset(); },800);
    },

    reset(){
        this.player1.reset(); this.player2.reset(); this.particles=[];
    },

    loop(time){
        let delta=(time-this.lastTime)/1000;
        this.lastTime=time; this.accumulator+=delta;
        while(this.accumulator>=this.timestep){ this.update(this.timestep); this.accumulator-=this.timestep; }
        this.render(); requestAnimationFrame(this.loop.bind(this));
    },

    update(dt){
        const speed=CONFIG.PLAYER_SPEED*CONFIG.SPEED_MULTIPLIERS[this.player1.speedIndex];
        this.player1.update(dt); if(this.dual) this.player2.update(dt);

        this.objects.forEach(obj=>{
            obj.update(dt,speed);
            if(intersects(this.player1,obj)){
                if(obj.type==="spike") this.death(this.player1);
                if(obj.type==="orb") this.player1.velocityY=-900;
            }
            if(this.dual&&intersects(this.player2,obj)){ if(obj.type==="spike") this.death(this.player2); }
        });

        this.particles=this.particles.filter(p=>p.life>0); this.particles.forEach(p=>p.update(dt));
        progress=Math.min(100,((this.levelLength-(this.objects[0]?.x||0))/this.levelLength)*100);
        if(this.shake>0) this.shake-=dt;
    },

    render(){
        ctx.clearRect(0,0,CONFIG.WIDTH,CONFIG.HEIGHT);
        if(this.shake>0){ ctx.save(); ctx.translate((Math.random()-0.5)*10,(Math.random()-0.5)*10); }

        ctx.fillStyle=`hsl(${progress*3},100%,20%)`; ctx.fillRect(0,0,CONFIG.WIDTH,CONFIG.HEIGHT);
        this.player1.draw(); if(this.dual)this.player2.draw();
        this.objects.forEach(o=>o.draw()); this.particles.forEach(p=>p.draw());

        if(this.shake>0) ctx.restore();

        // UI
        ctx.fillStyle="white"; ctx.font="20px Arial"; ctx.fillText(`Attempt: ${attempt}`,20,30);
        ctx.fillStyle="#333"; ctx.fillRect(200,20,400,10);
        ctx.fillStyle="lime"; ctx.fillRect(200,20,4*progress,10);
    }
};
