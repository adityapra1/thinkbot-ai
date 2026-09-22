import React, { useEffect, useRef, useState } from 'react';

const DinoGame = () => {
  const canvasRef = useRef(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let frames = 0;
    let currentScore = 0;
    const keys = {};

    // 1. Load the new Sprite Sheet
    const dragonImg = new Image();
    dragonImg.src = '/dragon-sprite.png'; // Make sure the image is in the public folder

    // 2. Dragon Object with Sprite Animation Logic
    const dino = {
      x: 50,
      y: 130,
      width: 90,   // Canvas display width
      height: 70,  // Canvas display height
      speed: 5,
      frameX: 0,   // Current frame index (0, 1, or 2)
      maxFrames: 3, // Total frames in your image
      
      draw: function () {
        if (dragonImg.complete && dragonImg.width > 0) {
          // Calculate the width of a single frame based on the total image width
          const spriteWidth = dragonImg.width / this.maxFrames;
          const spriteHeight = dragonImg.height;

          // HTML5 Canvas drawImage for Sprite Sheets:
          // ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight)
          ctx.drawImage(
            dragonImg, 
            this.frameX * spriteWidth, 0, // Crop starting point (X, Y)
            spriteWidth, spriteHeight,    // Crop size
            this.x, this.y,               // Destination on canvas
            this.width, this.height       // Size on canvas
          );

          // Flapping Animation Logic: Change frame every 8 game frames
          if (frames % 8 === 0) {
            this.frameX = (this.frameX + 1) % this.maxFrames; // Cycles through 0, 1, 2
          }
        } else {
          // Fallback box if image is not loaded yet
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(this.x, this.y, this.width, this.height);
        }
      },
      update: function () {
        // Smooth Up & Down movement
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;

        // Canvas boundary collision
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;

        this.draw();
      }
    };

    // Arrays for Game Entities
    const obstacles = [];
    const fireballs = [];

    // Fireball Class
    class Fireball {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 8;
        this.markedForDeletion = false;
      }
      draw() {
        ctx.font = '20px Arial';
        ctx.fillText('🔥', this.x, this.y + this.height);
      }
      update() {
        this.x += this.speed;
        if (this.x > canvas.width) this.markedForDeletion = true;
        this.draw();
      }
    }

    // Obstacle Class
    class Obstacle {
      constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - 40);
        this.width = 30;
        this.height = 30;
        this.speed = 5;
        this.markedForDeletion = false;
      }
      draw() {
        ctx.font = '30px Arial';
        ctx.fillText('🪨', this.x, this.y + this.height);
      }
      update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.markedForDeletion = true;
        this.draw();
      }
    }

    // Keydown Listeners
    const handleKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === 'Enter' && !isGameOver) {
        // Spawn fireball near the dragon's mouth
        fireballs.push(new Fireball(dino.x + dino.width - 20, dino.y + dino.height / 2 - 10)); 
      }
      if (e.code === 'KeyR' && isGameOver) {
        window.location.reload(); 
      }
    };

    const handleKeyUp = (e) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Collision Logic
    const checkCollision = (rect1, rect2) => {
      return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
      );
    };

    // Main Game Loop
    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      dino.update();

      // Manage Fireballs
      fireballs.forEach((fire, fIndex) => {
        fire.update();
        if (fire.markedForDeletion) fireballs.splice(fIndex, 1);
      });

      // Manage Obstacles
      if (frames % 70 === 0) {
        obstacles.push(new Obstacle());
      }

      obstacles.forEach((obs, oIndex) => {
        obs.update();

        // Game Over Collision
        if (checkCollision(dino, obs)) {
          setIsGameOver(true);
          cancelAnimationFrame(animationFrameId);
          return;
        }

        // Fireball hits Obstacle Collision
        fireballs.forEach((fire, fIndex) => {
          if (checkCollision(fire, obs)) {
            obs.markedForDeletion = true;
            fire.markedForDeletion = true;
            currentScore += 10;
            setScore(currentScore);
          }
        });

        if (obs.markedForDeletion) obstacles.splice(oIndex, 1);
      });

      frames++;
      
      if (!isGameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };

    gameLoop();

    // Cleanup memory
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isGameOver]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-gray-200 font-sans p-4 overflow-hidden">
      
      <div className="flex flex-col items-center text-center mb-6 z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2 tracking-wide drop-shadow-lg">
          Oops! Connection Lost
        </h1>
        <p className="text-sm md:text-base text-indigo-200 mb-4 opacity-90">
          Our AI is offline. Defend the server with your Dragon!
        </p>
        
        <div className="flex gap-4 md:gap-6 text-[10px] md:text-xs text-cyan-200 uppercase tracking-wider font-bold bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-lg">
          <span>[ W / Up ] = Move Up</span>
          <span>[ S / Down ] = Move Down</span>
          <span>[ Enter ] = Shoot</span>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center">
        <div className="text-xl font-bold text-cyan-300 mb-2 tracking-widest">
          SCORE: {score}
        </div>
        
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="border border-white/10 bg-black/40 rounded-xl shadow-2xl backdrop-blur-md max-w-full"
        />

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl backdrop-blur-sm z-20">
            <h2 className="text-4xl font-bold text-red-500 mb-4 drop-shadow-lg">GAME OVER</h2>
            <p className="text-white text-lg">Final Score: {score}</p>
            <p className="text-cyan-400 mt-4 text-sm animate-pulse font-bold tracking-widest">PRESS 'R' TO RESTART</p>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default DinoGame;