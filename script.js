const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusMessage = document.getElementById('statusMessage');
const inventoryContainer = document.getElementById('inventory');

const TILE_SIZE = 24;
const WORLD_WIDTH = 15;
const WORLD_HEIGHT = 10;
const GRAVITY = 0.7;
const JUMP_SPEED = -12.5;
const MOVE_SPEED = 3.2;
const CRAWL_SPEED = 1.6;
const DAY_SPEED = 0.0009;
const NIGHT_THRESHOLD = 0.72;

const blocks = [
  { id: 1, name: 'Grass', color: '#4ade80', highlight: '#22c55e' },
  { id: 2, name: 'Dirt', color: '#a16207', highlight: '#92400e' },
  { id: 3, name: 'Stone', color: '#64748b', highlight: '#475569' },
  { id: 4, name: 'Wood', color: '#c4843f', highlight: '#9a5b24' },
  { id: 5, name: 'Water', color: '#60a5fa', highlight: '#93c5fd' },
  { id: 6, name: 'Coral', color: '#f97316', highlight: '#ea580c' },
  { id: 7, name: 'Seaweed', color: '#22c55e', highlight: '#15803d' },
  { id: 8, name: 'Glass', color: 'rgba(190, 232, 255, 0.45)', highlight: '#bfdbfe' },
  { id: 9, name: 'Cake', color: '#fda4af', highlight: '#fb7185' },
  { id: 10, name: 'Soup', color: '#f59e0b', highlight: '#d97706' },
  { id: 11, name: 'Chips', color: '#fbbf24', highlight: '#f59e0b' },
  { id: 12, name: 'Laser', color: '#f87171', highlight: '#dc2626' },
  { id: 13, name: 'Chest', color: '#92400e', highlight: '#78350f' },
  { id: 14, name: 'Tree', color: '#166534', highlight: '#14532d' },
  { id: 15, name: 'Branch', color: '#92400e', highlight: '#78350f' },
  { id: 16, name: 'Lily', color: '#fbbf24', highlight: '#f59e0b' },
  { id: 17, name: 'Bucket', color: '#64748b', highlight: '#475569' },
  { id: 18, name: 'Television', color: '#1f2937', highlight: '#111827' },
  { id: 19, name: 'Computer', color: '#374151', highlight: '#1f2937' },
  { id: 20, name: 'Camera', color: '#6b7280', highlight: '#4b5563' },
  { id: 21, name: 'Pot', color: '#92400e', highlight: '#78350f' },
  { id: 22, name: 'Bush', color: '#16a34a', highlight: '#15803d' },
  { id: 23, name: 'Flower', color: '#f97316', highlight: '#ea580c' },
];

let selectedBlock = blocks[0];
let timeOfDay = 0.18;
const world = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 6, 6, 6, 6, 6, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 7, 5, 7, 5, 7, 5, 0, 0, 0, 0, 0],
  [0, 14, 0, 22, 0, 5, 0, 5, 0, 23, 0, 14, 0, 22, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

const player = {
  x: TILE_SIZE * 1,
  y: TILE_SIZE * 3,
  width: 24,
  height: 44,
  vx: 0,
  vy: 0,
  onGround: false,
  crawling: false,
};

const keys = {
  left: false,
  right: false,
  jump: false,
  crawl: false,
};

const entities = [
  { type: 'fish', x: 80, y: 115, vx: 0, dir: 1 },
  { type: 'fish', x: 140, y: 125, vx: 0, dir: -1 },
  { type: 'shark', x: 200, y: 130, vx: 0, dir: 1 },
  { type: 'cow', x: 60, y: 165, vx: 0, dir: 1 },
  { type: 'chicken', x: 120, y: 150, vx: 0, dir: 1 },
  { type: 'pig', x: 180, y: 160, vx: 0, dir: -1 },
  { type: 'bird', x: 100, y: 80, vx: 0, dir: 1 },
];

function buildInventory() {
  inventoryContainer.innerHTML = '';
  blocks.forEach((block) => {
    const button = document.createElement('button');
    button.textContent = block.name;
    button.dataset.blockId = block.id;
    button.classList.toggle('selected', selectedBlock.id === block.id);
    button.addEventListener('click', () => {
      selectedBlock = block;
      buildInventory();
    });
    inventoryContainer.appendChild(button);
  });
}

function isSolidTile(tile) {
  return tile > 0 && tile !== 5 && tile !== 7;
}

function getTile(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (col < 0 || col >= WORLD_WIDTH || row < 0 || row >= WORLD_HEIGHT) {
    return 0;
  }
  return world[row][col];
}

function collidesAt(x, y) {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + player.width - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + player.height - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (row < 0 || row >= WORLD_HEIGHT || col < 0 || col >= WORLD_WIDTH) {
        continue;
      }
      if (isSolidTile(world[row][col])) {
        return true;
      }
    }
  }
  return false;
}

function inWater() {
  const left = player.x + 4;
  const right = player.x + player.width - 4;
  const footY = player.y + player.height - 2;
  return getTile(left, footY) === 5 || getTile(right, footY) === 5;
}

function drawWorld() {
  const dayShade = 0.55 + 0.45 * Math.cos((timeOfDay - 0.25) * Math.PI * 2);
  const skyTop = `hsl(205, 100%, ${Math.max(18, 84 * dayShade)}%)`;
  const skyBottom = `hsl(205, 95%, ${Math.max(12, 62 * dayShade)}%)`;

  ctx.fillStyle = skyTop;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, skyTop);
  skyGradient.addColorStop(1, skyBottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const tile = world[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile === 0) {
        continue;
      }

      if (tile === 5) {
        const waterGradient = ctx.createLinearGradient(px, py, px, py + TILE_SIZE);
        waterGradient.addColorStop(0, '#93c5fd');
        waterGradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = waterGradient;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 10);
        ctx.quadraticCurveTo(px + 12, py + 8, px + 24, py + 12);
        ctx.stroke();
        continue;
      }

      if (tile === 6) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 6, py + 10, 24, 20);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(px + 10, py + 12, 6, 6);
        ctx.fillRect(px + 20, py + 16, 6, 6);
        continue;
      }

      if (tile === 7) {
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(px + 14, py + 4, 4, 24);
        ctx.fillRect(px + 10, py + 8, 4, 20);
        ctx.fillRect(px + 18, py + 10, 4, 18);
        continue;
      }

      if (tile === 8) {
        ctx.save();
        ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        ctx.rotate(-0.14);
        ctx.fillStyle = 'rgba(190, 232, 255, 0.45)';
        ctx.fillRect(-14, -16, 28, 32);
        ctx.strokeStyle = '#bfdbfe';
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -16, 28, 32);
        ctx.restore();
        continue;
      }

      if (tile === 9) {
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(px + 4, py + 8, 28, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 6, py + 12, 24, 6);
        ctx.fillStyle = '#db2777';
        ctx.fillRect(px + 8, py + 10, 4, 4);
        ctx.fillRect(px + 18, py + 10, 4, 4);
        continue;
      }

      if (tile === 10) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 4, py + 12, 28, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 8, py + 10, 20, 4);
        continue;
      }

      if (tile === 11) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(px + 4, py + 8, 28, 20);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 8, py + 12, 6, 6);
        ctx.fillRect(px + 20, py + 14, 6, 6);
        continue;
      }

      if (tile === 12) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px + 6, py + 6, 24, 24);
        ctx.fillStyle = '#faa2a2';
        ctx.fillRect(px + 8, py + 8, 8, 8);
        ctx.fillRect(px + 20, py + 8, 8, 8);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        ctx.lineTo(canvas.width, py + TILE_SIZE / 2);
        ctx.stroke();
        continue;
      }

      if (tile === 13) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 4, py + 8, 28, 24);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 6, py + 10, 24, 20);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(px + 12, py + 14, 12, 8);
        continue;
      }

      if (tile === 14) {
        ctx.fillStyle = '#166534';
        ctx.fillRect(px + 12, py + 4, 12, 28);
        ctx.fillStyle = '#14532d';
        ctx.fillRect(px + 8, py + 8, 20, 20);
        continue;
      }

      if (tile === 15) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 6, py + 14, 24, 8);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 8, py + 16, 20, 4);
        continue;
      }

      if (tile === 16) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(px + 18, py + 18, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 16, py + 12, 4, 8);
        continue;
      }

      if (tile === 17) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px + 8, py + 12, 20, 16);
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + 10, py + 14, 16, 12);
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(px + 12, py + 16, 12, 8);
        continue;
      }

      if (tile === 18) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px + 4, py + 8, 28, 20);
        ctx.fillStyle = '#111827';
        ctx.fillRect(px + 6, py + 10, 24, 16);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(px + 8, py + 12, 20, 12);
        continue;
      }

      if (tile === 19) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(px + 6, py + 10, 24, 18);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(px + 8, py + 12, 20, 14);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(px + 10, py + 14, 16, 8);
        continue;
      }

      if (tile === 20) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(px + 10, py + 8, 16, 20);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(px + 12, py + 10, 12, 16);
        ctx.fillStyle = '#000000';
        ctx.fillRect(px + 14, py + 12, 8, 8);
        continue;
      }

      if (tile === 21) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 12, py + 16, 12, 16);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 14, py + 18, 8, 12);
        continue;
      }

      if (tile === 22) {
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(px + 6, py + 12, 24, 16);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(px + 8, py + 14, 20, 12);
        continue;
      }

      if (tile === 23) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px + 16, py + 16, 4, 16);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(px + 18, py + 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(px + 14, py + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + 22, py + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const block = blocks.find((item) => item.id === tile);
      if (!block) {
        continue;
      }

      ctx.fillStyle = block.color;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = block.highlight;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.fillStyle = block.highlight;
      ctx.fillRect(px + 4, py + 4, 8, 8);
      ctx.fillRect(px + 18, py + 14, 8, 8);
    }
  }

  drawEntities();
}

function drawPlayer() {
  const drawX = player.x;
  const drawY = player.y;
  const width = player.width;
  const height = player.crawling ? player.height * 0.6 : player.height;

  const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + height);
  gradient.addColorStop(0, '#f1f5f9');
  gradient.addColorStop(1, '#64748b');

  ctx.fillStyle = gradient;
  ctx.fillRect(drawX, drawY + (player.crawling ? player.height * 0.4 : 0), width, height);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(drawX, drawY + (player.crawling ? player.height * 0.4 : 0), width, height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(drawX + 6, drawY + (player.crawling ? player.height * 0.4 : 0) + 12, 12, 8);
}

function drawEntities() {
  entities.forEach((entity) => {
    const x = entity.x;
    const y = entity.y;

    if (entity.type === 'fish') {
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bfdbfe';
      ctx.beginPath();
      ctx.moveTo(x + 8 * entity.dir, y);
      ctx.lineTo(x + 14 * entity.dir, y - 5);
      ctx.lineTo(x + 14 * entity.dir, y + 5);
      ctx.fill();
      return;
    }

    if (entity.type === 'shark') {
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 10, y - 4, 6, 4);
      ctx.fillRect(x + 2, y - 12, 6, 10);
      return;
    }

    if (entity.type === 'stingray') {
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.quadraticCurveTo(x, y - 14, x + 14, y);
      ctx.quadraticCurveTo(x, y + 10, x - 14, y);
      ctx.fill();
      return;
    }

    if (entity.type === 'turtle') {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x - 10, y - 6, 20, 12);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(x - 8, y - 4, 16, 8);
      return;
    }

    if (entity.type === 'crab') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x - 8, y - 6, 16, 12);
      ctx.fillRect(x - 10, y - 10, 4, 4);
      ctx.fillRect(x + 6, y - 10, 4, 4);
      return;
    }

    if (entity.type === 'cow') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 10, y - 10, 20, 14);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(x - 8, y - 8, 6, 6);
      ctx.fillRect(x + 2, y - 4, 6, 4);
      return;
    }

    if (entity.type === 'chicken') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(x - 6, y - 8, 12, 12);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(x + 4, y - 4, 6, 4);
      return;
    }

    if (entity.type === 'zombie') {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(x - 8, y - 14, 16, 18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 6, y - 12, 4, 4);
      ctx.fillRect(x + 2, y - 12, 4, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 4, y - 4, 8, 2);
      return;
    }

    if (entity.type === 'frog') {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(x - 6, y - 4, 4, 4);
      ctx.fillRect(x + 2, y - 4, 4, 4);
      return;
    }

    if (entity.type === 'sheep') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 10, y - 10, 20, 14);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x - 8, y - 8, 16, 10);
      return;
    }

    if (entity.type === 'bird') {
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x, y - 8);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 4);
      ctx.fill();
      return;
    }

    if (entity.type === 'pig') {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 10, y - 8, 20, 12);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x - 8, y - 6, 16, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 6, y - 4, 4, 4);
      ctx.fillRect(x + 2, y - 4, 4, 4);
      return;
    }

    if (entity.type === 'thresher') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 12, y - 4, 8, 4);
      ctx.fillRect(x + 4, y - 4, 8, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 8, y - 2, 4, 2);
      ctx.fillRect(x + 4, y - 2, 4, 2);
      return;
    }
  });
}

function updatePhysics() {
  const speed = player.crawling ? CRAWL_SPEED : MOVE_SPEED;
  player.vx = 0;

  if (keys.left) {
    player.vx = -speed;
  }
  if (keys.right) {
    player.vx = speed;
  }

  const swimming = inWater();
  if (swimming) {
    player.vx *= 0.7;
  }

  if ((keys.jump && player.onGround) || (keys.jump && swimming)) {
    player.vy = swimming ? -8 : JUMP_SPEED;
    player.onGround = false;
  }

  player.vy += swimming ? 0.24 : GRAVITY;

  const nextX = player.x + player.vx;
  if (!collidesAt(nextX, player.y)) {
    player.x = nextX;
  }

  const nextY = player.y + player.vy;
  if (!collidesAt(player.x, nextY)) {
    player.y = nextY;
    player.onGround = false;
  } else {
    if (player.vy > 0) {
      player.onGround = true;
    }
    player.vy = 0;
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > WORLD_WIDTH * TILE_SIZE) {
    player.x = WORLD_WIDTH * TILE_SIZE - player.width;
  }
  if (player.y + player.height > WORLD_HEIGHT * TILE_SIZE) {
    player.y = WORLD_HEIGHT * TILE_SIZE - player.height;
    player.onGround = true;
    player.vy = 0;
  }
}

function updateEntities() {
  entities.forEach((entity) => {
    const speed = {
      fish: 1.2,
      shark: 1.8,
      stingray: 1.1,
      turtle: 0.5,
      crab: 0.6,
      cow: 0.5,
      chicken: 0.8,
      zombie: 0.65,
      frog: 0.7,
      sheep: 0.4,
      bird: 1.5,
      pig: 0.6,
      thresher: 2.0,
    }[entity.type] || 0.6;

    if (entity.type === 'zombie') {
      if (timeOfDay >= NIGHT_THRESHOLD) {
        const dir = player.x > entity.x ? 1 : -1;
        entity.vx = dir * speed;
      } else {
        entity.vx = 0;
      }
    } else {
      entity.vx = entity.dir * speed;
    }

    entity.x += entity.vx;

    if (entity.x < 16 || entity.x > canvas.width - 16) {
      entity.dir *= -1;
      entity.x = Math.max(16, Math.min(canvas.width - 16, entity.x));
    }

    if (entity.type !== 'zombie' && Math.random() < 0.001) {
      entity.dir *= -1;
    }

    if (entity.type === 'fish' || entity.type === 'stingray' || entity.type === 'shark') {
      if (!isWaterAt(entity.x, entity.y)) {
        entity.dir *= -1;
      }
    }
  });
}

function isWaterAt(x, y) {
  return getTile(x, y) === 5;
}

function spawnEntities() {
  animalSpawn.forEach((group) => {
    for (let i = 0; i < group.count; i += 1) {
      const x = 80 + Math.random() * 520;
      const y = {
        cow: 120,
        chicken: 100,
        crab: 180,
        turtle: 170,
        fish: 150,
        stingray: 170,
        shark: 170,
        frog: 140,
        sheep: 110,
        bird: 80,
        pig: 115,
        thresher: 160,
      }[group.type];

      entities.push({
        type: group.type,
        x,
        y,
        vx: 0,
        dir: Math.random() < 0.5 ? -1 : 1,
      });
    }
  });
}

function spawnZombie() {
  if (entities.filter((entity) => entity.type === 'zombie').length >= 3) {
    return;
  }

  const x = Math.random() * (canvas.width - 80) + 40;
  const y = TILE_SIZE * 7;
  entities.push({ type: 'zombie', x, y, vx: 0, dir: 0 });
}

function updateStatus() {
  const timeLabel = timeOfDay >= NIGHT_THRESHOLD || timeOfDay < 0.18 ? 'Night' : 'Day';
  const inWaterText = inWater() ? 'Swimming' : player.crawling ? 'Crawling' : 'Walking';
  const zombieCount = entities.filter((entity) => entity.type === 'zombie').length;
  const alert = zombieCount > 0 && timeLabel === 'Night' ? ' · Zombies roaming' : '';

  statusMessage.textContent = `Time: ${timeLabel} · Selected: ${selectedBlock.name} · ${inWaterText}${alert}`;
}

function updateTime() {
  timeOfDay += DAY_SPEED;
  if (timeOfDay >= 1) {
    timeOfDay = 0;
  }
  if (timeOfDay >= NIGHT_THRESHOLD && Math.random() < 0.001) {
    spawnZombie();
  }
}

function gameLoop() {
  updatePhysics();
  updateEntities();
  updateTime();
  drawWorld();
  drawPlayer();
  updateStatus();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width / TILE_SIZE);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height / TILE_SIZE);

  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }

  if (event.shiftKey) {
    world[y][x] = 0;
  } else if (world[y][x] === 0) {
    world[y][x] = selectedBlock.id;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
    keys.left = true;
  }
  if (event.code === 'KeyD' || event.code === 'ArrowRight') {
    keys.right = true;
  }
  if (event.code === 'KeyW' || event.code === 'ArrowUp' || event.code === 'Space') {
    keys.jump = true;
  }
  if (event.code === 'KeyC') {
    player.crawling = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
    keys.left = false;
  }
  if (event.code === 'KeyD' || event.code === 'ArrowRight') {
    keys.right = false;
  }
  if (event.code === 'KeyW' || event.code === 'ArrowUp' || event.code === 'Space') {
    keys.jump = false;
  }
  if (event.code === 'KeyC') {
    player.crawling = false;
  }
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

buildInventory();
updateStatus();
gameLoop();
