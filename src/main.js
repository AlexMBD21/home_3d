import * as THREE from 'three';
import anime from 'animejs';
import { HOTSPOTS, MODALS } from './content.js';
import { initScreen } from './screen.js';

const SIZE = 10;
const H = SIZE / 2;
const BASE_FOV = 75;
const ZOOM_FOV = 50;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 0); // centro de la habitación
camera.rotation.order = 'YXZ';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- Habitación ----------
const manager = new THREE.LoadingManager(() => document.getElementById('loader').classList.add('done'));
const loader = new THREE.TextureLoader(manager);
const tex = (file) => {
  const t = loader.load(`/img/${file}.jpg`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
};

// yaw: ángulo de la cámara para mirar cada pared
const walls = {
  frontal:   { pos: [0, 0, -H], rotY: 0,            yaw: 0 },
  izquierda: { pos: [-H, 0, 0], rotY: Math.PI / 2,  yaw: Math.PI / 2 },
  derecha:   { pos: [H, 0, 0],  rotY: -Math.PI / 2, yaw: -Math.PI / 2 },
  trasera:   { pos: [0, 0, H],  rotY: Math.PI,      yaw: Math.PI },
};

for (const [name, w] of Object.entries(walls)) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshBasicMaterial({ map: tex(name) })
  );
  mesh.position.set(...w.pos);
  mesh.rotation.y = w.rotY;
  scene.add(mesh);
  w.mesh = mesh;
}

const cap = (file, y, rotX) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ map: tex(file) }));
  m.position.y = y; m.rotation.x = rotX; scene.add(m);
};
cap('techo', H, Math.PI / 2);
cap('piso', -H, -Math.PI / 2);

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
  mesh.position.set(((u0 + u1) / 2 - 0.5) * SIZE, (0.5 - (v0 + v1) / 2) * SIZE, 0.02);
  walls[h.wall].mesh.add(mesh);
  mesh.updateWorldMatrix(true, false);
  h.mesh = mesh;
  h.size = { w, h: hh };
  h.center = mesh.getWorldPosition(new THREE.Vector3());
  mesh.userData.hotspot = h;
  hotspotMeshes.push(mesh);

  const pin = document.createElement('button');
  pin.className = 'pin';
  pin.id = `pin-${h.id}`;
  pin.setAttribute('aria-label', h.label);
  pin.innerHTML = `<i></i><span>${h.label}</span>`;
  pin.addEventListener('click', (e) => { e.stopPropagation(); activate(h); });
  pinsEl.appendChild(pin);
  h.pin = pin;
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hotspotMeshes, false)[0];
  return hit ? hit.object.userData.hotspot : null;
}

let hovered = null;
function setHover(h) {
  if (h === hovered) return;
  if (hovered) anime({ targets: hovered.mesh.material, opacity: 0, duration: 250, easing: 'linear' });
  hovered = h;
  if (h) anime({ targets: h.mesh.material, opacity: 0.2, duration: 250, easing: 'linear' });
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

function moveCamera({ pos = [0, 0, 0], yaw, pitch = 0, fov = BASE_FOV, duration = 1200, easing = 'easeInOutQuad', complete }) {
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
  panels.forEach((p) => {
    const active = p.dataset.wall === name;
    p.classList.toggle('visible', active);
    anime.remove(p);
    anime({
      targets: p,
      opacity: active ? 1 : 0,
      translateY: active ? ['-40%', '-50%'] : '-45%',
      duration: active ? 700 : 300,
      delay: active ? 900 : 0,
      easing: 'easeOutCubic',
    });
  });
  buttons.forEach((b) => b.classList.toggle('active', b.dataset.wall === name));
}

function mirarPared(name) {
  if (!walls[name]) return;
  closeModal(true);
  current = name;
  yawTarget = wrapNear(walls[name].yaw, camera.rotation.y);
  moveCamera({ yaw: yawTarget });
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

function activate(h) {
  if (locked) return;
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
  anime({ targets: screenEl, clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 900, easing: 'easeInOutCubic' });
  anime({
    targets: screenEl.querySelectorAll('.scr-titlebar, .scr-side, .scr-main, .scr-status'),
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
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  const h = activeHotspot;
  activeHotspot = null;
  document.body.classList.remove('zoomed');
  if (immediate) { locked = false; return; } // mirarPared se encarga de mover la cámara
  if (wasOpen || h) {
    yawTarget = wrapNear(walls[h ? h.wall : current].yaw, camera.rotation.y);
    moveCamera({ yaw: yawTarget, duration: 1000, easing: 'easeInOutCubic', complete: () => { locked = false; } });
  }
}

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modal.querySelector('.modal-close').addEventListener('click', () => closeModal());

// ---------- Entrada ----------
buttons.forEach((b) => b.addEventListener('click', () => mirarPared(b.dataset.wall)));

const order = ['frontal', 'derecha', 'trasera', 'izquierda']; // sentido horario
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeModal();
  if (locked) return;
  const i = order.indexOf(current);
  if (e.key === 'ArrowRight') mirarPared(order[(i + 1) % 4]);
  if (e.key === 'ArrowLeft') mirarPared(order[(i + 3) % 4]);
});

// Arrastrar para mirar un poco; un toque sin mover abre el hotspot
let dragging = false, moved = 0, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (locked) return;
  dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
  anime.remove(camera.rotation);
});
window.addEventListener('pointermove', (e) => {
  if (locked) return;
  if (!dragging) {
    if (e.target === canvas) setHover(pick(e.clientX, e.clientY));
    return;
  }
  moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
  camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y + (e.clientX - lx) * 0.003, yawTarget - 0.5, yawTarget + 0.5);
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + (e.clientY - ly) * 0.003, -0.35, 0.35);
  lx = e.clientX; ly = e.clientY;
});
window.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  if (moved < 6) {
    const h = pick(e.clientX, e.clientY);
    if (h) { activate(h); return; }
  }
  anime({ targets: camera.rotation, y: yawTarget, x: 0, duration: 700, easing: 'easeOutCubic' });
});

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
    v.copy(h.center).project(camera);
    const visible = show && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
    h.pin.style.opacity = visible ? 1 : 0;
    h.pin.style.pointerEvents = visible ? 'auto' : 'none';
    h.pin.style.transform = `translate(${(v.x + 1) / 2 * window.innerWidth}px, ${(1 - v.y) / 2 * window.innerHeight}px) translate(-50%, -50%)`;
  }
}

renderer.setAnimationLoop(() => {
  updatePins();
  renderer.render(scene, camera);
});
showPanel('frontal');
