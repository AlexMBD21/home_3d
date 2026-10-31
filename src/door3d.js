// door3d.js – Puerta 3D con molduras, paneles acanalados, herrajes, sombras y apertura animada
// ubicada en la pared trasera (walls.trasera.mesh) para la sección de Contacto.

import * as THREE from 'three';
import anime from 'animejs';

const WALL_SIZE = 10;

// Ruta de la imagen para el contenido interno del marco/pizarra de la pared trasera.
export const CHALKBOARD_CONTENT_IMAGE = '/img/cuadros/pizarra.jpg';

// Coordenadas UV del marco de la pizarra/cuadro en trasera.jpg (desplazado a la derecha para despejar el bolso)
const BOARD_BOUNDS = {
  u0: 0.590,
  v0: 0.284,
  u1: 0.986,
  v1: 0.612,
};

function uvWallToLocal(u, v) {
  return new THREE.Vector2((u - 0.5) * WALL_SIZE, (0.5 - v) * WALL_SIZE);
}

// Coordenadas UV base de la puerta (mapeadas desde el extremo izquierdo u = 0.000 hasta u = 0.282 para despejar el bolso)
const DOOR_BOUNDS = {
  u0: 0.038,
  v0: 0.232,
  u1: 0.339,
  v1: 1.000,
};

function uvToLocal(u, v) {
  // Desplaza la puerta hasta el borde izquierdo de la pared (u = 0.000..0.282) y hasta el suelo (v = 1.0 -> y = -5.0)
  const uShifted = ((u - DOOR_BOUNDS.u0) / (DOOR_BOUNDS.u1 - DOOR_BOUNDS.u0)) * 0.282;
  const vScaled = DOOR_BOUNDS.v0 + (v - DOOR_BOUNDS.v0) * ((1.0 - DOOR_BOUNDS.v0) / (0.893 - DOOR_BOUNDS.v0));
  return new THREE.Vector2((uShifted - 0.5) * WALL_SIZE, (0.5 - vScaled) * WALL_SIZE);
}

// Shader para sombras suaves proyectadas (pared, paneles hundidos, manija y chaqueta)
const softShadowShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec2 uSize;
    uniform float uBlur;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec2 p = (vUv - 0.5) * uSize;
      vec2 halfSize = (uSize * 0.5) - vec2(uBlur);
      vec2 d = abs(p) - halfSize;
      float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      float alpha = 1.0 - smoothstep(-uBlur * 0.3, uBlur, dist);
      gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * uOpacity);
    }
  `,
};

// Shader para sombra interior de los paneles rebajados de la puerta (efecto bisel CSS/3D)
const recessedPanelShadowShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float topShade = (1.0 - smoothstep(0.0, 0.09, 1.0 - vUv.y)) * 0.42;
      float leftShade = (1.0 - smoothstep(0.0, 0.08, vUv.x)) * 0.30;
      float rightLight = (1.0 - smoothstep(0.0, 0.06, 1.0 - vUv.x)) * 0.14;
      float botLight = (1.0 - smoothstep(0.0, 0.06, vUv.y)) * 0.16;

      float darkAlpha = clamp((topShade + leftShade) * uOpacity, 0.0, 0.55);
      float lightAlpha = clamp((rightLight + botLight) * uOpacity * 0.65, 0.0, 0.30);

      if (darkAlpha >= lightAlpha) {
        gl_FragColor = vec4(0.08, 0.06, 0.04, darkAlpha);
      } else {
        gl_FragColor = vec4(1.0, 0.98, 0.94, lightAlpha);
      }
    }
  `,
};

function createDropShadow(w, h, blur = 0.18, opacity = 0.46) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.ShaderMaterial({
    vertexShader: softShadowShader.vertexShader,
    fragmentShader: softShadowShader.fragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(w, h) },
      uBlur: { value: blur },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

// Genera textura sutil de veta de madera pintada en crema cálido estilo CSS
function createPaintedWoodTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, '#ebe3d5');
  grad.addColorStop(0.5, '#e5dccb');
  grad.addColorStop(1, '#ddd3c1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Vetas verticales muy suaves
  for (let i = 0; i < 140; i++) {
    const x = (i / 140) * c.width + Math.sin(i * 1.7) * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(160, 142, 118, 0.045)' : 'rgba(255, 252, 245, 0.05)';
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.cos(i) * 3, c.height);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDoor3D(theme = 'light') {
  const group = new THREE.Group();
  group.position.z = 0.002; // completamente al ras de la imagen trasera (walls.trasera.mesh)

  const tl = uvToLocal(DOOR_BOUNDS.u0, DOOR_BOUNDS.v0);
  const br = uvToLocal(DOOR_BOUNDS.u1, 0.893); // v = 0.893 se escala exactamente a y = -5.0 (al ras de la imagen piso)
  const totalW = br.x - tl.x;
  const totalH = tl.y - br.y;
  const centerX = (tl.x + br.x) / 2;
  const centerY = (tl.y + br.y) / 2;

  // Materiales con los mismos tonos blancos/marfil del marco de la ventana derecha (window3d.js)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ec,
    roughness: 0.42,
    metalness: 0.05,
  });
  const frameTrimMat = new THREE.MeshStandardMaterial({
    color: 0xcfc9bf,
    roughness: 0.55,
    metalness: 0.08,
  });
  const doorStileMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ec,
    emissive: new THREE.Color(0xffb85c),
    emissiveIntensity: 0,
    roughness: 0.42,
    metalness: 0.05,
  });
  const doorPanelMat = new THREE.MeshStandardMaterial({
    color: 0xe9e5de,
    emissive: new THREE.Color(0xffb85c),
    emissiveIntensity: 0,
    roughness: 0.48,
    metalness: 0.05,
  });
  const grooveMat = new THREE.MeshStandardMaterial({
    color: 0xcfc9bf,
    roughness: 0.55,
    metalness: 0.08,
  });
  const seamDarkMat = new THREE.MeshBasicMaterial({
    color: 0x2b241e,
  });
  const bronzeMetalMat = new THREE.MeshStandardMaterial({
    color: 0x2c2623,
    emissive: new THREE.Color(0xffb85c),
    emissiveIntensity: 0,
    roughness: 0.34,
    metalness: 0.78,
  });
  const copperRingMat = new THREE.MeshStandardMaterial({
    color: 0xc87d4b,
    roughness: 0.28,
    metalness: 0.82,
  });

  const highlightMats = [doorStileMat, doorPanelMat, bronzeMetalMat];
  const doorMeshes = [];

  // Luz direccional suave local para acentuar sutilmente las molduras de la puerta
  const doorDirLight = new THREE.DirectionalLight(0xfff4e0, 0.35);
  doorDirLight.position.set(centerX + 1.5, centerY + 2.0, 3.0);
  group.add(doorDirLight);
  doorDirLight.target.position.set(centerX, centerY, 0);
  group.add(doorDirLight.target);

  // --- 1. Sombra exterior muy sutil de la moldura sobre la pared ---
  const wallDropShadow = createDropShadow(totalW + 0.08, totalH + 0.06, 0.05, 0.14);
  wallDropShadow.position.set(centerX + 0.008, centerY, -0.001);
  group.add(wallDropShadow);

  // --- 2. Hueco interior (pasillo oscuro que solo se ve cuando la puerta se entreabre) ---
  const leafTL = uvToLocal(0.063, 0.258);
  const leafBR = uvToLocal(0.314, 0.893);
  const leafW = leafBR.x - leafTL.x;
  const leafH = leafTL.y - leafBR.y;
  const leafCX = (leafTL.x + leafBR.x) / 2;
  const leafCY = (leafTL.y + leafBR.y) / 2;

  const hallwayMat = new THREE.MeshBasicMaterial({ color: 0x241d17 });
  const hallwayBack = new THREE.Mesh(new THREE.PlaneGeometry(leafW + 0.02, leafH + 0.01), hallwayMat);
  hallwayBack.position.set(leafCX, leafCY, 0.001);
  group.add(hallwayBack);

  // --- 3. Marco exterior moldurado de bajo relieve (jambas izquierda/derecha y dintel superior) ---
  const frameDepth = 0.018;
  const outerTrimDepth = 0.006;

  function addFrameBarUV(u0, v0, u1, v1) {
    const p0 = uvToLocal(u0, v0);
    const p1 = uvToLocal(u1, v1);
    const w = p1.x - p0.x;
    const h = p0.y - p1.y;
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;

    const mainBar = new THREE.Mesh(new THREE.BoxGeometry(w, h, frameDepth), frameMat);
    mainBar.position.set(cx, cy, frameDepth / 2);
    group.add(mainBar);

    // Moldura escalonada exterior (relieve fino a lo largo de jambas y dintel)
    const isLeft = cx < centerX - 0.5;
    const isRight = cx > centerX + 0.5;
    const isTop = !isLeft && !isRight;
    const trimW = isTop ? w : w * 0.55;
    const trimH = isTop ? h * 0.55 : h;
    const trimBar = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimH, outerTrimDepth), frameTrimMat);
    const offsetX = isLeft ? -w * 0.20 : isRight ? w * 0.20 : 0;
    const offsetY = isTop ? h * 0.20 : 0;
    trimBar.position.set(cx + offsetX, cy + offsetY, frameDepth + outerTrimDepth / 2);
    group.add(trimBar);
  }

  // Jamba izquierda, jamba derecha y dintel superior del marco
  addFrameBarUV(0.038, 0.232, 0.063, 0.893);
  addFrameBarUV(0.314, 0.232, 0.339, 0.893);
  addFrameBarUV(0.038, 0.232, 0.339, 0.258);

  // Ranura oscura perimetral (holgura entre el marco y la hoja de la puerta)
  const seamFrame = new THREE.Mesh(new THREE.PlaneGeometry(leafW + 0.02, leafH + 0.015), seamDarkMat);
  seamFrame.position.set(leafCX, leafCY, 0.002);
  group.add(seamFrame);

  // --- 4. Hoja 3D de la puerta al ras del marco (con pivote en las bisagras izquierdas) ---
  const doorPivot = new THREE.Group();
  doorPivot.position.set(leafTL.x, leafCY, 0.004);
  group.add(doorPivot);

  const leafDepth = 0.014;

  // Helper para agregar piezas de la hoja en coordenadas UV relativas al pivote izquierdo
  function addLeafPartUV(u0, v0, u1, v1, zOffset, zThick, mat, cast = true) {
    const p0 = uvToLocal(u0, v0);
    const p1 = uvToLocal(u1, v1);
    const w = p1.x - p0.x;
    const h = p0.y - p1.y;
    const cx = (p0.x + p1.x) / 2 - leafTL.x;
    const cy = (p0.y + p1.y) / 2 - leafCY;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, zThick), mat);
    mesh.position.set(cx, cy, zOffset + zThick / 2);
    if (cast) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    doorPivot.add(mesh);
    doorMeshes.push(mesh);
    return { mesh, w, h, cx, cy };
  }

  // Fondo base de la hoja (paneles rebajados)
  addLeafPartUV(0.064, 0.259, 0.313, 0.893, 0, leafDepth * 0.62, doorPanelMat);

  // Montante vertical izquierdo y derecho (sobresalen en relieve respecto a los paneles centrales)
  addLeafPartUV(0.064, 0.259, 0.102, 0.893, 0, leafDepth, doorStileMat);
  addLeafPartUV(0.275, 0.259, 0.313, 0.893, 0, leafDepth, doorStileMat);

  // Travesaño superior, travesaño central y travesaño inferior (llega hasta el piso en v = 0.893 -> y = -5.0)
  addLeafPartUV(0.102, 0.259, 0.275, 0.296, 0, leafDepth, doorStileMat);
  addLeafPartUV(0.102, 0.604, 0.275, 0.642, 0, leafDepth, doorStileMat);
  addLeafPartUV(0.102, 0.848, 0.275, 0.893, 0, leafDepth, doorStileMat);

  // Función para construir los 2 paneles rebajados con moldura interior biselada y 4 tablones verticales acanalados
  const panelShadowUniforms = [];
  function buildRecessedPanel(u0, v0, u1, v1) {
    const p0 = uvToLocal(u0, v0);
    const p1 = uvToLocal(u1, v1);
    const pw = p1.x - p0.x;
    const ph = p0.y - p1.y;
    const pcx = (p0.x + p1.x) / 2 - leafTL.x;
    const pcy = (p0.y + p1.y) / 2 - leafCY;
    const panelSurfaceZ = leafDepth * 0.62;

    // Moldura perimetral biselada del panel
    const bevW = 0.042;
    const bevD = leafDepth * 0.22;
    const topBev = new THREE.Mesh(new THREE.BoxGeometry(pw, bevW, bevD), frameTrimMat);
    topBev.position.set(pcx, pcy + ph / 2 - bevW / 2, panelSurfaceZ + bevD / 2);
    doorPivot.add(topBev);

    const botBev = new THREE.Mesh(new THREE.BoxGeometry(pw, bevW, bevD), frameTrimMat);
    botBev.position.set(pcx, pcy - ph / 2 + bevW / 2, panelSurfaceZ + bevD / 2);
    doorPivot.add(botBev);

    const leftBev = new THREE.Mesh(new THREE.BoxGeometry(bevW, ph - bevW * 2, bevD), frameTrimMat);
    leftBev.position.set(pcx - pw / 2 + bevW / 2, pcy, panelSurfaceZ + bevD / 2);
    doorPivot.add(leftBev);

    const rightBev = new THREE.Mesh(new THREE.BoxGeometry(bevW, ph - bevW * 2, bevD), frameTrimMat);
    rightBev.position.set(pcx + pw / 2 - bevW / 2, pcy, panelSurfaceZ + bevD / 2);
    doorPivot.add(rightBev);

    // 3 ranuras verticales (dividen el panel en 4 tablones verticales iguales como en la imagen)
    const innerW = pw - bevW * 2;
    const innerH = ph - bevW * 2;
    for (let i = 1; i <= 3; i++) {
      const gx = pcx - innerW / 2 + (innerW / 4) * i;
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.012, innerH, 0.004), grooveMat);
      groove.position.set(gx, pcy, panelSurfaceZ + 0.001);
      doorPivot.add(groove);
    }

    // Sombra interior suave de oclusión + bisel sobre el panel
    const u = { uOpacity: { value: 0.26 } };
    panelShadowUniforms.push(u);
    const pShadowMat = new THREE.ShaderMaterial({
      vertexShader: recessedPanelShadowShader.vertexShader,
      fragmentShader: recessedPanelShadowShader.fragmentShader,
      uniforms: u,
      transparent: true,
      depthWrite: false,
    });
    const pShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), pShadowMat);
    pShadowMesh.position.set(pcx, pcy, panelSurfaceZ + 0.003);
    doorPivot.add(pShadowMesh);
  }

  // Panel superior y panel inferior
  buildRecessedPanel(0.102, 0.296, 0.275, 0.604);
  buildRecessedPanel(0.102, 0.642, 0.275, 0.848);

  // --- 5. Bisagras metálicas izquierdas (2 cilindros finos en bronce oscuro) ---
  for (const hv of [0.342, 0.808]) {
    const hp = uvToLocal(0.064, hv);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.20, 12), bronzeMetalMat);
    hinge.position.set(0, hp.y - leafCY, leafDepth + 0.004);
    doorPivot.add(hinge);
  }

  // --- 6. Manija 3D en bronce oscuro, cerradura y llavero colgante ---
  {
    const handlePos = uvToLocal(0.294, 0.580);
    const hx = handlePos.x - leafTL.x;
    const hy = handlePos.y - leafCY;
    const hz = leafDepth;

    // Sombra muy suave proyectada por la manija sobre la puerta
    const hShadow = createDropShadow(0.36, 0.12, 0.04, 0.16);
    hShadow.position.set(hx - 0.10, hy - 0.02, hz + 0.002);
    doorPivot.add(hShadow);

    // Roseta circular de la manija
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.010, 24), bronzeMetalMat);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(hx, hy, hz + 0.005);
    doorPivot.add(rosette);
    doorMeshes.push(rosette);

    // Cuello de la manija
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.032, 16), bronzeMetalMat);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(hx, hy, hz + 0.020);
    doorPivot.add(neck);
    doorMeshes.push(neck);

    // Palanca horizontal apuntando hacia la izquierda
    const leverLen = 0.27;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(leverLen, 0.036, 0.020), bronzeMetalMat);
    lever.position.set(hx - leverLen / 2 + 0.018, hy, hz + 0.036);
    doorPivot.add(lever);
    doorMeshes.push(lever);

    // Bocallave / cilindro inferior con llavero colgante
    const lockPos = uvToLocal(0.294, 0.606);
    const lx = lockPos.x - leafTL.x;
    const ly = lockPos.y - leafCY;

    const lockEscutcheon = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.008, 24), bronzeMetalMat);
    lockEscutcheon.rotation.x = Math.PI / 2;
    lockEscutcheon.position.set(lx, ly, hz + 0.004);
    doorPivot.add(lockEscutcheon);

    // Argolla metálica cobriza del llavero
    const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.005, 10, 24), copperRingMat);
    keyRing.position.set(lx - 0.006, ly - 0.052, hz + 0.010);
    doorPivot.add(keyRing);

    // Llavero oscuro colgante con sombra sutil
    const fobShadow = createDropShadow(0.08, 0.15, 0.025, 0.15);
    fobShadow.position.set(lx - 0.004, ly - 0.135, hz + 0.002);
    doorPivot.add(fobShadow);

    const keyFob = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.115, 0.010), bronzeMetalMat);
    keyFob.position.set(lx - 0.008, ly - 0.140, hz + 0.010);
    doorPivot.add(keyFob);
  }

  // --- 7. Marco 3D de madera para la pizarra / cuadro derecho (u: 0.558..0.954, v: 0.284..0.612) ---
  const boardMeshes = [];
  const boardHighlightMats = [];
  let boardCanvasMat = null;

  function createWalnutWoodTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#845f43');
    grad.addColorStop(0.5, '#765339');
    grad.addColorStop(1, '#684730');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    // Vetas de madera natural
    for (let i = 0; i < 160; i++) {
      const pos = (i / 160) * c.height;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(42, 26, 14, 0.14)' : 'rgba(168, 126, 92, 0.10)';
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, pos + Math.sin(i * 1.3) * 4);
      ctx.lineTo(c.width, pos + Math.cos(i * 1.1) * 4);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createChalkboardSlateTexture() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 840;
    const ctx = c.getContext('2d');

    // Fondo pizarra gris carbón mate con sutil variación de tiza
    const rad = ctx.createRadialGradient(
      c.width * 0.5, c.height * 0.48, c.width * 0.08,
      c.width * 0.5, c.height * 0.5, c.width * 0.65
    );
    rad.addColorStop(0, '#323437');
    rad.addColorStop(0.65, '#292b2e');
    rad.addColorStop(1, '#212326');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, c.width, c.height);

    // Sutiles nubes de polvo de tiza difuminado
    for (let i = 0; i < 45; i++) {
      const x = ((i * 173) % c.width);
      const y = ((i * 229) % c.height);
      const r = 60 + (i % 5) * 35;
      const g = ctx.createRadialGradient(x, y, 5, x, y, r);
      g.addColorStop(0, 'rgba(255, 250, 240, 0.018)');
      g.addColorStop(1, 'rgba(255, 250, 240, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Sombra interior proyectada por el marco de madera sobre la pizarra
  const innerBoardShadowShader = {
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float topAO = (1.0 - smoothstep(0.0, 0.055, 1.0 - vUv.y)) * 0.42;
        float botAO = (1.0 - smoothstep(0.0, 0.04, vUv.y)) * 0.22;
        float leftAO = (1.0 - smoothstep(0.0, 0.045, vUv.x)) * 0.30;
        float rightAO = (1.0 - smoothstep(0.0, 0.045, 1.0 - vUv.x)) * 0.26;
        float alpha = clamp(topAO + botAO + leftAO + rightAO, 0.0, 0.58);
        gl_FragColor = vec4(0.02, 0.02, 0.02, alpha);
      }
    `,
  };

  {
    const bTL = uvWallToLocal(BOARD_BOUNDS.u0, BOARD_BOUNDS.v0);
    const bBR = uvWallToLocal(BOARD_BOUNDS.u1, BOARD_BOUNDS.v1);
    const bw = bBR.x - bTL.x; // 3.96 unidades
    const bh = bTL.y - bBR.y; // 3.28 unidades
    const bcx = (bTL.x + bBR.x) / 2;
    const bcy = (bTL.y + bBR.y) / 2;

    const boardGroup = new THREE.Group();
    boardGroup.position.set(bcx, bcy, 0.004);
    group.add(boardGroup);

    // Sombra suave detrás del marco sobre la pared trasera
    const boardDropShadow = createDropShadow(bw + 0.18, bh + 0.18, 0.09, 0.28);
    boardDropShadow.position.set(0.012, -0.022, -0.003);
    boardGroup.add(boardDropShadow);

    const walnutTex = createWalnutWoodTexture();
    const boardWoodMat = new THREE.MeshStandardMaterial({
      map: walnutTex,
      color: 0xffffff,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.48,
      metalness: 0.05,
    });
    const boardInnerLipMat = new THREE.MeshStandardMaterial({
      color: 0x4a3322,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.55,
      metalness: 0.04,
    });
    boardHighlightMats.push(boardWoodMat, boardInnerLipMat);

    const borderW = 0.115; // ancho del listón de madera del marco
    const frameD = 0.048;  // profundidad 3D hacia afuera de la pared
    const innerW = bw - borderW * 2; // 3.73 unidades
    const innerH = bh - borderW * 2; // 3.05 unidades

    // Cuatro listones 3D del marco de madera
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(bw, borderW, frameD), boardWoodMat);
    topBar.position.set(0, bh / 2 - borderW / 2, frameD / 2);
    boardGroup.add(topBar);

    const botBarD = frameD + 0.026; // el listón inferior sobresale ligeramente como repisa porta-tiza
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(bw, borderW, botBarD), boardWoodMat);
    botBar.position.set(0, -bh / 2 + borderW / 2, botBarD / 2);
    boardGroup.add(botBar);

    const sideH = bh - borderW * 2;
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(borderW, sideH, frameD), boardWoodMat);
    leftBar.position.set(-bw / 2 + borderW / 2, 0, frameD / 2);
    boardGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(borderW, sideH, frameD), boardWoodMat);
    rightBar.position.set(bw / 2 - borderW / 2, 0, frameD / 2);
    boardGroup.add(rightBar);

    // Bisel interior oscuro de madera que enmarca el lienzo de pizarra
    const lipT = 0.016;
    const lipD = frameD * 0.76;
    const lipTop = new THREE.Mesh(new THREE.BoxGeometry(innerW + lipT * 2, lipT, lipD), boardInnerLipMat);
    lipTop.position.set(0, innerH / 2 + lipT / 2, lipD / 2);
    boardGroup.add(lipTop);

    const lipBot = new THREE.Mesh(new THREE.BoxGeometry(innerW + lipT * 2, lipT, lipD), boardInnerLipMat);
    lipBot.position.set(0, -innerH / 2 - lipT / 2, lipD / 2);
    boardGroup.add(lipBot);

    const lipLeft = new THREE.Mesh(new THREE.BoxGeometry(lipT, innerH, lipD), boardInnerLipMat);
    lipLeft.position.set(-innerW / 2 - lipT / 2, 0, lipD / 2);
    boardGroup.add(lipLeft);

    const lipRight = new THREE.Mesh(new THREE.BoxGeometry(lipT, innerH, lipD), boardInnerLipMat);
    lipRight.position.set(innerW / 2 + lipT / 2, 0, lipD / 2);
    boardGroup.add(lipRight);

    // Uniones en inglete a 45° en las 4 esquinas del marco de madera
    const miterLen = borderW * Math.SQRT2;
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const miter = new THREE.Mesh(new THREE.BoxGeometry(0.008, miterLen, frameD + 0.002), boardInnerLipMat);
      miter.position.set(sx * (bw / 2 - borderW / 2), sy * (bh / 2 - borderW / 2), frameD / 2);
      miter.rotation.z = sx * sy * (Math.PI / 4);
      boardGroup.add(miter);
    }

    // Superficie interior de pizarra lista para recibir el contenido
    const slateTex = createChalkboardSlateTexture();
    boardCanvasMat = new THREE.MeshBasicMaterial({
      map: slateTex,
      color: 0xffffff,
    });
    const boardCanvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), boardCanvasMat);
    boardCanvasMesh.position.set(0, 0, 0.012);
    boardGroup.add(boardCanvasMesh);

    // Sombra interior proyectada por el marco sobre el borde del lienzo/pizarra
    const innerShadowMat = new THREE.ShaderMaterial({
      vertexShader: innerBoardShadowShader.vertexShader,
      fragmentShader: innerBoardShadowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    const innerShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), innerShadowMat);
    innerShadowMesh.position.set(0, 0, 0.016);
    boardGroup.add(innerShadowMesh);

    // Tiza blanca en 3D con sombras apoyada sobre el borde inferior izquierdo del marco de madera
    const chalkX = -innerW * 0.40;
    const chalkY = -innerH / 2;
    const chalkZ = frameD + 0.008;
    const chalkLen = 0.24;
    const chalkR = 0.017;

    // 1. Sombra proyectada por la tiza sobre la madera del listón inferior (horizontal)
    const chalkLedgeShadow = createDropShadow(chalkLen + 0.08, chalkR * 4.2, 0.022, 0.55);
    chalkLedgeShadow.rotation.x = -Math.PI / 2;
    chalkLedgeShadow.position.set(chalkX + 0.004, chalkY + 0.002, chalkZ);
    boardGroup.add(chalkLedgeShadow);

    // 2. Sombra suave proyectada por la tiza contra la base de la pizarra (vertical)
    const chalkBoardShadow = createDropShadow(chalkLen + 0.09, chalkR * 4.0, 0.025, 0.52);
    chalkBoardShadow.position.set(chalkX + 0.005, chalkY + chalkR * 0.65, 0.018);
    boardGroup.add(chalkBoardShadow);

    // 3. Sombra frontal sutil en el borde del listón bajo la tiza
    const chalkFrontLipShadow = createDropShadow(chalkLen + 0.06, 0.045, 0.018, 0.35);
    chalkFrontLipShadow.position.set(chalkX + 0.004, chalkY - 0.012, botBarD + 0.002);
    boardGroup.add(chalkFrontLipShadow);

    // 4. Cuerpo cilíndrico 3D de la tiza blanca con sombreado volumétrico propio
    const chalkGroup = new THREE.Group();
    chalkGroup.position.set(chalkX, chalkY + chalkR * 0.92, chalkZ);
    chalkGroup.rotation.y = 0.07; // ligera inclinación natural sobre la repisa
    boardGroup.add(chalkGroup);

    const chalkWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf7f5f0,
      emissive: new THREE.Color(0xdcd9d0),
      emissiveIntensity: 0.22,
      roughness: 0.86,
      metalness: 0.02,
    });
    const chalkTipMat = new THREE.MeshStandardMaterial({
      color: 0xebe8e0,
      emissive: new THREE.Color(0xcfcac0),
      emissiveIntensity: 0.18,
      roughness: 0.92,
      metalness: 0.01,
    });

    // Barra principal de tiza (ligeramente cónica como las tizas clásicas)
    const chalkBodyGeo = new THREE.CylinderGeometry(chalkR * 0.88, chalkR, chalkLen, 20);
    chalkBodyGeo.rotateZ(Math.PI / 2);
    const chalkBody = new THREE.Mesh(chalkBodyGeo, chalkWhiteMat);
    chalkBody.castShadow = true;
    chalkBody.receiveShadow = true;
    chalkGroup.add(chalkBody);

    // Punta desgastada redondeada en el extremo derecho de la tiza
    const chalkTipGeo = new THREE.SphereGeometry(chalkR * 0.88, 16, 12);
    chalkTipGeo.scale(1.25, 0.96, 0.96);
    const chalkTip = new THREE.Mesh(chalkTipGeo, chalkTipMat);
    chalkTip.position.x = chalkLen / 2;
    chalkGroup.add(chalkTip);

    // Tapa plana biselada en el extremo izquierdo
    const chalkEndCap = new THREE.Mesh(new THREE.CylinderGeometry(chalkR * 0.96, chalkR, 0.006, 20), chalkTipMat);
    chalkEndCap.rotation.z = Math.PI / 2;
    chalkEndCap.position.x = -chalkLen / 2 - 0.002;
    chalkGroup.add(chalkEndCap);

    boardGroup.traverse((child) => {
      if (child.isMesh) boardMeshes.push(child);
    });
  }

  // ============================================================================
  // --- 7. Perchero 3D de pared con 3 ganchos dobles (sin el bolso) ---
  // ============================================================================
  {
    const RACK_BOUNDS = {
      u0: 0.312,
      v0: 0.368,
      u1: 0.556,
      v1: 0.408,
    };
    const rTL = uvWallToLocal(RACK_BOUNDS.u0, RACK_BOUNDS.v0);
    const rBR = uvWallToLocal(RACK_BOUNDS.u1, RACK_BOUNDS.v1);
    const rw = rBR.x - rTL.x; // ~2.44 unidades
    const rh = rTL.y - rBR.y; // ~0.40 unidades
    const rcx = (rTL.x + rBR.x) / 2;
    const rcy = (rTL.y + rBR.y) / 2;

    const rackGroup = new THREE.Group();
    rackGroup.position.set(rcx, rcy, 0.004);
    group.add(rackGroup);

    // Sombra suave proyectada por la barra del perchero sobre la pared trasera
    const rackWallShadow = createDropShadow(rw + 0.14, rh + 0.14, 0.055, 0.34);
    rackWallShadow.position.set(0.010, -0.022, -0.002);
    rackGroup.add(rackWallShadow);

    // Textura de madera oscura / nogal espresso para la tabla del perchero
    function createRackWoodTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, '#635146');
      g.addColorStop(0.5, '#55453b');
      g.addColorStop(1, '#43352d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);

      for (let i = 0; i < 65; i++) {
        const y = (i / 65) * c.height;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(28, 20, 15, 0.16)' : 'rgba(255, 235, 215, 0.04)';
        ctx.lineWidth = 1 + (i % 2);
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(i) * 2);
        ctx.lineTo(c.width, y + Math.cos(i) * 2);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const rackWoodMat = new THREE.MeshStandardMaterial({
      map: createRackWoodTexture(),
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.08,
    });
    const rackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x3b2e26,
      roughness: 0.58,
      metalness: 0.10,
    });
    const hookIronMat = new THREE.MeshStandardMaterial({
      color: 0x241f1d,
      roughness: 0.34,
      metalness: 0.78,
    });

    const railD = 0.034;
    // Placa trasera biselada
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, railD * 0.65), rackTrimMat);
    backPlate.position.set(0, 0, (railD * 0.65) / 2);
    rackGroup.add(backPlate);

    // Frente biselado de la tabla del perchero
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.045, rh - 0.045, railD * 0.45), rackWoodMat);
    frontPlate.position.set(0, 0, railD * 0.65 + (railD * 0.45) / 2);
    rackGroup.add(frontPlate);

    // 3 ganchos dobles en 3D (izquierdo, central y derecho)
    const hookXPositions = [-rw * 0.39, 0.0, rw * 0.39];

    for (const hx of hookXPositions) {
      const hookUnit = new THREE.Group();
      hookUnit.position.set(hx, 0, railD);
      rackGroup.add(hookUnit);

      // Sombra proyectada por la base del gancho sobre la madera y por el brazo superior sobre la pared
      const baseShadow = createDropShadow(0.19, 0.30, 0.035, 0.42);
      baseShadow.position.set(0.008, -0.012, 0.002);
      hookUnit.add(baseShadow);

      const upperArmWallShadow = createDropShadow(0.095, 0.42, 0.028, 0.32);
      upperArmWallShadow.position.set(0.018, 0.30, -railD + 0.001);
      hookUnit.add(upperArmWallShadow);

      // Escudo / placa base ovalada vertical fijada a la tabla
      const plateGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.018, 24);
      plateGeo.rotateX(Math.PI / 2);
      plateGeo.scale(0.95, 1.75, 1.0);
      const plateMesh = new THREE.Mesh(plateGeo, hookIronMat);
      plateMesh.position.set(0, -0.01, 0.009);
      hookUnit.add(plateMesh);

      // Dos tornillos de fijación (arriba y abajo del escudo)
      for (const sy of [0.068, -0.082]) {
        const screw = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), hookIronMat);
        screw.scale.set(1, 1, 0.55);
        screw.position.set(0, sy, 0.018);
        hookUnit.add(screw);
      }

      // Gancho inferior corto curvo
      const lowerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.025, 0.014),
        new THREE.Vector3(0, -0.052, 0.065),
        new THREE.Vector3(0, -0.030, 0.105),
        new THREE.Vector3(0, 0.012, 0.115),
      ]);
      const lowerTube = new THREE.Mesh(new THREE.TubeGeometry(lowerCurve, 16, 0.014, 12, false), hookIronMat);
      hookUnit.add(lowerTube);

      const lowerTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), hookIronMat);
      lowerTip.position.set(0, 0.015, 0.115);
      hookUnit.add(lowerTip);

      // Brazo superior largo del perchero (sobresale por encima de la tabla como en trasera.jpg)
      const upperCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.015, 0.016),
        new THREE.Vector3(0, 0.12, 0.070),
        new THREE.Vector3(0, 0.30, 0.102),
        new THREE.Vector3(0, 0.49, 0.118),
      ]);
      const upperTube = new THREE.Mesh(new THREE.TubeGeometry(upperCurve, 22, 0.016, 14, false), hookIronMat);
      hookUnit.add(upperTube);

      // Punta superior redondeada/ensanchada característica del gancho
      const upperTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 12), hookIronMat);
      upperTip.scale.set(0.82, 1.38, 1.12);
      upperTip.position.set(0, 0.505, 0.120);
      hookUnit.add(upperTip);
    }
  }

  // ============================================================================
  // --- 8. Interruptor de luz 3D al lado derecho de la puerta (controla la lámpara del techo) ---
  // ============================================================================
  const switchMeshes = [];
  const switchHighlightMats = [];
  const switchState = { on: true };
  let rockerPivot = null;
  let switchLedMat = null;

  {
    const swPos = uvWallToLocal(0.336, 0.598);
    const swW = 0.24;
    const swH = 0.35;
    const swD = 0.020;

    const switchGroup = new THREE.Group();
    switchGroup.position.set(swPos.x, swPos.y, 0.003);
    group.add(switchGroup);

    // Sombra suave proyectada por la placa del interruptor sobre la pared
    const swDropShadow = createDropShadow(swW + 0.07, swH + 0.07, 0.028, 0.28);
    swDropShadow.position.set(0.005, -0.008, -0.002);
    switchGroup.add(swDropShadow);

    const switchPlateMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ec,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.36,
      metalness: 0.05,
    });
    const switchTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd8d2c7,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.44,
      metalness: 0.06,
    });
    const switchRockerMat = new THREE.MeshStandardMaterial({
      color: 0xebe6de,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.32,
      metalness: 0.06,
    });
    switchLedMat = new THREE.MeshBasicMaterial({
      color: 0x2ecc71, // verde cuando la luz está encendida
    });
    switchHighlightMats.push(switchPlateMat, switchTrimMat, switchRockerMat);

    // 1. Placa base biselada contra la pared
    const backBevel = new THREE.Mesh(new THREE.BoxGeometry(swW, swH, swD * 0.55), switchTrimMat);
    backBevel.position.set(0, 0, (swD * 0.55) / 2);
    switchGroup.add(backBevel);

    // 2. Placa frontal principal del interruptor
    const facePlate = new THREE.Mesh(
      new THREE.BoxGeometry(swW - 0.024, swH - 0.024, swD * 0.45),
      switchPlateMat
    );
    facePlate.position.set(0, 0, swD * 0.55 + (swD * 0.45) / 2);
    switchGroup.add(facePlate);

    // 3. Marco interior rebajado oscuro alrededor de la tecla basculante
    const rockW = swW * 0.48;
    const rockH = swH * 0.54;
    const recessGap = new THREE.Mesh(
      new THREE.PlaneGeometry(rockW + 0.018, rockH + 0.018),
      seamDarkMat
    );
    recessGap.position.set(0, 0, swD + 0.001);
    switchGroup.add(recessGap);

    // 4. Pivote 3D de la tecla basculante (se inclina al encender/apagar)
    rockerPivot = new THREE.Group();
    rockerPivot.position.set(0, 0, swD + 0.002);
    rockerPivot.rotation.x = 0.14; // encendida por defecto
    switchGroup.add(rockerPivot);

    const rockerD = 0.018;
    const rockerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(rockW, rockH, rockerD),
      switchRockerMat
    );
    rockerMesh.position.set(0, 0, rockerD / 2);
    rockerPivot.add(rockerMesh);

    // Pequeño indicador LED horizontal en la tecla del interruptor
    const ledBar = new THREE.Mesh(
      new THREE.BoxGeometry(rockW * 0.42, 0.010, 0.003),
      switchLedMat
    );
    ledBar.position.set(0, -rockH * 0.26, rockerD + 0.001);
    rockerPivot.add(ledBar);

    switchGroup.traverse((child) => {
      if (child.isMesh) switchMeshes.push(child);
    });
  }

  function setSwitchHover(hovered) {
    for (const mat of switchHighlightMats) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.24 : 0,
        duration: 200,
        easing: 'linear',
      });
    }
  }

  function setSwitchState(on, immediate = false) {
    switchState.on = Boolean(on);
    if (switchLedMat) {
      // Verde cuando la luz está encendida y rojo cuando está apagada
      switchLedMat.color.setHex(switchState.on ? 0x2ecc71 : 0xff3b30);
    }
    if (!rockerPivot) return;
    const targetRotX = switchState.on ? 0.14 : -0.14;
    anime.remove(rockerPivot.rotation);
    if (immediate) {
      rockerPivot.rotation.x = targetRotX;
      return;
    }
    anime({
      targets: rockerPivot.rotation,
      x: targetRotX,
      duration: 220,
      easing: 'easeOutBack',
    });
  }

  const texLoader = new THREE.TextureLoader();
  function setBoardContent(source = CHALKBOARD_CONTENT_IMAGE) {
    if (!source || !boardCanvasMat) return;
    if (source.isTexture) {
      boardCanvasMat.map = source;
      boardCanvasMat.needsUpdate = true;
      return;
    }
    if (typeof source === 'string') {
      texLoader.load(encodeURI(source), (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        boardCanvasMat.map = tex;
        boardCanvasMat.needsUpdate = true;
      });
    }
  }
  setBoardContent(CHALKBOARD_CONTENT_IMAGE);

  function setBoardHover(hovered) {
    for (const mat of boardHighlightMats) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.25 : 0,
        duration: 240,
        easing: 'linear',
      });
    }
  }

  // --- Interacción: hover y apertura suave de la puerta en 3D ---
  const doorState = { open: false };

  function setDoorHover(hovered) {
    for (const mat of highlightMats) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.18 : 0,
        duration: 240,
        easing: 'linear',
      });
    }
  }

  function setDoorOpen(open) {
    doorState.open = open;
    anime.remove(doorPivot.rotation);
    anime({
      targets: doorPivot.rotation,
      y: open ? -0.42 : 0,
      duration: 850,
      easing: 'easeInOutCubic',
    });
  }

  let currentTheme = theme;
  let currentCurtainOpen = 1.0;
  let currentCeilingPower = 1.0;

  function syncDoorLighting() {
    const isDark = currentTheme === 'dark';
    const roomFactor = isDark
      ? (0.24 + 0.32 * currentCurtainOpen + 0.44 * currentCeilingPower)
      : (0.20 + 0.48 * currentCurtainOpen + 0.32 * currentCeilingPower);

    frameMat.color.setHex(0xf4f1ec);
    frameTrimMat.color.setHex(0xcfc9bf);
    doorStileMat.color.setHex(0xf4f1ec);
    doorPanelMat.color.setHex(0xe9e5de);
    doorDirLight.intensity = (isDark ? 0.45 : 0.75) * roomFactor;
    doorDirLight.color.setHex(isDark ? 0xc8daff : 0xfff6ea);
    for (const u of panelShadowUniforms) {
      u.uOpacity.value = isDark ? 0.34 : 0.24;
    }
    if (boardCanvasMat) {
      boardCanvasMat.color.setHex(isDark ? 0xc8c4be : 0xffffff).multiplyScalar(roomFactor);
    }
  }

  function setRoomLighting({ curtainOpen, ceilingPower }) {
    if (curtainOpen !== undefined) currentCurtainOpen = curtainOpen;
    if (ceilingPower !== undefined) currentCeilingPower = ceilingPower;
    syncDoorLighting();
  }

  function setTheme(newTheme) {
    currentTheme = newTheme;
    syncDoorLighting();
  }
  setTheme(theme);

  return {
    group,
    doorMeshes,
    boardMeshes,
    switchMeshes,
    doorState,
    setDoorHover,
    setBoardHover,
    setSwitchHover,
    setSwitchState,
    setBoardContent,
    setDoorOpen,
    setRoomLighting,
    setTheme,
  };
}
