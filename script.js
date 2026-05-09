const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gamebar = document.getElementById('gamebar');
const statusMessage = document.getElementById('statusMessage');

const TILE_W = 78;
const TILE_H = 40;
const BLOCK_H = 42;
const WORLD_W = 28;
const WORLD_D = 18;
const MAX_STACK = 8;
const WATER_ID = 5;
const DOOR_ID = 30;
const KEY_ID = 31;
const LOG_ID = 32;
const NIGHT_START = 0.62;
const NIGHT_END = 0.9;

const blocks = [
  { id: 1, name: 'Grass', color: '#4fba5f', side: '#337d43', grain: '#89d87a', rough: 18 },
  { id: 2, name: 'Dirt', color: '#8b5a2b', side: '#62411f', grain: '#c08a52', rough: 24 },
  { id: 3, name: 'Stone', color: '#8d98a5', side: '#68727e', grain: '#cbd2d9', rough: 16 },
  { id: 4, name: 'Plank', color: '#b87832', side: '#825120', grain: '#e4b46b', rough: 20 },
  { id: 5, name: 'Water', color: '#38bdf8', side: '#0ea5e9', grain: '#d9f8ff', rough: 7 },
  { id: 8, name: 'Glass', color: '#bfdbfe', side: '#7fb1de', grain: '#eff6ff', rough: 4 },
  { id: 13, name: 'Chest', color: '#a35a16', side: '#78350f', grain: '#f6bf68', rough: 14 },
  { id: 30, name: 'Door', color: '#a4632c', side: '#6f3b18', grain: '#e2a85e', rough: 18 },
  { id: 31, name: 'Key', color: '#facc15', side: '#d97706', grain: '#fff7ad', rough: 8 },
  { id: 32, name: 'Log', color: '#93622d', side: '#5f3d1d', grain: '#d9a25d', rough: 22 },
  { id: 14, name: 'Tree', color: '#16803c', side: '#0e5a2a', grain: '#5fd06d', rough: 18 },
  { id: 22, name: 'Bush', color: '#16a34a', side: '#15803d', grain: '#78d95d', rough: 16 },
  { id: 23, name: 'Flower', color: '#f97316', side: '#c2410c', grain: '#fde047', rough: 10 },
];

const placeableBlocks = blocks.filter((block) => ![KEY_ID].includes(block.id));
let selectedBlock = placeableBlocks[0];
let hoverCell = null;
let cameraX = 0;
let cameraY = 0;
let zoom = 1;
let isDragging = false;
let dragStart = null;
let dragCamera = null;
let timeOfDay = 0.28;
let lastFrame = performance.now();
let nightWasActive = false;
let statusNote = '';
let statusNoteUntil = 0;

const inventory = {
  logs: 10,
  keys: 3,
};

const world = createWorld();
const zombies = [];
const fish = [
  { col: 10.3, row: 5.5, dir: 1, color: '#f97316' },
  { col: 12.4, row: 6.4, dir: 1, color: '#0ea5e9' },
  { col: 14.2, row: 5.8, dir: -1, color: '#e879f9' },
  { col: 17.1, row: 6.8, dir: -1, color: '#facc15' },
];

function createWorld() {
  const cells = [];
  for (let row = 0; row < WORLD_D; row += 1) {
    const line = [];
    for (let col = 0; col < WORLD_W; col += 1) {
      const river = row >= 5 && row <= 7 && col >= 7 && col <= 20;
      const rock = (col + row * 2) % 11 === 0;
      const stack = [{ id: river ? WATER_ID : rock ? 3 : 1, locked: false }];

      if (!river && row > 9) stack.unshift({ id: 2, locked: false });
      if (!river && row > 13 && col % 4 === 0) stack.unshift({ id: 3, locked: false });
      if (!river && row < 5 && col % 6 === 1) stack.push({ id: 14, locked: false });
      if (!river && row < 8 && col % 7 === 4) stack.push({ id: 22, locked: false });
      if (!river && row === 8 && col % 5 === 0) stack.push({ id: 23, locked: false });
      if (!river && row === 10 && [10, 11, 12, 13].includes(col)) stack.push({ id: 4, locked: false });
      if (!river && row === 9 && col === 12) stack.push({ id: DOOR_ID, locked: true });
      if (!river && row === 12 && col === 7) stack.push({ id: KEY_ID, locked: false });
      if (!river && row === 13 && col === 18) stack.push({ id: LOG_ID, locked: false });

      line.push(stack);
    }
    cells.push(line);
  }
  return cells;
}

function resize() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  cameraX = window.innerWidth / 2;
  cameraY = Math.max(115, window.innerHeight * 0.16);
}

function getBlock(id) {
  return blocks.find((block) => block.id === id);
}

function iso(col, row, height = 0) {
  return {
    x: cameraX + (col - row) * (TILE_W / 2) * zoom,
    y: cameraY + (col + row) * (TILE_H / 2) * zoom - height * BLOCK_H * zoom,
  };
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawPolygon(points, fill, stroke = 'rgba(0,0,0,0.18)') {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, zoom);
  ctx.stroke();
}

function drawTexture(points, block, density, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = block.grain;
  ctx.lineWidth = Math.max(0.8, zoom);

  for (let i = 0; i < density; i += 1) {
    const seed = (i * 37 + block.id * 19) % 100;
    const x = points[0].x + ((seed / 100) * TILE_W - TILE_W / 2) * zoom;
    const y = points[0].y + (((i * 23) % 100) / 100) * TILE_H * zoom;
    ctx.beginPath();
    ctx.moveTo(x - 10 * zoom, y);
    ctx.lineTo(x + 16 * zoom, y + ((i % 3) - 1) * 2 * zoom);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiamond(x, y, block, isTop = false) {
  const halfW = (TILE_W / 2) * zoom;
  const halfH = (TILE_H / 2) * zoom;
  const points = [
    { x, y: y - halfH },
    { x: x + halfW, y },
    { x, y: y + halfH },
    { x: x - halfW, y },
  ];
  const gradient = ctx.createLinearGradient(x - halfW, y - halfH, x + halfW, y + halfH);
  gradient.addColorStop(0, shade(block.color, 28));
  gradient.addColorStop(0.48, block.color);
  gradient.addColorStop(1, shade(block.color, -22));
  drawPolygon(points, gradient);
  drawTexture(points, block, block.rough, isTop ? 0.42 : 0.24);
}

function drawBlock(col, row, level, block, cellItem) {
  const p = iso(col, row, level);
  const halfW = (TILE_W / 2) * zoom;
  const halfH = (TILE_H / 2) * zoom;
  const blockH = BLOCK_H * zoom;
  const topY = p.y - blockH;

  const left = [
    { x: p.x - halfW, y: topY },
    { x: p.x, y: topY + halfH },
    { x: p.x, y: p.y + halfH },
    { x: p.x - halfW, y: p.y },
  ];
  const right = [
    { x: p.x + halfW, y: topY },
    { x: p.x, y: topY + halfH },
    { x: p.x, y: p.y + halfH },
    { x: p.x + halfW, y: p.y },
  ];

  drawPolygon(left, shade(block.side, 6));
  drawTexture(left, block, Math.ceil(block.rough / 2), 0.22);
  drawPolygon(right, shade(block.side, -18));
  drawTexture(right, block, Math.ceil(block.rough / 2), 0.18);
  drawDiamond(p.x, topY, block, true);

  if (block.id === WATER_ID) drawWaterShine(p.x, topY);
  if (block.id === DOOR_ID) drawDoorDetails(p.x, topY, cellItem.locked);
  if (block.id === KEY_ID) drawKey(p.x, topY);
  if (block.id === LOG_ID) drawLogRings(p.x, topY);
}

function drawWaterShine(x, y) {
  ctx.strokeStyle = 'rgba(255,255,255,0.48)';
  ctx.lineWidth = Math.max(2, 2 * zoom);
  ctx.beginPath();
  ctx.moveTo(x - 22 * zoom, y - 2 * zoom);
  ctx.lineTo(x - 4 * zoom, y - 8 * zoom);
  ctx.moveTo(x + 8 * zoom, y + 5 * zoom);
  ctx.lineTo(x + 24 * zoom, y - 1 * zoom);
  ctx.stroke();
}

function drawDoorDetails(x, y, locked) {
  ctx.fillStyle = locked ? '#facc15' : '#e5e7eb';
  ctx.beginPath();
  ctx.arc(x + 12 * zoom, y + 12 * zoom, 4 * zoom, 0, Math.PI * 2);
  ctx.fill();
  if (locked) {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(2, 2 * zoom);
    ctx.strokeRect(x - 13 * zoom, y - 4 * zoom, 26 * zoom, 24 * zoom);
  }
}

function drawKey(x, y) {
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = Math.max(3, 3 * zoom);
  ctx.beginPath();
  ctx.arc(x - 8 * zoom, y - 1 * zoom, 7 * zoom, 0, Math.PI * 2);
  ctx.moveTo(x - 1 * zoom, y);
  ctx.lineTo(x + 18 * zoom, y + 8 * zoom);
  ctx.lineTo(x + 12 * zoom, y + 10 * zoom);
  ctx.moveTo(x + 12 * zoom, y + 5 * zoom);
  ctx.lineTo(x + 9 * zoom, y + 12 * zoom);
  ctx.stroke();
}

function drawLogRings(x, y) {
  ctx.strokeStyle = 'rgba(79, 43, 16, 0.7)';
  ctx.lineWidth = Math.max(1, zoom);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x, y, (8 + i * 5) * zoom, (3 + i * 2) * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHover() {
  if (!hoverCell) return;
  const stack = world[hoverCell.row][hoverCell.col];
  const p = iso(hoverCell.col, hoverCell.row, stack.length);
  const halfW = (TILE_W / 2) * zoom;
  const halfH = (TILE_H / 2) * zoom;
  drawPolygon([
    { x: p.x, y: p.y - halfH - 4 * zoom },
    { x: p.x + halfW, y: p.y - 4 * zoom },
    { x: p.x, y: p.y + halfH - 4 * zoom },
    { x: p.x - halfW, y: p.y - 4 * zoom },
  ], 'rgba(251, 191, 36, 0.34)', '#fbbf24');
}

function drawSky() {
  const isNight = isNightTime();
  const sky = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  sky.addColorStop(0, isNight ? '#080b18' : '#79c8ff');
  sky.addColorStop(0.55, isNight ? '#1a2140' : '#c7ecff');
  sky.addColorStop(1, isNight ? '#253044' : '#e8f8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const sunX = window.innerWidth * timeOfDay;
  const sunY = 80 + Math.sin(timeOfDay * Math.PI) * 85;
  ctx.fillStyle = isNight ? '#e5e7eb' : '#fde68a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, isNight ? 18 : 34, 0, Math.PI * 2);
  ctx.fill();

  if (isNight) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 48; i += 1) {
      ctx.fillRect((i * 83) % window.innerWidth, 24 + ((i * 47) % 190), 2, 2);
    }
  }
}

function drawFish(item) {
  const p = iso(item.col, item.row, 1);
  const y = p.y - 10 * zoom;
  ctx.save();
  ctx.translate(p.x, y);
  ctx.scale(item.dir * zoom, zoom);
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-21, -8);
  ctx.lineTo(-21, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawZombie(zombie) {
  const p = iso(zombie.col, zombie.row, stackHeightAt(zombie.col, zombie.row));
  const bob = Math.sin(performance.now() / 180 + zombie.col) * 3 * zoom;
  ctx.save();
  ctx.translate(p.x, p.y - 36 * zoom + bob);
  ctx.scale(zoom, zoom);
  ctx.fillStyle = '#5fa66a';
  ctx.fillRect(-10, -24, 20, 20);
  ctx.fillStyle = '#26331f';
  ctx.fillRect(-15, -4, 30, 28);
  ctx.fillStyle = '#151a14';
  ctx.fillRect(-6, -18, 4, 4);
  ctx.fillRect(5, -18, 4, 4);
  ctx.fillStyle = '#79c783';
  ctx.fillRect(-22, 2, 8, 20);
  ctx.fillRect(14, 2, 8, 20);
  ctx.restore();
}

function draw() {
  drawSky();

  for (let row = 0; row < WORLD_D; row += 1) {
    for (let col = 0; col < WORLD_W; col += 1) {
      const stack = world[row][col];
      stack.forEach((item, level) => {
        const block = getBlock(item.id);
        if (block) drawBlock(col, row, level, block, item);
      });
    }
  }

  fish.forEach(drawFish);
  zombies.forEach(drawZombie);
  drawHover();
}

function stackHeightAt(col, row) {
  const cell = world[Math.round(row)]?.[Math.round(col)];
  return cell ? cell.length : 1;
}

function waterCells() {
  const cells = [];
  for (let row = 0; row < WORLD_D; row += 1) {
    for (let col = 0; col < WORLD_W; col += 1) {
      if (world[row][col].some((item) => item.id === WATER_ID)) cells.push({ col, row });
    }
  }
  return cells;
}

function updateFish(delta) {
  const cells = waterCells();
  if (!cells.length) return;
  fish.forEach((item) => {
    item.col += item.dir * delta * 0.0014;
    const nearest = cells.find((cell) => cell.col === Math.round(item.col) && cell.row === Math.round(item.row));
    if (!nearest) {
      item.dir *= -1;
      item.col += item.dir * 0.18;
      const fallback = cells[Math.floor(Math.random() * cells.length)];
      item.row = fallback.row + 0.5;
    }
  });
}

function isNightTime() {
  return timeOfDay >= NIGHT_START && timeOfDay <= NIGHT_END;
}

function spawnZombies() {
  zombies.length = 0;
  const spawnPoints = [
    { col: 2, row: 2 },
    { col: 24, row: 3 },
    { col: 4, row: 15 },
    { col: 22, row: 14 },
    { col: 14, row: 16 },
  ];
  spawnPoints.forEach((point) => zombies.push({ ...point, targetCol: 12, targetRow: 10 }));
}

function updateZombies(delta) {
  const night = isNightTime();
  if (night && !nightWasActive) spawnZombies();
  if (!night) zombies.length = 0;
  nightWasActive = night;

  zombies.forEach((zombie) => {
    const speed = delta * 0.00042;
    const dx = zombie.targetCol - zombie.col;
    const dy = zombie.targetRow - zombie.row;
    const dist = Math.hypot(dx, dy) || 1;
    zombie.col += (dx / dist) * speed;
    zombie.row += (dy / dist) * speed;
    if (dist < 0.3) {
      zombie.targetCol = 3 + Math.random() * (WORLD_W - 6);
      zombie.targetRow = 3 + Math.random() * (WORLD_D - 6);
    }
  });
}

function buildGamebar() {
  gamebar.innerHTML = '';
  placeableBlocks.forEach((block) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = block.id === selectedBlock.id ? 'selected' : '';
    button.innerHTML = `<span class="swatch" style="background:linear-gradient(135deg, ${shade(block.color, 28)}, ${block.color} 52%, ${shade(block.side, -18)})"></span><span>${block.name}</span>`;
    button.addEventListener('click', () => {
      selectedBlock = block;
      buildGamebar();
      updateStatus();
    });
    gamebar.appendChild(button);
  });
}

function screenToCell(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (let row = 0; row < WORLD_D; row += 1) {
    for (let col = 0; col < WORLD_W; col += 1) {
      const p = iso(col, row, world[row][col].length);
      const distance = Math.abs(x - p.x) / ((TILE_W / 2) * zoom) + Math.abs(y - p.y) / ((TILE_H / 2) * zoom);
      if (distance < bestDistance && distance <= 1.25) {
        best = { col, row };
        bestDistance = distance;
      }
    }
  }
  return best;
}

function placeBlock(cell) {
  const stack = world[cell.row][cell.col];
  if (selectedBlock.id === DOOR_ID && inventory.logs <= 0) {
    setStatusNote('Need a log to build a door.');
    return;
  }
  if (selectedBlock.id === DOOR_ID && inventory.keys <= 0) {
    setStatusNote('Need a key to lock a new door.');
    return;
  }
  if (stack.length >= MAX_STACK) {
    setStatusNote('That tower is already as high as it can go.');
    return;
  }
  if (selectedBlock.id === DOOR_ID) {
    inventory.logs -= 1;
    inventory.keys -= 1;
  }
  stack.push({ id: selectedBlock.id, locked: selectedBlock.id === DOOR_ID });
  setStatusNote(selectedBlock.id === DOOR_ID ? 'Placed a locked door.' : 'Block stacked on the ground.');
}

function removeBlock(cell) {
  const stack = world[cell.row][cell.col];
  if (stack.length <= 1) return;
  const top = stack[stack.length - 1];
  if (top.id === DOOR_ID && top.locked) {
    if (inventory.keys <= 0) {
      setStatusNote('That door is locked. Pick up a key first.');
      return;
    }
    inventory.keys -= 1;
    top.locked = false;
    setStatusNote('Used a key to unlock the door.');
    return;
  }
  const removed = stack.pop();
  if (removed.id === KEY_ID) inventory.keys += 1;
  if (removed.id === LOG_ID || removed.id === DOOR_ID) inventory.logs += 1;
  setStatusNote('Removed top block.');
}

function collectFromCell(cell) {
  const stack = world[cell.row][cell.col];
  const top = stack[stack.length - 1];
  if (top.id === KEY_ID) {
    stack.pop();
    inventory.keys += 1;
    setStatusNote('Picked up a key.');
    return true;
  }
  if (top.id === LOG_ID) {
    stack.pop();
    inventory.logs += 1;
    setStatusNote('Picked up a log.');
    return true;
  }
  return false;
}

function setStatusNote(message) {
  statusNote = message;
  statusNoteUntil = performance.now() + 1800;
  updateStatus();
}

function updateStatus() {
  const phase = isNightTime() ? 'Night: zombies are out' : 'Day: build and gather';
  const prefix = performance.now() < statusNoteUntil ? `${statusNote} ` : '';
  statusMessage.textContent = `${prefix}Selected: ${selectedBlock.name} | Logs: ${inventory.logs} | Keys: ${inventory.keys} | ${phase}`;
}

function loop(now) {
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  timeOfDay = (timeOfDay + delta * 0.000018) % 1;
  updateFish(delta);
  updateZombies(delta);
  draw();
  updateStatus();
  requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', (event) => {
  isDragging = true;
  dragStart = { x: event.clientX, y: event.clientY };
  dragCamera = { x: cameraX, y: cameraY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  hoverCell = screenToCell(event.clientX, event.clientY);
  if (!isDragging || !dragStart) return;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) {
    cameraX = dragCamera.x + dx;
    cameraY = dragCamera.y + dy;
  }
});

canvas.addEventListener('pointerup', (event) => {
  const moved = dragStart && Math.abs(event.clientX - dragStart.x) + Math.abs(event.clientY - dragStart.y) > 8;
  isDragging = false;
  dragStart = null;
  dragCamera = null;
  if (moved) return;

  const cell = screenToCell(event.clientX, event.clientY);
  if (!cell) return;
  if (event.shiftKey) {
    removeBlock(cell);
    return;
  }
  if (collectFromCell(cell)) return;
  placeBlock(cell);
});

canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
  isDragging = false;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom = Math.max(0.62, Math.min(1.35, zoom - event.deltaY * 0.0007));
}, { passive: false });

window.addEventListener('resize', resize);

resize();
buildGamebar();
updateStatus();
requestAnimationFrame(loop);
