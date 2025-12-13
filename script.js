const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const hungerEl = document.getElementById('hunger');
const comfortEl = document.getElementById('comfort');
const stressEl = document.getElementById('stress');
const pxpEl = document.getElementById('pxp');
const dayEl = document.getElementById('day');
const clockEl = document.getElementById('clock');
const interactionEl = document.getElementById('interaction');
const progressEl = document.getElementById('action-progress');
const progressFill = document.getElementById('action-fill');
const progressLabel = document.getElementById('action-label');

const tileSize = 64;
const mapWidth = 12;
const mapHeight = 8;

const colors = {
  floor: '#0b1220',
  wall: '#111827',
  crib: '#7dd3fc',
  table: '#fcd34d',
  player: '#c084fc',
  baby: '#f9a8d4'
};

const player = {
  x: 2,
  y: 3,
  speed: 3.2,
  busy: false,
  facing: 'down'
};

const objects = [
  { x: 8, y: 3, type: 'crib', label: 'Crib (Feed Arthur)' },
  { x: 6, y: 5, type: 'table', label: 'Changing Table' }
];

const needs = {
  hunger: 100,
  comfort: 100,
  stress: 12
};

const xp = {
  feeding: 0,
  cleaning: 0
};

const gameTime = {
  minutes: 6 * 60,
  day: 1,
  minutePerSecond: 1.5
};

let last = performance.now();
let keys = {};
let currentAction = null;
let toastTimeout;

function toMinutes(t) {
  const h = Math.floor(t / 60) % 24;
  const m = Math.floor(t % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addLog(text) {
  const li = document.createElement('li');
  li.textContent = text;
  logEl.prepend(li);
  while (logEl.children.length > 6) {
    logEl.removeChild(logEl.lastChild);
  }
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.querySelector('.game-panel').appendChild(toast);
  }
  toast.innerHTML = message;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.remove(), 2600);
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function updateHUD() {
  hungerEl.style.width = `${needs.hunger}%`;
  comfortEl.style.width = `${needs.comfort}%`;
  stressEl.style.width = `${needs.stress}%`;
  pxpEl.textContent = xp.feeding + xp.cleaning;
  dayEl.textContent = gameTime.day;
  clockEl.textContent = toMinutes(gameTime.minutes);

  if (needs.hunger < 25 || needs.comfort < 25) {
    hungerEl.parentElement.parentElement.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.25))';
  } else {
    hungerEl.parentElement.parentElement.style.filter = 'none';
  }
}

function drawGrid() {
  ctx.fillStyle = colors.floor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      ctx.strokeStyle = '#1f2937';
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawObjects() {
  objects.forEach(obj => {
    ctx.fillStyle = obj.type === 'crib' ? colors.crib : colors.table;
    ctx.fillRect(obj.x * tileSize + 8, obj.y * tileSize + 8, tileSize - 16, tileSize - 16);
    ctx.fillStyle = '#0b1220';
    ctx.font = '12px sans-serif';
    ctx.fillText(obj.type === 'crib' ? 'Crib' : 'Table', obj.x * tileSize + 14, obj.y * tileSize + 36);
  });

  // Baby icon above crib
  const crib = objects.find(o => o.type === 'crib');
  ctx.fillStyle = colors.baby;
  ctx.beginPath();
  ctx.arc(crib.x * tileSize + tileSize / 2, crib.y * tileSize + tileSize / 2, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.fillStyle = colors.player;
  ctx.fillRect(player.x * tileSize + 14, player.y * tileSize + 14, tileSize - 28, tileSize - 28);
}

function nearestObject() {
  return objects.find(obj => Math.abs(obj.x - player.x) <= 1 && Math.abs(obj.y - player.y) <= 1);
}

function startAction(obj) {
  if (player.busy) return;
  if (obj.type === 'crib') {
    currentAction = { type: 'feeding', duration: 3.4, elapsed: 0, label: 'Feeding Arthur' };
  } else {
    currentAction = { type: 'cleaning', duration: 2.8, elapsed: 0, label: 'Changing Diaper' };
  }
  player.busy = true;
  interactionEl.classList.add('hidden');
  progressEl.classList.remove('hidden');
  progressLabel.textContent = currentAction.label;
  addLog(`${currentAction.label}…`);
}

function completeAction() {
  if (!currentAction) return;
  if (currentAction.type === 'feeding') {
    needs.hunger = 100;
    xp.feeding += 5;
    addLog('Arthur is fed! +5 Feeding PXP');
    showToast('<strong>Success:</strong> Arthur is content and full.');
  } else {
    needs.comfort = 100;
    xp.cleaning += 5;
    addLog('Fresh diaper! +5 Cleaning PXP');
    showToast('<strong>Fresh & cozy:</strong> Clean diaper applied.');
  }
  currentAction = null;
  player.busy = false;
  progressEl.classList.add('hidden');
  progressFill.style.width = '0%';
}

function applyNeedDecay(delta) {
  needs.hunger = clamp(needs.hunger - delta * 2.2, 0, 100);
  needs.comfort = clamp(needs.comfort - delta * 1.6, 0, 100);

  const crying = needs.hunger <= 0 || needs.comfort <= 0;
  if (crying) {
    needs.stress = clamp(needs.stress + delta * 6, 0, 100);
  } else {
    needs.stress = clamp(needs.stress - delta * 0.8, 0, 100);
  }
}

function updateGameTime(delta) {
  gameTime.minutes += delta * gameTime.minutePerSecond;
  if (gameTime.minutes >= 24 * 60) {
    gameTime.minutes = 0;
    gameTime.day += 1;
  }
}

function update(delta) {
  applyNeedDecay(delta);
  updateGameTime(delta);

  if (!player.busy) {
    const moveX = (keys['ArrowRight'] || keys['d'] ? 1 : 0) - (keys['ArrowLeft'] || keys['a'] ? 1 : 0);
    const moveY = (keys['ArrowDown'] || keys['s'] ? 1 : 0) - (keys['ArrowUp'] || keys['w'] ? 1 : 0);
    const len = Math.hypot(moveX, moveY) || 1;
    player.x = clamp(player.x + (moveX / len) * player.speed * delta, 1, mapWidth - 2);
    player.y = clamp(player.y + (moveY / len) * player.speed * delta, 1, mapHeight - 2);
  }

  if (currentAction) {
    currentAction.elapsed += delta;
    const pct = clamp(currentAction.elapsed / currentAction.duration, 0, 1);
    progressFill.style.width = `${pct * 100}%`;
    if (pct >= 1) completeAction();
  }

  const obj = nearestObject();
  if (obj && !player.busy) {
    interactionEl.textContent = obj.type === 'crib' ? 'Press E to Feed Arthur' : 'Press E to Change Diaper';
    interactionEl.classList.remove('hidden');
  } else {
    interactionEl.classList.add('hidden');
  }

  updateHUD();
}

function render() {
  drawGrid();
  drawObjects();
  drawPlayer();
}

function loop(now) {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === 'e' || e.key === 'E') {
    const obj = nearestObject();
    if (obj && !player.busy) {
      startAction(obj);
    }
  }
});

window.addEventListener('keyup', (e) => { keys[e.key] = false; });

addLog('Welcome home. Keep Arthur fed and comfy!');
addLog('Stay close to the crib or table to help.');
updateHUD();
requestAnimationFrame(loop);
