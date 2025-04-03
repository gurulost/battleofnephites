import fs from 'fs';
import { createCanvas } from 'canvas';

// Helper function to create a colorful frame
function drawFrame(ctx, x, y, width, height, color, text) {
  // Draw colored background
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  
  // Draw border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Draw text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

// Function to create a spritesheet
function createSpritesheet(unitType, frameWidth, frameHeight, rows, cols, outputPath) {
  const width = frameWidth * cols;
  const height = frameHeight * rows;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  // Color maps for different unit types
  const colorMap = {
    'worker': {
      idle: '#5D87FF',  // Blue
      move: '#5DFF87',  // Green
      attack: '#FF5D87', // Red
      gather: '#FFAF5D'  // Orange
    },
    'melee': {
      idle: '#964B00',  // Brown
      move: '#FF6B00',  // Orange
      attack: '#FF0000'  // Red
    },
    'ranged': {
      idle: '#8A2BE2',  // Purple
      move: '#9ACD32',  // Yellow-green
      attack: '#FF4500'  // Orange-red
    }
  };
  
  // Animation sequences
  const animations = unitType === 'worker' 
    ? ['idle', 'move', 'attack', 'gather'] 
    : ['idle', 'move', 'attack'];
  
  // Draw frames for each animation
  animations.forEach((anim, row) => {
    for (let col = 0; col < 4; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;
      const color = colorMap[unitType][anim];
      const frameNumber = col + 1;
      const text = `${anim}_${frameNumber}`;
      
      drawFrame(ctx, x, y, frameWidth, frameHeight, color, text);
    }
  });
  
  // Write to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created spritesheet: ${outputPath}`);
}

// Ensure the directory exists
const spritesheetDir = './client/public/assets/images/units/spritesheets';
if (!fs.existsSync(spritesheetDir)) {
  fs.mkdirSync(spritesheetDir, { recursive: true });
}

// Create spritesheets for Nephite units
createSpritesheet('worker', 64, 64, 4, 4, `${spritesheetDir}/nephite-worker.png`);
createSpritesheet('melee', 64, 64, 3, 4, `${spritesheetDir}/nephite-melee.png`);
createSpritesheet('ranged', 64, 64, 3, 4, `${spritesheetDir}/nephite-ranged.png`);

console.log('All spritesheets created successfully!');