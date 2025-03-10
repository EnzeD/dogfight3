const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a canvas for the ad
const width = 800;
const height = 400;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill the background with black
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, width, height);

// Add the "Your Ad Here" text
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 120px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Your Ad', width / 2, height / 2 - 60);
ctx.fillText('Here', width / 2, height / 2 + 60);

// Save the canvas as a PNG file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'your_ad_here.png'), buffer);

console.log('Generated your_ad_here.png'); 