import * as THREE from 'three';
import anime from 'animejs';
import { HOTSPOTS, MODALS } from './content.js';
import { initScreen } from './screen.js';
import { createWindow3D } from './window3d.js';
import { createFurniture3D } from './furniture3d.js';
import { createShelves3D } from './shelves3d.js';
import { createBookcase3D } from './bookcase3d.js';
import { createDoor3D } from './door3d.js';
import { createCeilingLamp3D } from './ceiling3d.js';
import { setupProceduralWalls3D } from './walls3d.js';

const SIZE = 10;
const H = SIZE / 2;
const getBaseFov = () => (window.innerWidth < 700 && window.innerWidth < window.innerHeight ? 92 : 84);
const BASE_FOV = getBaseFov();
const ZOOM_FOV = 50;
const CAMERA_BACK = 2.3; // distancia hacia atrás desde el centro para ver todo el panorama

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, CAMERA_BACK); // vista panorámica inicial frente a la pared frontal
camera.rotation.order = 'YXZ';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- Habitación & Texturas (Modo Claro / Modo Oscuro) ----------
const manager = new THREE.LoadingManager(() => document.getElementById('loader').classList.add('done'));
const loader = new THREE.TextureLoader(manager);

const loadTexture = (path) => {
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
};

// Solo se precarga la textura del piso; las 4 paredes y el techo se generan proceduralmente en 3D
const floorTexture = loadTexture('/img/piso.jpg');
const currentTheme = 'light';
localStorage.removeItem('theme');
document.body.classList.remove('dark-theme');

// yaw y camPos: ángulo y posición retrocedida de la cámara para ver el panorama completo de cada pared
const walls = {
  frontal:   { pos: [0, 0, -H], rotY: 0,            yaw: 0,            camPos: [0, 0, CAMERA_BACK] },
  izquierda: { pos: [-H, 0, 0], rotY: Math.PI / 2,  yaw: Math.PI / 2,  camPos: [CAMERA_BACK, 0, 0] },
  derecha:   { pos: [H, 0, 0],  rotY: -Math.PI / 2, yaw: -Math.PI / 2, camPos: [-CAMERA_BACK, 0, 0] },
  trasera:   { pos: [0, 0, H],  rotY: Math.PI,      yaw: Math.PI,      camPos: [0, 0, -CAMERA_BACK] },
};

for (const [name, w] of Object.entries(walls)) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshBasicMaterial()
  );
  mesh.position.set(...w.pos);
  mesh.rotation.y = w.rotY;
  scene.add(mesh);
  w.mesh = mesh;
}

const caps = {};
const cap = (name, y, rotX) => {
  const mat = name === 'piso'
    ? new THREE.MeshBasicMaterial({ map: floorTexture })
    : new THREE.MeshBasicMaterial();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat);
  m.position.y = y; m.rotation.x = rotX; scene.add(m);
  caps[name] = m;
};
cap('techo', H, Math.PI / 2);
cap('piso', -H, -Math.PI / 2);

// ---------- Paredes procedurales con zócalos y cornisas en 3D ----------
const walls3d = setupProceduralWalls3D(walls, currentTheme);

// Estado global de iluminación del cuarto (cortinas abiertas 0..1 y luz del techo 0..1)
const roomLightState = {
  curtainOpen: 1.0,
  ceilingPower: 1.0,
  ready: false,
};

// ---------- Ventana 3D con cortinas en pared derecha ----------
const window3d = createWindow3D(walls.derecha.mesh, currentTheme, (curtainOpenFactor) => {
  roomLightState.curtainOpen = curtainOpenFactor;
  if (roomLightState.ready) syncRoomLighting();
});
walls.derecha.mesh.add(window3d.group);

// ---------- 4 Estantes flotantes 3D con tiras LED en pared frontal ----------
const shelves3d = createShelves3D(currentTheme);
walls.frontal.mesh.add(shelves3d.group);

// ---------- Mueble librero 3D con sombras en pared izquierda (Habilidades) ----------
const bookcase3d = createBookcase3D(currentTheme);
walls.izquierda.mesh.add(bookcase3d.group);

// ---------- Puerta 3D, pizarra 3D y perchero 3D en pared trasera (Contacto) ----------
const door3d = createDoor3D(currentTheme);
walls.trasera.mesh.add(door3d.group);

// ---------- Techo procedural + Lámpara empotrada 3D y detector de humo (controlable) ----------
const ceiling3d = createCeilingLamp3D(currentTheme, caps.techo, (power) => {
  roomLightState.ceilingPower = power;
  if (roomLightState.ready) syncRoomLighting();
});
caps.techo.add(ceiling3d.group);

// ---------- Escritorio 3D cerca de la pared frontal ----------
const furniture3d = createFurniture3D(manager, currentTheme, ({ box, center, size }) => {
  const pcHotspot = HOTSPOTS.find((h) => h.id === 'pc');
  if (!pcHotspot || !pcHotspot.mesh) return;

  // Mover el plano de proyección del hotspot 'pc' desde la pared hasta la posición 3D exacta de los 2 monitores
  scene.add(pcHotspot.mesh);
  pcHotspot.mesh.geometry.dispose();
  pcHotspot.mesh.geometry = new THREE.PlaneGeometry(size.x, size.y);
  pcHotspot.mesh.position.set(center.x, center.y, box.max.z);
  pcHotspot.mesh.rotation.set(0, 0, 0);
  pcHotspot.mesh.updateWorldMatrix(true, false);

  pcHotspot.size = { w: size.x, h: size.y };
  pcHotspot.center.set(center.x, center.y, box.max.z);
  pcHotspot.is3DMonitor = true;
});
scene.add(furniture3d.group);

roomLightState.ready = true;
function syncRoomLighting() {
  if (!roomLightState.ready) return;
  const { curtainOpen, ceilingPower } = roomLightState;

  walls3d.setCurtainOpen(curtainOpen);
  walls3d.setCeilingLightPower(ceilingPower);
  ceiling3d.setCurtainOpen(curtainOpen);
  window3d.setRoomLightPower(ceilingPower);
  furniture3d.setRoomLighting({ curtainOpen, ceilingPower });
  bookcase3d.setRoomLighting({ curtainOpen, ceilingPower });
  door3d.setRoomLighting({ curtainOpen, ceilingPower });

  // Oscurecer también el piso proporcionalmente a las cortinas y a la luz del techo
  if (caps.piso && caps.piso.material) {
    const floorFactor = 0.18 + 0.50 * curtainOpen + 0.32 * ceilingPower;
    caps.piso.material.color.setScalar(floorFactor);
  }
}
syncRoomLighting();

// ---------- Hotspots (THREE.Raycaster) ----------
// Cada hotspot es un plano invisible hijo de su pared. Se define con coordenadas UV de la imagen
// (u,v de 0 a 1 desde la esquina superior izquierda), así es fácil ajustarlos mirando la imagen.
const pinsEl = document.getElementById('pins');
const hotspotMeshes = [];

for (const h of HOTSPOTS) {
  const [u0, v0, u1, v1] = h.rect;
  const w = (u1 - u0) * SIZE;
  const hh = (v1 - v0) * SIZE;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, hh),
    new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, depthWrite: false })
  );
  const zOffset = h.id === 'libreros' ? bookcase3d.depth + 0.03 : 0.02;
  mesh.position.set(((u0 + u1) / 2 - 0.5) * SIZE, (0.5 - (v0 + v1) / 2) * SIZE, zOffset);
  walls[h.wall].mesh.add(mesh);
  mesh.updateWorldMatrix(true, false);
  h.mesh = mesh;
  h.size = { w, h: hh };
  h.center = mesh.getWorldPosition(new THREE.Vector3());
  mesh.userData.hotspot = h;
  if (h.id === 'libreros') {
    h.isBookcase = true; // no usar el recuadro completo; se interactúa directamente con los libros y el tocadiscos
  } else if (h.id === 'puerta') {
    h.is3DDoor = true; // resaltar directamente la hoja y molduras 3D de la puerta
  } else if (h.id === 'pizarra') {
    h.is3DBoard = true; // resaltar directamente el marco de madera 3D de la pizarra
  } else {
    hotspotMeshes.push(mesh);
  }

  // Solo crear el punto informativo (pin) para el PC por ahora
  if (h.id === 'pc') {
    const pin = document.createElement('button');
    pin.className = 'pin';
    pin.id = `pin-${h.id}`;
    pin.setAttribute('aria-label', h.label);
    pin.innerHTML = `<i></i><span>${h.label}</span>`;
    pin.addEventListener('click', (e) => { e.stopPropagation(); activate(h); });
    pinsEl.appendChild(pin);
    h.pin = pin;
  }
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  
  // Verificar clic en las cortinas (estén plegadas a los lados o cerradas)
  const curtainHit = raycaster.intersectObjects(window3d.curtainMeshes, false)[0];
  if (curtainHit) return { isCurtain: true };
  
  // Verificar clic en la silla 3D (antes que el escritorio por estar delante)
  const chairHit = raycaster.intersectObjects(furniture3d.chairMeshes, true)[0];
  if (chairHit) return { isChair: true };

  // Verificar clic directamente sobre las 2 pantallas 3D de los monitores
  const monitorHit = raycaster.intersectObjects(furniture3d.monitorMeshes, true)[0];
  if (monitorHit) return HOTSPOTS.find((h) => h.id === 'pc') || null;

  // Verificar clic en el tocadiscos 3D del estante (reproduce canción y gira el vinilo)
  const turntableHit = raycaster.intersectObjects(bookcase3d.turntableMeshes, true)[0];
  if (turntableHit) return { isTurntable: true };

  // Verificar clic en los libros 3D del estante para abrir Habilidades
  const bookHit = raycaster.intersectObjects(bookcase3d.bookMeshes, true)[0];
  if (bookHit) return HOTSPOTS.find((h) => h.id === 'libreros') || null;

  // Verificar clic en el interruptor 3D al lado de la puerta (controla la luz del techo)
  const switchHit = raycaster.intersectObjects(door3d.switchMeshes, true)[0];
  if (switchHit) return { isWallSwitch: true };

  // Verificar clic en la puerta 3D para abrir Contacto
  const doorHit = raycaster.intersectObjects(door3d.doorMeshes, true)[0];
  if (doorHit) return HOTSPOTS.find((h) => h.id === 'puerta') || null;

  // Verificar clic en el marco/pizarra 3D para abrir Contacto
  const boardHit = raycaster.intersectObjects(door3d.boardMeshes, true)[0];
  if (boardHit) return HOTSPOTS.find((h) => h.id === 'pizarra') || null;

  const hit = raycaster.intersectObjects(hotspotMeshes, false)[0];
  if (hit) return hit.object.userData.hotspot;

  return null;
}

let hovered = null;
function setHover(h) {
  if (h === hovered) return;
  if (hovered) {
    if (hovered.is3DMonitor) {
      furniture3d.setMonitorHover(false);
    } else if (hovered.isBookcase) {
      bookcase3d.setBooksHover(false);
    } else if (hovered.isTurntable) {
      bookcase3d.setTurntableHover(false);
    } else if (hovered.is3DDoor) {
      door3d.setDoorHover(false);
    } else if (hovered.is3DBoard) {
      door3d.setBoardHover(false);
    } else if (hovered.isWallSwitch) {
      door3d.setSwitchHover(false);
    } else if (hovered.mesh) {
      anime({ targets: hovered.mesh.material, opacity: 0, duration: 250, easing: 'linear' });
    }
  }
  hovered = h;
  if (h) {
    if (h.is3DMonitor) {
      furniture3d.setMonitorHover(true);
    } else if (h.isBookcase) {
      bookcase3d.setBooksHover(true);
    } else if (h.isTurntable) {
      bookcase3d.setTurntableHover(true);
    } else if (h.is3DDoor) {
      door3d.setDoorHover(true);
    } else if (h.is3DBoard) {
      door3d.setBoardHover(true);
    } else if (h.isWallSwitch) {
      door3d.setSwitchHover(true);
    } else if (h.mesh) {
      anime({ targets: h.mesh.material, opacity: 0.2, duration: 250, easing: 'linear' });
    }
  }
  canvas.style.cursor = h ? 'pointer' : '';
}

// ---------- Cámara animada con anime.js ----------
let current = 'frontal';
let yawTarget = 0;
let locked = false;   // zoom / modal abierto: bloquea arrastre
let activeHotspot = null;

const wrapNear = (target, ref) => {
  const full = Math.PI * 2;
  let d = (target - ref) % full;
  if (d > Math.PI) d -= full;
  if (d < -Math.PI) d += full;
  return ref + d;
};

function moveCamera({ pos = [0, 0, 0], yaw, pitch = 0, fov = getBaseFov(), duration = 1200, easing = 'easeInOutQuad', complete }) {
  yawVel = 0;
  pitchVel = 0;
  anime.remove([camera.rotation, camera.position, camera]);
  anime({ targets: camera.position, x: pos[0], y: pos[1], z: pos[2], duration, easing });
  anime({
    targets: camera, fov, duration, easing,
    update: () => camera.updateProjectionMatrix(),
  });
  anime({ targets: camera.rotation, y: yaw, x: pitch, duration, easing, complete });
}

const panels = document.querySelectorAll('.panel');
const buttons = document.querySelectorAll('.nav button');

function showPanel(name) {
  // Avisos de zonas ocultos temporalmente mientras se diseña la habitación y sus interacciones
  panels.forEach((p) => {
    p.classList.remove('visible');
    anime.remove(p);
    p.style.opacity = '0';
  });
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.wall === name));
}

function mirarPared(name) {
  if (!walls[name]) return;
  closeModal(true);
  current = name;
  const targetWall = walls[name];
  yawTarget = wrapNear(targetWall.yaw, camera.rotation.y);
  moveCamera({ pos: targetWall.camPos, yaw: yawTarget });
  showPanel(name);
}

// ---------- Zoom + modal ----------
const modal = document.getElementById('modal');
const modalCard = modal.querySelector('.modal-card');
const modalBody = document.getElementById('modal-body');

function zoomTo(h, done) {
  const c = h.center;
  const tan = Math.tan(THREE.MathUtils.degToRad(ZOOM_FOV / 2));
  // distancia necesaria para que el hotspot quepa con margen
  const need = Math.max(h.size.h, h.size.w / camera.aspect) * 1.35 / (2 * tan);
  const dist = c.length();
  const t = Math.max(0, (dist - need) / dist);
  const end = c.clone().multiplyScalar(t);
  const dir = c.clone().sub(end);
  const yaw = wrapNear(Math.atan2(-dir.x, -dir.z), camera.rotation.y);
  const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
  moveCamera({ pos: end.toArray(), yaw, pitch, fov: ZOOM_FOV, duration: 1400, easing: 'easeInOutCubic', complete: done });
}

let windowModalTimer = null;

function activate(h) {
  if (locked) return;
  // Manejar clic en cortinas
  if (h && h.isCurtain) {
    window3d.toggleCurtains();
    return;
  }
  // Manejar clic en silla 3D
  if (h && h.isChair) {
    furniture3d.spinChair();
    return;
  }
  // Manejar clic en tocadiscos 3D (girar vinilo y sonar música)
  if (h && h.isTurntable) {
    bookcase3d.toggleTurntable();
    return;
  }
  // Manejar clic únicamente desde el interruptor de pared 3D (encender/apagar luz del techo)
  if (h && h.isWallSwitch) {
    ceiling3d.toggleLight();
    door3d.setSwitchState(ceiling3d.state.on);
    return;
  }
  // Manejar clic en ventana 3D (abrir/cerrar hojas de la ventana sin abrir modal informativo)
  if (h && h.id === 'ventana') {
    if (!window3d.curtainState.open) {
      window3d.toggleCurtains();
      setTimeout(() => window3d.toggleWindow(), 550);
    } else {
      window3d.toggleWindow();
    }
    return;
  }
  // Manejar clic en puerta 3D (abrir/cerrar hoja de la puerta sin abrir modal informativo)
  if (h && h.id === 'puerta') {
    door3d.setDoorOpen(!door3d.doorState.open);
    return;
  }
  // Solo el PC abre su pantalla informativa por ahora
  if (!h || h.id !== 'pc') return;

  locked = true;
  activeHotspot = h;
  setHover(null);
  document.body.classList.add('zoomed');

  zoomTo(h, () => (h.fullscreen ? openScreen(h) : openModal(h)));
}

function openModal(h) {
  modalBody.innerHTML = MODALS[h.modal || h.id];
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  anime.remove(modalCard);
  anime({ targets: modalCard, opacity: [0, 1], translateY: [30, 0], scale: [0.96, 1], duration: 600, easing: 'easeOutCubic' });
  anime({
    targets: modalBody.querySelectorAll('.stagger'),
    opacity: [0, 1], translateY: [14, 0], delay: anime.stagger(80, { start: 250 }), duration: 500, easing: 'easeOutCubic',
  });
  modal.querySelector('.modal-close').focus();
}

// ---------- Pantalla completa (monitor) ----------
// La pantalla HTML nace exactamente sobre el rectángulo proyectado del monitor y se expande
// a toda la ventana: el usuario nunca ve la textura pixelada ampliada.
const screenEl = document.getElementById('screen');
const screenUI = initScreen(screenEl);
const clock = document.getElementById('screen-clock');
let closingScreen = false;

function projectedRect(h) {
  const px = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const p = h.mesh.localToWorld(new THREE.Vector3(sx * h.size.w / 2, sy * h.size.h / 2, 0)).project(camera);
    px.push([(p.x + 1) / 2 * window.innerWidth, (1 - p.y) / 2 * window.innerHeight]);
  }
  const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]);
  const L = Math.max(0, Math.min(...xs)), R = Math.max(0, window.innerWidth - Math.max(...xs));
  const T = Math.max(0, Math.min(...ys)), B = Math.max(0, window.innerHeight - Math.max(...ys));
  return `inset(${T}px ${R}px ${B}px ${L}px round 8px)`;
}

function openScreen(h) {
  clock.textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  screenEl.style.clipPath = projectedRect(h);
  screenEl.classList.add('open');
  screenEl.setAttribute('aria-hidden', 'false');
  anime.remove(screenEl);
  screenUI.showGrid();
  anime({
    targets: screenEl.querySelector('.cf-stage'),
    opacity: [0, 1], scale: [0.85, 1], translateY: [30, 0],
    delay: 900, duration: 900, easing: 'easeOutCubic',
  });
  anime({ targets: screenEl, clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 900, easing: 'easeInOutCubic' });
  anime({
    targets: screenEl.querySelectorAll('.scr-titlebar, .scr-view, .scr-status'),
    opacity: [0, 1], delay: anime.stagger(90, { start: 500 }), duration: 500, easing: 'easeOutQuad',
  });
  screenEl.querySelector('.scr-close').focus();
}

function closeScreen(h, done) {
  anime.remove(screenEl);
  anime({
    targets: screenEl, clipPath: projectedRect(h), duration: 700, easing: 'easeInOutCubic',
    complete: () => {
      screenEl.classList.remove('open');
      screenEl.setAttribute('aria-hidden', 'true');
      done();
    },
  });
}

screenEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { e.stopPropagation(); closeModal(); }
});

function closeModal(immediate = false) {
  if (!locked) return;
  if (screenEl.classList.contains('open')) {
    if (immediate) {
      anime.remove(screenEl);
      screenEl.classList.remove('open');
    } else {
      if (closingScreen) return;
      closingScreen = true;
      closeScreen(activeHotspot, () => { closingScreen = false; closeModal(); });
      return;
    }
  }
  const wasOpen = modal.classList.contains('open');
  clearTimeout(windowModalTimer);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  const h = activeHotspot;
  activeHotspot = null;
  document.body.classList.remove('zoomed');
  if (h && h.id === 'ventana') {
    setTimeout(() => window3d.setWindowOpen(false), immediate ? 0 : 350);
  }
  if (h && h.id === 'puerta') {
    setTimeout(() => door3d.setDoorOpen(false), immediate ? 0 : 250);
  }
  if (immediate) { locked = false; return; } // mirarPared se encarga de mover la cámara
  if (wasOpen || h) {
    const targetWall = walls[h ? h.wall : current];
    yawTarget = wrapNear(targetWall.yaw, camera.rotation.y);
    moveCamera({ pos: targetWall.camPos, yaw: yawTarget, duration: 1000, easing: 'easeInOutCubic', complete: () => { locked = false; } });
  }
}

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modal.querySelector('.modal-close').addEventListener('click', () => closeModal());

// ---------- Entrada y Movimiento en Primera Persona (WASD / Flechas + giro 360°) ----------
buttons.forEach((b) => b.addEventListener('click', () => mirarPared(b.dataset.wall)));

const keysPressed = new Set();
const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeModal();
  if (locked) return;
  if (moveKeys.has(e.code)) {
    keysPressed.add(e.code);
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed.delete(e.code);
});

window.addEventListener('blur', () => keysPressed.clear());

// Detecta qué pared está mirando el usuario según el ángulo yaw actual para actualizar el panel
function syncWallFromYaw(yaw) {
  let bestWall = current;
  let minDiff = Infinity;
  for (const [name, w] of Object.entries(walls)) {
    const diff = Math.abs(wrapNear(w.yaw, yaw) - yaw);
    if (diff < minDiff) {
      minDiff = diff;
      bestWall = name;
    }
  }
  if (bestWall !== current) {
    current = bestWall;
    showPanel(bestWall);
  }
}

// Arrastrar para girar libremente 360° (con inercia suave en pantallas táctiles y pellizco con 2 dedos para zoom)
let dragging = false, moved = 0, lx = 0, ly = 0;
let yawVel = 0, pitchVel = 0;
let activePointerId = null;
const touchPointers = new Map();
let prevPinchDist = 0;

canvas.addEventListener('pointerdown', (e) => {
  if (locked) return;
  touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
  anime.remove([camera.rotation, camera.position]);
  yawVel = 0;
  pitchVel = 0;

  if (touchPointers.size === 1) {
    dragging = true;
    activePointerId = e.pointerId;
    moved = 0;
    lx = e.clientX;
    ly = e.clientY;
  } else if (touchPointers.size === 2) {
    // Segundo dedo en pantalla: modo pellizco (pinch-to-zoom)
    dragging = false;
    const pts = Array.from(touchPointers.values());
    prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
});

window.addEventListener('pointermove', (e) => {
  if (locked) return;

  if (touchPointers.has(e.pointerId)) {
    touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
  }

  // Pellizco con 2 dedos en móvil para acercar/alejar la vista
  if (touchPointers.size === 2) {
    const pts = Array.from(touchPointers.values());
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (prevPinchDist > 0) {
      const deltaDist = prevPinchDist - dist;
      camera.fov = THREE.MathUtils.clamp(camera.fov + deltaDist * 0.12, 52, 98);
      camera.updateProjectionMatrix();
    }
    prevPinchDist = dist;
    return;
  }

  if (!dragging || e.pointerId !== activePointerId) {
    if (e.pointerType !== 'touch' && e.target === canvas) {
      setHover(pick(e.clientX, e.clientY));
    }
    return;
  }

  const dx = e.clientX - lx;
  const dy = e.clientY - ly;
  moved += Math.abs(dx) + Math.abs(dy);

  // Mayor sensibilidad en pantallas táctiles de celular para girar cómodamente con un solo gesto del dedo
  const sens = e.pointerType === 'touch' ? 0.0064 : 0.004;
  const dYaw = dx * sens;
  const dPitch = dy * sens;

  camera.rotation.y += dYaw;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + dPitch, -1.35, 1.35);
  yawTarget = camera.rotation.y;

  // Guardar velocidad instantánea para inercia suave al soltar el dedo en móvil
  if (e.pointerType === 'touch') {
    yawVel = dYaw * 0.85 + yawVel * 0.15;
    pitchVel = dPitch * 0.85 + pitchVel * 0.15;
  }

  syncWallFromYaw(camera.rotation.y);
  lx = e.clientX;
  ly = e.clientY;
});

// Rueda del ratón para acercar/alejar el panorama libremente cuando no hay modal abierto
canvas.addEventListener('wheel', (e) => {
  if (locked) return;
  camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 52, 98);
  camera.updateProjectionMatrix();
}, { passive: true });

function endPointer(e, isCancel = false) {
  touchPointers.delete(e.pointerId);
  if (touchPointers.size < 2) prevPinchDist = 0;

  if (e.pointerId === activePointerId) {
    const wasDragging = dragging;
    dragging = false;
    activePointerId = null;

    if (!isCancel && wasDragging) {
      const tapLimit = e.pointerType === 'touch' ? 14 : 6;
      if (moved < tapLimit) {
        yawVel = 0;
        pitchVel = 0;
        const h = pick(e.clientX, e.clientY);
        if (h) { activate(h); return; }
      }
    }
  }
}

window.addEventListener('pointerup', (e) => endPointer(e, false));
window.addEventListener('pointercancel', (e) => endPointer(e, true));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Pines pulsantes proyectados a pantalla ----------
const v = new THREE.Vector3();
function updatePins() {
  const show = !locked;
  for (const h of HOTSPOTS) {
    if (!h.pin) continue;
    v.copy(h.center).project(camera);
    const coveredByCurtain = h.id === 'ventana' && !window3d.curtainState.open;
    const visible = show && !coveredByCurtain && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
    h.pin.style.opacity = visible ? 1 : 0;
    h.pin.style.pointerEvents = visible ? 'auto' : 'none';
    h.pin.style.transform = `translate(${(v.x + 1) / 2 * window.innerWidth}px, ${(1 - v.y) / 2 * window.innerHeight}px) translate(-50%, -50%)`;
  }
}

// ---------- Reloj para animación de cortinas y desplazamiento en primera persona ----------
const clock3d = new THREE.Clock();
const WALK_SPEED = 3.8;

// ---------- Joystick virtual táctil para caminar en móvil (360° analógico) ----------
const joyEl = document.getElementById('mobile-joystick');
const joyKnob = document.getElementById('joy-knob');
const joyState = {
  pointerId: null,
  centerX: 0,
  centerY: 0,
  x: 0,  // -1 (izquierda) a +1 (derecha)
  y: 0,  // -1 (atrás) a +1 (adelante)
  kx: 0, // desplazamiento visual X en px
  ky: 0, // desplazamiento visual Y en px
  maxRadius: 23,
};

if (joyEl && joyKnob) {
  const renderKnob = () => {
    joyKnob.style.transform = `translate3d(${joyState.kx}px, ${joyState.ky}px, 0)`;
  };

  const updateJoyFromEvent = (e) => {
    const dx = e.clientX - joyState.centerX;
    const dy = e.clientY - joyState.centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, joyState.maxRadius);
    const angle = Math.atan2(dy, dx);
    joyState.kx = Math.cos(angle) * clampedDist;
    joyState.ky = Math.sin(angle) * clampedDist;

    renderKnob();
    joyState.x = joyState.kx / joyState.maxRadius;
    joyState.y = -joyState.ky / joyState.maxRadius; // hacia arriba en pantalla = avanzar (+1)
  };

  const resetJoy = () => {
    if (joyState.pointerId === null && joyState.kx === 0 && joyState.ky === 0) return;
    joyState.pointerId = null;
    joyState.x = 0;
    joyState.y = 0;
    joyEl.classList.remove('active');
    anime.remove(joyState);
    anime({
      targets: joyState,
      kx: 0,
      ky: 0,
      duration: 220,
      easing: 'easeOutBack',
      update: renderKnob,
    });
  };

  joyEl.addEventListener('pointerdown', (e) => {
    if (locked || joyState.pointerId !== null) return;
    e.stopPropagation();
    anime.remove([joyState, camera.position]);
    const rect = joyEl.getBoundingClientRect();
    joyState.pointerId = e.pointerId;
    joyState.centerX = rect.left + rect.width / 2;
    joyState.centerY = rect.top + rect.height / 2;
    joyEl.classList.add('active');
    try { joyEl.setPointerCapture(e.pointerId); } catch (_) {}
    updateJoyFromEvent(e);
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyState.pointerId) return;
    updateJoyFromEvent(e);
  });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerId !== joyState.pointerId) return;
    resetJoy();
  });

  window.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== joyState.pointerId) return;
    resetJoy();
  });

  window.addEventListener('blur', resetJoy);
}

function updateFirstPersonMovement(dt) {
  if (locked) return;

  let forward = joyState.y;
  let strafe = joyState.x;
  if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) forward += 1;
  if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) forward -= 1;
  if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) strafe += 1;
  if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) strafe -= 1;

  if (Math.abs(forward) < 0.01 && Math.abs(strafe) < 0.01) return;

  anime.remove(camera.position);
  const len = Math.hypot(forward, strafe);
  if (len > 1) {
    forward /= len;
    strafe /= len;
  }

  const yaw = camera.rotation.y;
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);

  // Dirección horizontal según hacia dónde mira la cámara
  const dx = (-sinY * forward + cosY * strafe) * WALK_SPEED * dt;
  const dz = (-cosY * forward - sinY * strafe) * WALK_SPEED * dt;

  // Límites de colisión suaves dentro de la habitación para no atravesar paredes ni muebles
  camera.position.x = THREE.MathUtils.clamp(camera.position.x + dx, -3.55, 3.85);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + dz, -1.65, 3.85);
}

function updateTouchInertia(dt) {
  if (locked || dragging || touchPointers.size > 0) return;
  if (Math.abs(yawVel) < 0.00004 && Math.abs(pitchVel) < 0.00004) return;

  camera.rotation.y += yawVel;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + pitchVel, -1.35, 1.35);
  yawTarget = camera.rotation.y;
  syncWallFromYaw(camera.rotation.y);

  const damping = Math.exp(-dt * 8.5);
  yawVel *= damping;
  pitchVel *= damping;
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock3d.getDelta(), 0.05);
  updateFirstPersonMovement(dt);
  updateTouchInertia(dt);
  window3d.update(dt);
  bookcase3d.update(dt);
  ceiling3d.update(dt);
  updatePins();
  renderer.render(scene, camera);
});
showPanel('frontal');
