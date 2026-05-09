const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gamebar = document.getElementById('gamebar');
const statusMessage = document.getElementById('statusMessage');

const TILE_W = 58;
const TILE_H = 30;
const BLOCK_H = 32;
const WORLD_W = 15;
const WORLD_D = 10;
const WATER_ID = 5;

const blocks = [
  { id: 1, name: 'Grass', color: '#42c66b', side: '#2d9b52' },
  { id: 2, name: 'Dirt', color: '#8b5a2b', side: '#6f421f' },
  { id: 3, name: 'Stone', color: '#7c8795', side: '#5d6672' },
  { id: 4, name: 'Wood', color: '#b77934', side: '#8f5728' },
  { id: 5, name: 'Water', color: '#38bdf8', side: '#0ea5e9' },
  { id: 6, name: 'Coral', color: '#fb7185', side: '#e85d71' },
  { id: 8, name: 'Glass', color: '#bfdbfe', side: '#93c5fd' },
  { id: 13, name: 'Chest', color: '#a35a16', side: '#78350f' },
  { id: 14, name: 'Tree', color: '#16803c', side: '#11652f' },
  { id: 16, name: 'Lily', color: '#facc15', side: '#d8a600' },
  { id: 22, name: 'Bush', color: '#16a34a', side: '#15803d' },
  { id: 23, name: 'Flower', color: '#f97316', side: '#ea580c' },
];

let selectedBlock = blocks[0];
let hoverCell = null;
let cameraX = 0;
let cameraY = 0;

const world = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 16, 5, 16, 5, 16, 5, 0, 0, 0, 0, 0],
  [0, 14, 0, 22, 0, 5, 0, 5, 0, 23, 0, 14, 0, 22, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 3, 3, 2, 2, 2, 3, 3, 2, 2, 2, 3, 3, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

const fish = [
  { col: 3.3, row: 2.5, dir: 1, color: '#f97316' },
  { col: 4.4, row: 3.4, dir: 1, color: '#0ea5e9' },
  { col: 6.2, row: 2.8, dir: -1, color: '#e879f9' },
  { col: 8.1, row: 3.8, dir: -1, color: '#facc15' },
];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cameraX = canvas.width / 2;
  cameraY = Math.max(150, canvas.height * 0.28);
}

function getBlock(id) {
  return blocks.find((block) => block.id === id);
}

function iso(col, row) {
  return {
    x: cameraX + (col - row) * (TILE_W / 2),
    y: cameraY + (col + row) * (TILE_H / 2),
  };
}

function drawDiamond(x, y, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBlock(col, row, block) {
  const p = iso(col, row);
  const topY = p.y - BLOCK_H;

  ctx.beginPath();
  ctx.moveTo(p.x - TILE_W / 2, topY);
  ctx.lineTo(p.x, topY + TILE_H / 2);
  ctx.lineTo(p.x, p.y + TILE_H / 2);
  ctx.lineTo(p.x - TILE_W / 2, p.y);
  ctx.closePath();
  ctx.fillStyle = block.side;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(p.x + TILE_W / 2, topY);
  ctx.lineTo(p.x, topY + TILE_H / 2);
  ctx.lineTo(p.x, p.y + TILE_H / 2);
  ctx.lineTo(p.x + TILE_W / 2, p.y);
  ctx.closePath();
  ctx.fillStyle = shade(block.side, -14);
  ctx.fill();

  drawDiamond(p.x, topY, block.color);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (block.id === WATER_ID) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(p.x - 18, topY - 2, 18, 3);
  }
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawFish(item) {
  const p = iso(item.col, item.row);
  const y = p.y - BLOCK_H - 5;

  ctx.save();
  ctx.translate(p.x, y);
  ctx.scale(item.dir, 1);
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-20, -8);
  ctx.lineTo(-20, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHover() {
  if (!hoverCell) return;
  const p = iso(hoverCell.col, hoverCell.row);
  drawDiamond(p.x, p.y - BLOCK_H - 2, 'rgba(251, 191, 36, 0.35)');
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#9bd4ff');
  sky.addColorStop(1, '#d7f0ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < WORLD_D; row += 1) {
    for (let col = 0; col < WORLD_W; col += 1) {
      const block = getBlock(world[row][col]);
      if (block) drawBlock(col, row, block);
    }
  }

  fish.forEach(drawFish);
  drawHover();
}

function waterCells() {
  const cells = [];
  for (let row = 0; row < WORLD_D; row += 1) {
    for (let col = 0; col < WORLD_W; col += 1) {
      if (world[row][col] === WATER_ID) cells.push({ col, row });
    }
  }
  return cells;
}

function updateFish() {
  const cells = waterCells();
  fish.forEach((item) => {
    item.col += item.dir * 0.015;
    const nearest = cells.find((cell) => Math.abs(cell.col - Math.round(item.col)) <= 0 && cell.row === Math.round(item.row));
    if (!nearest) {
      item.dir *= -1;
      item.col += item.dir * 0.08;
      const fallback = cells[Math.floor(Math.random() * cells.length)];
      item.row = fallback.row + 0.5;
    }
  });
}

function buildGamebar() {
  gamebar.innerHTML = '';
  blocks.forEach((block) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = block.id === selectedBlock.id ? 'selected' : '';
    button.innerHTML = `<span class="swatch" style="background:${block.color}"></span><span>${block.name}</span>`;
    button.addEventListener('click', () => {
      selectedBlock = block;
      buildGamebar();
      updateStatus();
    });
    gamebar.appendChild(button);
  });
}

function screenToCell(x, y) {
  const relX = x - cameraX;
  const relY = y - cameraY + BLOCK_H;
  const col = Math.floor((relY / (TILE_H / 2) + relX / (TILE_W / 2)) / 2);
  const row = Math.floor((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2);
  if (col < 0 || col >= WORLD_W || row < 0 || row >= WORLD_D) return null;
  return { col, row };
}

function updateStatus() {
  statusMessage.textContent = `Selected: ${selectedBlock.name} | Fish stay in the river`;
}

function loop() {
  updateFish();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', (event) => {
  hoverCell = screenToCell(event.clientX, event.clientY);
});

canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
});

canvas.addEventListener('click', (event) => {
  const cell = screenToCell(event.clientX, event.clientY);
  if (!cell) return;
  world[cell.row][cell.col] = event.shiftKey ? 0 : selectedBlock.id;
  updateStatus();
});

window.addEventListener('resize', resize);

resize();
buildGamebar();
updateStatus();
loop();
