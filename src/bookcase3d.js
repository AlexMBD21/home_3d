// bookcase3d.js – Mueble librero 3D con sombras y objetos en la pared izquierda (Habilidades).
// Ubicado con coordenadas UV exactas sobre walls.izquierda.mesh.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import anime from 'animejs';
import { getStorageUrl } from './supabase.js';

const WALL_SIZE = 10;
const LOCAL_MUSIC_URL = '/music/Harry Styles - Sign of the Times (Official Video).mp3';
const MUSIC_URL = getStorageUrl('mp3/Harry Styles - Sign of the Times (Official Video).mp3');
const LOCAL_LIGHTHOUSE_URL = '/img/3d/faro.glb';
const LIGHTHOUSE_URL = getStorageUrl('3d/faro.glb');

// Rutas de las 3 pinturas para los cuadros superiores desde Supabase Storage.
export const FRAME_PAINTINGS = [
  getStorageUrl('cuadros/cuadro_1.jpg'), // Cuadro 1 (Izquierda)
  getStorageUrl('cuadros/cuadro_2.jpg'), // Cuadro 2 (Centro)
  getStorageUrl('cuadros/cuadro_3.jpg'), // Cuadro 3 (Derecha)
];

// Coordenadas UV exactas medidas de izquierda.jpg
const BOUNDS = {
  u0: 0.2124,
  v0: 0.5078,
  u1: 0.7866,
  v1: 0.9380,
};

function uvToLocal(u, v) {
  // Ajusta verticalmente para que la base del mueble (v = 0.9380) apoye exactamente en el suelo 3D (y = -5.0, v = 1.0)
  const vGrounded = 1.0 - (BOUNDS.v1 - v) * 1.075;
  return new THREE.Vector2((u - 0.5) * WALL_SIZE, (0.5 - vGrounded) * WALL_SIZE);
}

// Shader para sombras suaves proyectadas en la pared, el piso y el interior de los nichos
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

// Sombra interior en degradado vertical (oclusión bajo cada repisa del mueble)
const innerCavityShadowShader = {
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
      // Sombra más intensa arriba (bajo la tabla superior) y en los bordes laterales del nicho
      float topShade = pow(vUv.y, 1.6) * 0.65;
      float sideAO = (1.0 - smoothstep(0.0, 0.12, vUv.x)) * 0.35
                   + (1.0 - smoothstep(0.0, 0.12, 1.0 - vUv.x)) * 0.35;
      float bottomAO = (1.0 - smoothstep(0.0, 0.08, vUv.y)) * 0.28;
      float alpha = clamp((topShade + sideAO + bottomAO) * uOpacity, 0.0, 0.78);
      gl_FragColor = vec4(0.04, 0.02, 0.01, alpha);
    }
  `,
};

function createDropShadow(w, h, blur = 0.22, opacity = 0.48) {
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

export function createBookcase3D(theme = 'light') {
  const group = new THREE.Group();
  group.position.z = 0.015; // pegado a la pared izquierda

  const tl = uvToLocal(BOUNDS.u0, BOUNDS.v0);
  const br = uvToLocal(BOUNDS.u1, BOUNDS.v1);
  const totalW = br.x - tl.x; // ~5.742
  const totalH = tl.y - br.y; // ~4.302
  const centerX = (tl.x + br.x) / 2;
  const centerY = (tl.y + br.y) / 2;

  const depth = 0.56; // profundidad 3D del mueble hacia el interior de la habitación (+Z local)

  // --- Iluminación local para resaltar el volumen 3D y las sombras del mueble ---
  const topLampLight = new THREE.PointLight(0xffe2a8, 0.95, 4.5, 1.5);
  const lampPos = uvToLocal(0.668, 0.472);
  topLampLight.position.set(lampPos.x, lampPos.y + 0.05, depth + 0.25);
  group.add(topLampLight);

  const frontFillLight = new THREE.DirectionalLight(0xfff5e4, 0.55);
  frontFillLight.position.set(0.5, 2.5, 3.5);
  group.add(frontFillLight);
  group.add(frontFillLight.target);

  // --- Materiales 3D de madera roble cálido con variación de tono ---
  const woodMainMat = new THREE.MeshStandardMaterial({
    color: 0xb58354,
    roughness: 0.48,
    metalness: 0.05,
  });
  const woodEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xc49262,
    roughness: 0.42,
    metalness: 0.06,
  });
  const woodBackMat = new THREE.MeshStandardMaterial({
    color: 0x91633b,
    roughness: 0.58,
    metalness: 0.04,
  });
  const woodGrooveMat = new THREE.MeshStandardMaterial({
    color: 0x734c2b,
    roughness: 0.65,
    metalness: 0.04,
  });

  // --- 1. Sombras exteriores (sobre la pared detrás del mueble y sobre el piso 3D) ---
  const wallShadow = createDropShadow(totalW + 0.5, totalH + 0.15, 0.24, 0.48);
  wallShadow.position.set(centerX + 0.03, centerY + 0.08, -0.008);
  group.add(wallShadow);

  const floorBaseShadow = createDropShadow(totalW + 0.35, depth + 0.35, 0.22, 0.55);
  floorBaseShadow.rotation.x = -Math.PI / 2;
  floorBaseShadow.position.set(centerX, br.y + 0.01, depth / 2 + 0.04);
  group.add(floorBaseShadow);

  // Helper para crear tablas 3D con bisel frontal iluminado a partir de rectángulos UV
  function addPlankUV(u0, v0, u1, v1, zStart, zDepth, mat = woodMainMat, withFrontLip = true) {
    const pTL = uvToLocal(u0, v0);
    const pBR = uvToLocal(u1, v1);
    const w = pBR.x - pTL.x;
    const h = pTL.y - pBR.y;
    const cx = (pTL.x + pBR.x) / 2;
    const cy = (pTL.y + pBR.y) / 2;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, zDepth), mat);
    mesh.position.set(cx, cy, zStart + zDepth / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (withFrontLip) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.022), woodEdgeMat);
      lip.position.set(cx, cy, zStart + zDepth + 0.01);
      group.add(lip);
    }
    return { mesh, w, h, cx, cy };
  }

  // --- 2. Fondo de madera 3D con tablones verticales acanalados ---
  const backW = totalW - 0.16;
  const backH = totalH - 0.16;
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(backW, backH, 0.03), woodBackMat);
  backPanel.position.set(centerX, centerY, 0.015);
  group.add(backPanel);

  // Líneas verticales de unión entre tablones del fondo de madera
  const numSlats = 14;
  for (let i = 1; i < numSlats; i++) {
    const sx = tl.x + 0.08 + (backW / numSlats) * i;
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.012, backH, 0.034), woodGrooveMat);
    groove.position.set(sx, centerY, 0.017);
    group.add(groove);
  }

  // --- 3. Estructura principal 3D del mueble (costados, cubierta, repisas, divisor central y zócalo) ---
  // Costado izquierdo y derecho
  addPlankUV(0.2124, 0.5180, 0.2225, 0.9380, 0, depth);
  addPlankUV(0.7765, 0.5180, 0.7866, 0.9380, 0, depth);

  // Cubierta superior (sobresale ligeramente en los bordes y al frente)
  const topPlank = addPlankUV(0.2105, 0.5078, 0.7885, 0.5188, 0, depth + 0.03);
  // Sombra proyectada inmediatamente debajo del voladizo de la cubierta superior
  const topOverhangShadow = createDropShadow(topPlank.w + 0.1, 0.18, 0.08, 0.45);
  topOverhangShadow.position.set(topPlank.cx, topPlank.cy - topPlank.h / 2 - 0.04, depth + 0.02);
  group.add(topOverhangShadow);

  // Primera repisa horizontal (debajo del tocadiscos)
  addPlankUV(0.2225, 0.6846, 0.7765, 0.6953, 0, depth - 0.01);

  // Segunda repisa horizontal (entre fila central e inferior)
  addPlankUV(0.2225, 0.8066, 0.7765, 0.8164, 0, depth - 0.01);

  // Base inferior y zócalo apoyado al ras del suelo (v = BOUNDS.v1)
  addPlankUV(0.2225, 0.9275, 0.7765, 0.9380, 0, depth);
  addPlankUV(0.2225, 0.9310, 0.7765, 0.9380, 0, depth - 0.04, woodBackMat, false);

  // Divisor vertical central (une la primera repisa con la base inferior)
  addPlankUV(0.4951, 0.6953, 0.5039, 0.8066, 0, depth - 0.015);
  addPlankUV(0.4951, 0.8164, 0.5039, 0.9275, 0, depth - 0.015);

  // --- 4. Sombras de oclusión ambiental dentro de los 5 compartimentos ---
  const cavityUniforms = [];
  function addCavityShadow(u0, v0, u1, v1) {
    const cTL = uvToLocal(u0, v0);
    const cBR = uvToLocal(u1, v1);
    const w = cBR.x - cTL.x;
    const h = cTL.y - cBR.y;
    const u = { uOpacity: { value: 0.68 } };
    cavityUniforms.push(u);

    const mat = new THREE.ShaderMaterial({
      vertexShader: innerCavityShadowShader.vertexShader,
      fragmentShader: innerCavityShadowShader.fragmentShader,
      uniforms: u,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set((cTL.x + cBR.x) / 2, (cTL.y + cBR.y) / 2, 0.036);
    group.add(mesh);

    // Sombra bajo el techo de cada nicho proyectada en la cara inferior de la tabla superior
    const underShelfShadow = createDropShadow(w + 0.04, depth, 0.14, 0.45);
    underShelfShadow.rotation.x = Math.PI / 2;
    underShelfShadow.position.set((cTL.x + cBR.x) / 2, cTL.y - 0.005, depth / 2);
    group.add(underShelfShadow);
  }

  // Nicho superior completo + 2 nichos centrales + 2 nichos inferiores
  addCavityShadow(0.2225, 0.5188, 0.7765, 0.6846);
  addCavityShadow(0.2225, 0.6953, 0.4951, 0.8066);
  addCavityShadow(0.5039, 0.6953, 0.7765, 0.8066);
  addCavityShadow(0.2225, 0.8164, 0.4951, 0.9275);
  addCavityShadow(0.5039, 0.8164, 0.7765, 0.9275);

  // --- 5. Objetos 3D dentro de los nichos y sobre la cubierta para relieve tridimensional ---
  const boxGreyMat = new THREE.MeshStandardMaterial({ color: 0x7b746e, roughness: 0.65, metalness: 0.05 });
  const boxLidMat = new THREE.MeshStandardMaterial({ color: 0x888079, roughness: 0.6, metalness: 0.05 });
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c5, roughness: 0.5, metalness: 0.02 });
  const darkHoleMat = new THREE.MeshBasicMaterial({ color: 0x151312 });

  // Helper para crear las cajas organizadoras grises 3D (CORD, GAMES, VINYL)
  function addStorageBox(u0, v0, u1, v1, hasHandle = true) {
    const bTL = uvToLocal(u0, v0);
    const bBR = uvToLocal(u1, v1);
    const w = bBR.x - bTL.x;
    const h = bTL.y - bBR.y;
    const cx = (bTL.x + bBR.x) / 2;
    const cy = (bTL.y + bBR.y) / 2;
    const boxD = depth * 0.82;

    const boxGroup = new THREE.Group();
    boxGroup.position.set(cx, cy, 0.04 + boxD / 2);
    group.add(boxGroup);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.86, boxD), boxGreyMat);
    body.position.y = -h * 0.07;
    boxGroup.add(body);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.025, h * 0.16, boxD + 0.025), boxLidMat);
    lid.position.y = h * 0.42;
    boxGroup.add(lid);

    // Etiqueta frontal blanca en relieve
    const tag = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, h * 0.20, 0.015), labelMat);
    tag.position.set(0, -h * 0.08, boxD / 2 + 0.008);
    boxGroup.add(tag);

    if (hasHandle) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, h * 0.11, 0.02), darkHoleMat);
      handle.position.set(0, h * 0.22, boxD / 2 + 0.006);
      boxGroup.add(handle);
    }
    return { cx, topY: bTL.y, w, boxD };
  }

  // Caja superior izquierda ("CORD"), caja media derecha ("GAMES"), y 2 cajas inferiores derechas ("VINYL")
  addStorageBox(0.228, 0.616, 0.332, 0.684, false);
  addStorageBox(0.672, 0.712, 0.772, 0.806, true);
  addStorageBox(0.514, 0.832, 0.612, 0.927, true);
  addStorageBox(0.672, 0.832, 0.772, 0.927, true);

  // Tocadiscos 3D interactivo con disco de vinilo giratorio, barras ecualizadoras de colores y música
  const turntableMeshes = [];
  const turntableHighlightMats = [];
  const eqBars = [];
  let vDiskSpinGroup = null;
  let ledMat = null;

  // Shader para disco de vinilo con surcos, reflejo anisotrópico y etiqueta con diseño (permite apreciar el giro claramente)
  const vinylDiscShader = {
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
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float angle = atan(p.y, p.x);

        // Agujero central del eje
        if (r < 0.055) {
          gl_FragColor = vec4(0.05, 0.05, 0.05, 1.0);
          return;
        }

        // Etiqueta central amarilla con franja y detalles que hacen visible la rotación
        if (r < 0.34) {
          vec3 labelCol = vec3(0.92, 0.78, 0.20);
          // Franja oscura superior e inscripción simulada en la etiqueta
          if (p.y > 0.04 && p.y < 0.13) {
            labelCol = vec3(0.14, 0.12, 0.10);
          } else if (p.y < -0.05 && p.y > -0.10 && abs(p.x) < 0.18) {
            labelCol = vec3(0.22, 0.18, 0.12);
          }
          // Anillo decorativo en el borde de la etiqueta
          float ring = smoothstep(0.31, 0.32, r) * (1.0 - smoothstep(0.325, 0.335, r));
          labelCol = mix(labelCol, vec3(0.15, 0.12, 0.08), ring * 0.7);
          gl_FragColor = vec4(labelCol, 1.0);
          return;
        }

        // Surcos concéntricos del vinilo + reflejo especular doble que gira con el disco
        float grooves = sin(r * 240.0) * 0.5 + 0.5;
        float sheen1 = pow(max(0.0, cos(angle * 2.0 + 0.6)), 6.0) * 0.24;
        float sheen2 = pow(max(0.0, sin(angle * 1.0 - 0.8)), 3.0) * 0.08;
        float trackRing = smoothstep(0.62, 0.63, r) * (1.0 - smoothstep(0.635, 0.645, r)) * 0.06;

        vec3 vinylCol = vec3(0.07, 0.07, 0.08) + grooves * 0.035 + sheen1 + sheen2 - trackRing;
        gl_FragColor = vec4(vinylCol, 1.0);
      }
    `,
  };

  {
    const tTL = uvToLocal(0.424, 0.538);
    const tBR = uvToLocal(0.576, 0.684);
    const tw = tBR.x - tTL.x;
    const th = tTL.y - tBR.y;
    const tcx = (tTL.x + tBR.x) / 2;
    const bottomY = tBR.y;

    const ttGroup = new THREE.Group();
    ttGroup.position.set(tcx, bottomY, 0.05);
    group.add(ttGroup);

    const blackCaseMat = new THREE.MeshStandardMaterial({
      color: 0x22201e,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.42,
      metalness: 0.2,
    });
    const vinylEdgeMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.25, metalness: 0.35 });
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xd0d0d6,
      emissive: new THREE.Color(0xffb85c),
      emissiveIntensity: 0,
      roughness: 0.25,
      metalness: 0.8,
    });
    turntableHighlightMats.push(blackCaseMat, silverMat);

    const vinylFaceMat = new THREE.ShaderMaterial({
      vertexShader: vinylDiscShader.vertexShader,
      fragmentShader: vinylDiscShader.fragmentShader,
      side: THREE.DoubleSide,
    });

    // Base horizontal del tocadiscos
    const baseH = th * 0.16;
    const baseD = depth * 0.80;
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(tw, baseH, baseD), blackCaseMat);
    baseMesh.position.set(0, baseH / 2, baseD / 2);
    ttGroup.add(baseMesh);

    // Luz LED indicadora de encendido/reproducción en el frente del tocadiscos
    ledMat = new THREE.MeshBasicMaterial({ color: 0x554433 });
    const ledDot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), ledMat);
    ledDot.position.set(-tw * 0.36, baseH * 0.52, baseD + 0.005);
    ttGroup.add(ledDot);

    // Perillas frontales plateadas
    for (const kx of [tw * 0.28, tw * 0.37]) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16), silverMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(kx, baseH * 0.52, baseD + 0.01);
      ttGroup.add(knob);
    }

    // Tapa vertical abierta detrás con el disco de vinilo grande expuesto
    const lidH = th * 0.86;
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.94, lidH, 0.045), blackCaseMat);
    lidMesh.position.set(0, baseH + lidH / 2 - 0.04, 0.04);
    ttGroup.add(lidMesh);

    // Vinilo vertical de fondo que gira sobre Z
    const vinylR = Math.min(tw, lidH) * 0.40;
    vDiskSpinGroup = new THREE.Group();
    vDiskSpinGroup.position.set(0, baseH + lidH * 0.46, 0.074);
    ttGroup.add(vDiskSpinGroup);

    const vDiskBody = new THREE.Mesh(new THREE.CylinderGeometry(vinylR, vinylR, 0.014, 36), vinylEdgeMat);
    vDiskBody.rotation.x = Math.PI / 2;
    vDiskSpinGroup.add(vDiskBody);

    const vDiskFace = new THREE.Mesh(new THREE.PlaneGeometry(vinylR * 2, vinylR * 2), vinylFaceMat);
    vDiskFace.position.z = 0.009;
    vDiskSpinGroup.add(vDiskFace);

    // Barras 3D indicadoras de sonido (ecualizador de colores) sobre la base del tocadiscos
    const eqColors = [
      0x2ecc71, 0x1abc9c, 0x00d2ff, 0x3498db,
      0x9b59b6, 0xe84393, 0xff4757, 0xff6b81,
      0xff9f43, 0xfeca57, 0xf1c40f, 0xa3cb38,
      0x2ecc71, 0x00d2ff, 0x9b59b6, 0xff4757,
    ];
    const numBars = eqColors.length;
    const eqTotalW = tw * 0.72;
    const barW = (eqTotalW / numBars) * 0.68;
    const barD = 0.032;
    const maxBarH = th * 0.24;
    const barGeo = new THREE.BoxGeometry(barW, 1, barD);
    // Desplazar geometría para que crezca desde su base inferior (y = 0 -> 1)
    barGeo.translate(0, 0.5, 0);

    for (let i = 0; i < numBars; i++) {
      const col = new THREE.Color(eqColors[i]);
      const barMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.1,
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      const bx = -eqTotalW / 2 + (i + 0.5) * (eqTotalW / numBars);
      const idleH = 0.025;
      barMesh.position.set(bx, baseH + 0.002, baseD * 0.62);
      barMesh.scale.y = idleH;
      ttGroup.add(barMesh);
      eqBars.push({
        mesh: barMesh,
        mat: barMat,
        maxH: maxBarH,
        idleH,
        phase: i * 0.55,
        speed: 6.5 + (i % 5) * 1.8,
      });
    }

    ttGroup.traverse((child) => {
      if (child.isMesh) {
        turntableMeshes.push(child);
      }
    });
  }

  // Helper para crear hileras de libros 3D interactivos (Habilidades)
  const bookMeshes = [];
  const bookMaterials = [];

  function addBookRow(uStart, vBottom, bookSpecs) {
    let curU = uStart;
    for (const b of bookSpecs) {
      const p0 = uvToLocal(curU, vBottom - b.h);
      const p1 = uvToLocal(curU + b.w, vBottom);
      const bw = p1.x - p0.x;
      const bh = p0.y - p1.y;
      const bd = depth * (b.d || 0.72);

      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        emissive: new THREE.Color(0xffb84d),
        emissiveIntensity: 0,
        roughness: 0.52,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      mesh.position.set((p0.x + p1.x) / 2 + (b.offsetX || 0), (p0.y + p1.y) / 2, 0.05 + bd / 2);
      if (b.tilt) mesh.rotation.z = b.tilt;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      bookMeshes.push(mesh);
      bookMaterials.push(mat);

      curU += b.w + (b.gap || 0.0015);
    }
  }

  // Libros sobre la caja superior izquierda
  addBookRow(0.228, 0.616, [
    { w: 0.010, h: 0.072, color: 0x4b5d44 },
    { w: 0.013, h: 0.082, color: 0x9e3b2b },
    { w: 0.012, h: 0.082, color: 0xd47a34 },
    { w: 0.013, h: 0.080, color: 0x425870 },
    { w: 0.012, h: 0.082, color: 0xc8b89e },
    { w: 0.012, h: 0.078, color: 0x889982 },
    { w: 0.013, h: 0.076, color: 0xb5ae9e, tilt: 0.22, offsetX: 0.04 },
  ]);

  // Libros en el extremo superior derecho
  addBookRow(0.672, 0.684, [
    { w: 0.016, h: 0.086, color: 0x983632, tilt: -0.16, offsetX: -0.03 },
    { w: 0.012, h: 0.092, color: 0xc8b294, gap: 0.004 },
    { w: 0.012, h: 0.086, color: 0x354356 },
    { w: 0.012, h: 0.088, color: 0xc96b35 },
    { w: 0.013, h: 0.088, color: 0x3a2e2b },
    { w: 0.015, h: 0.095, color: 0x62809c },
    { w: 0.013, h: 0.095, color: 0x8b7e74 },
  ]);

  // Libros en el nicho medio izquierdo (2 bloques)
  addBookRow(0.225, 0.806, [
    { w: 0.013, h: 0.092, color: 0xa4382a },
    { w: 0.015, h: 0.090, color: 0xd49b2a },
    { w: 0.013, h: 0.082, color: 0x384c6b },
    { w: 0.016, h: 0.092, color: 0x9e886e },
    { w: 0.014, h: 0.086, color: 0x566882 },
    { w: 0.015, h: 0.088, color: 0x2e6844, tilt: 0.24, offsetX: 0.05 },
  ]);

  addBookRow(0.376, 0.806, [
    { w: 0.013, h: 0.088, color: 0x7c5a43, tilt: -0.16, offsetX: -0.02 },
    { w: 0.014, h: 0.082, color: 0x8da89e },
    { w: 0.016, h: 0.094, color: 0xd8cdc0 },
    { w: 0.012, h: 0.092, color: 0x3c6878 },
    { w: 0.013, h: 0.094, color: 0x354868 },
    { w: 0.012, h: 0.092, color: 0xd49b2c },
    { w: 0.014, h: 0.088, color: 0xc95a3c, tilt: 0.25, offsetX: 0.05 },
  ]);

  // Libros en el nicho medio derecho (junto a la caja GAMES)
  addBookRow(0.585, 0.806, [
    { w: 0.014, h: 0.078, color: 0x9c8e7e, tilt: -0.22, offsetX: -0.02 },
    { w: 0.015, h: 0.082, color: 0x784438, gap: 0.004 },
    { w: 0.011, h: 0.080, color: 0xd5c8b8 },
    { w: 0.014, h: 0.086, color: 0x484440 },
    { w: 0.014, h: 0.086, color: 0x5c4638 },
  ]);

  // Libros en el nicho inferior izquierdo + pila horizontal de libros
  addBookRow(0.225, 0.927, [
    { w: 0.012, h: 0.092, color: 0x484632 },
    { w: 0.012, h: 0.094, color: 0x363a3e },
    { w: 0.015, h: 0.092, color: 0x627c96 },
    { w: 0.013, h: 0.088, color: 0xa85232 },
    { w: 0.012, h: 0.090, color: 0x4c6852 },
    { w: 0.012, h: 0.094, color: 0x8e6b4e },
    { w: 0.011, h: 0.096, color: 0xc8bdb0 },
    { w: 0.012, h: 0.090, color: 0x8c3838 },
    { w: 0.011, h: 0.092, color: 0xc87832 },
    { w: 0.011, h: 0.092, color: 0x583c68 },
    { w: 0.014, h: 0.086, color: 0x728292, tilt: 0.18, offsetX: 0.03 },
  ]);

  // Pila horizontal de libros en el nicho inferior izquierdo
  {
    const stackColors = [0x344c68, 0x9c3e2e, 0x5c6874, 0x5e6e46, 0xc89e28];
    let curV = 0.927;
    for (let i = 0; i < stackColors.length; i++) {
      const hStep = i === 4 ? 0.022 : 0.012;
      const sTL = uvToLocal(0.384 + i * 0.002, curV - hStep);
      const sBR = uvToLocal(0.486 - i * 0.002, curV);
      const sw = sBR.x - sTL.x;
      const sh = sTL.y - sBR.y;
      const sd = depth * 0.68;
      const mat = new THREE.MeshStandardMaterial({
        color: stackColors[i],
        emissive: new THREE.Color(0xffb84d),
        emissiveIntensity: 0,
        roughness: 0.5,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
      m.position.set((sTL.x + sBR.x) / 2, (sTL.y + sBR.y) / 2, 0.05 + sd / 2);
      group.add(m);
      bookMeshes.push(m);
      bookMaterials.push(mat);
      curV -= hStep;
    }
  }

  // Macetas de cerámica 3D con hojas orgánicas y flores detalladas (pétalos + centro dorado)
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b281a, roughness: 0.85 });
  const centerPistilMat = new THREE.MeshStandardMaterial({
    color: 0xf7c838,
    emissive: new THREE.Color(0xd99b16),
    emissiveIntensity: 0.15,
    roughness: 0.4,
  });

  function create3DFlower(radius, petalColor, accentColor) {
    const flowerGroup = new THREE.Group();
    const petalMat = new THREE.MeshStandardMaterial({
      color: petalColor,
      roughness: 0.42,
      metalness: 0.03,
    });
    const innerPetalMat = new THREE.MeshStandardMaterial({
      color: accentColor || petalColor,
      roughness: 0.38,
      metalness: 0.03,
    });

    const numPetals = 7;
    const petalGeo = new THREE.SphereGeometry(radius * 0.48, 10, 8);
    petalGeo.scale(1.15, 0.32, 0.72);

    // Anillo exterior de pétalos
    for (let i = 0; i < numPetals; i++) {
      const angle = (i / numPetals) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, petalMat);
      p.position.set(Math.cos(angle) * radius * 0.55, 0, Math.sin(angle) * radius * 0.55);
      p.rotation.y = -angle;
      p.rotation.z = 0.25;
      flowerGroup.add(p);
    }

    // Anillo interior de pétalos ligeramente elevados
    for (let i = 0; i < numPetals; i++) {
      const angle = ((i + 0.5) / numPetals) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, innerPetalMat);
      p.scale.setScalar(0.76);
      p.position.set(Math.cos(angle) * radius * 0.36, radius * 0.12, Math.sin(angle) * radius * 0.36);
      p.rotation.y = -angle;
      p.rotation.z = 0.45;
      flowerGroup.add(p);
    }

    // Pistilo / botón central dorado
    const center = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.32, 12, 10), centerPistilMat);
    center.scale.set(1, 0.65, 1);
    center.position.y = radius * 0.16;
    flowerGroup.add(center);

    return flowerGroup;
  }

  function addFlowerPot({
    uCenter,
    vBottom,
    potW,
    potH,
    potColor = 0xd6cab8,
    leafColor = 0x3e6b2e,
    petalColor = 0xf26b7a,
    accentColor = 0xffa8b6,
    flowersCount = 4,
  }) {
    const pBot = uvToLocal(uCenter, vBottom);
    const r = potW * WALL_SIZE * 0.5;
    const h = potH * WALL_SIZE;

    const potGroup = new THREE.Group();
    potGroup.position.set(pBot.x, pBot.y, depth * 0.52);
    group.add(potGroup);

    const potMat = new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.42, metalness: 0.05 });

    // Cuerpo de la matera cerámica + borde moldeado superior + plato base
    const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.74, h, 24), potMat);
    potMesh.position.y = h / 2;
    potMesh.castShadow = true;
    potMesh.receiveShadow = true;
    potGroup.add(potMesh);

    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.08, 10, 24), potMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = h - r * 0.04;
    potGroup.add(rimMesh);

    const saucerMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.84, r * 0.80, h * 0.12, 20), potMat);
    saucerMesh.position.y = h * 0.06;
    potGroup.add(saucerMesh);

    // Tierra oscura dentro de la matera
    const soilMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.02, 18), soilMat);
    soilMesh.position.y = h - 0.01;
    potGroup.add(soilMesh);

    // Roseta orgánica de hojas curvas en dos niveles
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.48, metalness: 0.02 });
    const leafLightMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(leafColor).offsetHSL(0.02, 0.05, 0.08),
      roughness: 0.45,
    });
    const leafGeo = new THREE.SphereGeometry(r * 0.42, 10, 8);
    leafGeo.scale(1.35, 0.24, 0.68);

    const numLeaves = 10;
    for (let i = 0; i < numLeaves; i++) {
      const angle = (i / numLeaves) * Math.PI * 2;
      const leaf = new THREE.Mesh(leafGeo, i % 2 === 0 ? leafMat : leafLightMat);
      leaf.position.set(
        Math.cos(angle) * r * 0.62,
        h + r * (i % 2 === 0 ? 0.08 : 0.18),
        Math.sin(angle) * r * 0.62
      );
      leaf.rotation.y = -angle;
      leaf.rotation.z = i % 2 === 0 ? -0.25 : 0.22;
      potGroup.add(leaf);
    }

    // Tallos verdes y flores 3D en la parte superior
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x355e27, roughness: 0.55 });
    for (let i = 0; i < flowersCount; i++) {
      const isCenter = i === 0;
      const angle = ((i - 1) / Math.max(1, flowersCount - 1)) * Math.PI * 2 + 0.4;
      const dist = isCenter ? 0 : r * 0.46;
      const fx = Math.cos(angle) * dist;
      const fz = Math.sin(angle) * dist;
      const stemH = h * (isCenter ? 0.62 : 0.46 + (i % 2) * 0.1);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, stemH, 8), stemMat);
      stem.position.set(fx * 0.7, h + stemH / 2, fz * 0.7);
      if (!isCenter) {
        stem.rotation.z = -Math.cos(angle) * 0.22;
        stem.rotation.x = Math.sin(angle) * 0.22;
      }
      potGroup.add(stem);

      const flower = create3DFlower(r * (isCenter ? 0.48 : 0.40), petalColor, accentColor);
      flower.position.set(fx, h + stemH, fz);
      if (!isCenter) {
        flower.rotation.z = -Math.cos(angle) * 0.32;
        flower.rotation.x = Math.sin(angle) * 0.32 + 0.18;
      } else {
        flower.rotation.x = 0.22;
      }
      potGroup.add(flower);
    }
  }

  // Materas con flores 3D dentro de los nichos y sobre la cubierta superior
  addFlowerPot({
    uCenter: 0.378, vBottom: 0.684, potW: 0.044, potH: 0.048,
    potColor: 0xb88460, leafColor: 0x3d6b2c, petalColor: 0xfff0f5, accentColor: 0xffa6c1, flowersCount: 4,
  });
  addFlowerPot({
    uCenter: 0.622, vBottom: 0.684, potW: 0.045, potH: 0.045,
    potColor: 0xd2c7ba, leafColor: 0x457032, petalColor: 0xe84393, accentColor: 0xff85b3, flowersCount: 4,
  });
  addFlowerPot({
    uCenter: 0.544, vBottom: 0.806, potW: 0.038, potH: 0.034,
    potColor: 0x9c8b7c, leafColor: 0x426b30, petalColor: 0x74b9ff, accentColor: 0xa29bfe, flowersCount: 3,
  });
  addFlowerPot({
    uCenter: 0.616, vBottom: 0.508, potW: 0.036, potH: 0.034,
    potColor: 0xd8cfc4, leafColor: 0x4e783c, petalColor: 0xb388eb, accentColor: 0xdcc2ff, flowersCount: 3,
  });
  addFlowerPot({
    uCenter: 0.726, vBottom: 0.508, potW: 0.042, potH: 0.040,
    potColor: 0xd8cfc4, leafColor: 0x426c30, petalColor: 0xff9f43, accentColor: 0xffeaa7, flowersCount: 4,
  });

  // Faro 3D (faro.glb) sobre el extremo superior izquierdo del estante (en el lugar de la matera anterior)
  {
    const fBase = uvToLocal(0.280, 0.508);
    const lighthouseAnchor = new THREE.Group();
    lighthouseAnchor.position.set(fBase.x, fBase.y, depth * 0.52);
    group.add(lighthouseAnchor);

    // Sombra de contacto en la repisa superior debajo del faro
    const lhShadow = createDropShadow(0.48, 0.48, 0.14, 0.45);
    lhShadow.rotation.x = -Math.PI / 2;
    lhShadow.position.set(0, 0.004, 0);
    lighthouseAnchor.add(lhShadow);

    const gltfLoader = new GLTFLoader();
    const loadLighthouse = (url, isFallback = false) => {
      gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          // Escalar para que encaje entre la cubierta del estante y el cuadro superior izquierdo (~0.88 unidades de alto)
          const targetH = 0.88;
          const maxFootprint = depth * 0.82;
          const scaleByH = targetH / Math.max(size.y, 0.001);
          const scaleByFoot = maxFootprint / Math.max(size.x, size.z, 0.001);
          const scale = Math.min(scaleByH, scaleByFoot);

          model.scale.setScalar(scale);
          model.position.set(
            -center.x * scale,
            -box.min.y * scale,
            -center.z * scale
          );

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          lighthouseAnchor.add(model);
        },
        undefined,
        (err) => {
          if (!isFallback && url !== LOCAL_LIGHTHOUSE_URL) {
            console.warn('Cargando faro.glb local como respaldo:', err);
            loadLighthouse(LOCAL_LIGHTHOUSE_URL, true);
          } else {
            console.warn('No se pudo cargar faro.glb:', err);
          }
        }
      );
    };

    loadLighthouse(LIGHTHOUSE_URL);
  }

  // Lámpara cálida 3D sobre la cubierta superior derecha (u = 0.668)
  const lampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d6,
    emissive: new THREE.Color(0xffbe66),
    emissiveIntensity: 0.75,
    roughness: 0.3,
  });
  {
    const lBase = uvToLocal(0.668, 0.508);
    const lw = 0.042 * WALL_SIZE;
    const lh = 0.064 * WALL_SIZE;
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lBase.x, lBase.y, depth * 0.52);
    group.add(lampGroup);

    const woodBase = new THREE.Mesh(new THREE.CylinderGeometry(lw * 0.48, lw * 0.48, lh * 0.22, 24), woodMainMat);
    woodBase.position.y = lh * 0.11;
    lampGroup.add(woodBase);

    const shade = new THREE.Mesh(new THREE.CylinderGeometry(lw * 0.46, lw * 0.48, lh * 0.78, 24), lampShadeMat);
    shade.position.y = lh * 0.60;
    lampGroup.add(shade);
  }

  // --- 6. Tres cuadros 3D superiores con sombras, marco oscuro, paspartú blanco y lienzo interno ---
  const frameOuterMat = new THREE.MeshStandardMaterial({
    color: 0x261f1c,
    roughness: 0.38,
    metalness: 0.08,
  });
  const frameInnerLipMat = new THREE.MeshStandardMaterial({
    color: 0x181311,
    roughness: 0.45,
    metalness: 0.06,
  });
  const passepartoutMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece3,
    roughness: 0.62,
    metalness: 0.02,
  });
  const passepartoutBevelMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc3,
    roughness: 0.55,
    metalness: 0.02,
  });

  // Shader para sombra interior sutil proyectada por el marco y el paspartú sobre la pintura
  const innerFrameShadowShader = {
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
        float topAO = (1.0 - smoothstep(0.0, 0.08, 1.0 - vUv.y)) * 0.38;
        float bottomAO = (1.0 - smoothstep(0.0, 0.05, vUv.y)) * 0.18;
        float leftAO = (1.0 - smoothstep(0.0, 0.06, vUv.x)) * 0.25;
        float rightAO = (1.0 - smoothstep(0.0, 0.06, 1.0 - vUv.x)) * 0.25;
        // Ligero reflejo diagonal de vidrio de galería
        float sheen = smoothstep(0.18, 0.0, abs((vUv.x * 0.75 + vUv.y * 0.55) - 0.68)) * 0.045;
        float shadowAlpha = clamp(topAO + bottomAO + leftAO + rightAO, 0.0, 0.55);
        vec3 col = mix(vec3(0.02, 0.015, 0.01), vec3(1.0, 0.98, 0.95), sheen / max(0.001, shadowAlpha + sheen));
        gl_FragColor = vec4(col, clamp(shadowAlpha + sheen, 0.0, 0.58));
      }
    `,
  };

  // Textura placeholder limpia tipo lienzo oscuro de galería mientras se asignan las 3 pinturas
  function createCanvasPlaceholderTexture(index) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 768;
    const ctx = c.getContext('2d');

    // Fondo degradado sobrio estilo galería
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#1e2026');
    grad.addColorStop(0.55, '#15171c');
    grad.addColorStop(1, '#0f1014');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    // Marco interior decorativo sutil del lienzo
    ctx.strokeStyle = 'rgba(255, 245, 228, 0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, c.width - 56, c.height - 56);

    // Etiqueta discreta indicando el número de cuadro
    ctx.fillStyle = 'rgba(255, 245, 228, 0.22)';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CUADRO ${index + 1}`, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const frameSpecs = [
    { u0: 0.200, v0: 0.165, u1: 0.378, v1: 0.415 }, // Cuadro 1 (Izquierda)
    { u0: 0.411, v0: 0.165, u1: 0.589, v1: 0.415 }, // Cuadro 2 (Centro)
    { u0: 0.622, v0: 0.165, u1: 0.800, v1: 0.415 }, // Cuadro 3 (Derecha)
  ];

  const frameCanvasMats = [];
  const texLoader = new THREE.TextureLoader();

  frameSpecs.forEach((spec, idx) => {
    const fTL = uvToLocal(spec.u0, spec.v0);
    const fBR = uvToLocal(spec.u1, spec.v1);
    const fw = fBR.x - fTL.x;
    const fh = fTL.y - fBR.y;
    const fcx = (fTL.x + fBR.x) / 2;
    const fcy = (fTL.y + fBR.y) / 2;

    const frameGroup = new THREE.Group();
    frameGroup.position.set(fcx, fcy, 0);
    group.add(frameGroup);

    // 1. Sombra 3D suave proyectada sobre la pared detrás de cada cuadro
    const fShadow = createDropShadow(fw + 0.30, fh + 0.30, 0.16, 0.54);
    fShadow.position.set(0.025, -0.045, -0.006);
    frameGroup.add(fShadow);

    // Segunda sombra de contacto más cerrada justo detrás del borde del marco
    const fContactShadow = createDropShadow(fw + 0.10, fh + 0.10, 0.06, 0.45);
    fContactShadow.position.set(0.01, -0.02, -0.003);
    frameGroup.add(fContactShadow);

    const borderW = 0.088; // grosor del listón exterior oscuro
    const frameD = 0.095;  // profundidad 3D del marco hacia afuera de la pared
    const matMargin = 0.118; // ancho del paspartú blanco alrededor de la pintura

    // 2. Cuatro listones 3D del marco exterior oscuro
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(fw, borderW, frameD), frameOuterMat);
    topBar.position.set(0, fh / 2 - borderW / 2, frameD / 2);
    topBar.castShadow = true;
    topBar.receiveShadow = true;
    frameGroup.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(fw, borderW, frameD), frameOuterMat);
    botBar.position.set(0, -fh / 2 + borderW / 2, frameD / 2);
    botBar.castShadow = true;
    botBar.receiveShadow = true;
    frameGroup.add(botBar);

    const sideH = fh - borderW * 2;
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(borderW, sideH, frameD), frameOuterMat);
    leftBar.position.set(-fw / 2 + borderW / 2, 0, frameD / 2);
    leftBar.castShadow = true;
    leftBar.receiveShadow = true;
    frameGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(borderW, sideH, frameD), frameOuterMat);
    rightBar.position.set(fw / 2 - borderW / 2, 0, frameD / 2);
    rightBar.castShadow = true;
    rightBar.receiveShadow = true;
    frameGroup.add(rightBar);

    // 3. Reborde interior oscuro fino (entre el marco y el paspartú)
    const innerOpenW = fw - borderW * 2;
    const innerOpenH = fh - borderW * 2;
    const lipThick = 0.016;
    const lipDepth = frameD * 0.78;

    const lipTop = new THREE.Mesh(new THREE.BoxGeometry(innerOpenW, lipThick, lipDepth), frameInnerLipMat);
    lipTop.position.set(0, innerOpenH / 2 - lipThick / 2, lipDepth / 2);
    frameGroup.add(lipTop);

    const lipBot = new THREE.Mesh(new THREE.BoxGeometry(innerOpenW, lipThick, lipDepth), frameInnerLipMat);
    lipBot.position.set(0, -innerOpenH / 2 + lipThick / 2, lipDepth / 2);
    frameGroup.add(lipBot);

    const lipLeft = new THREE.Mesh(new THREE.BoxGeometry(lipThick, innerOpenH - lipThick * 2, lipDepth), frameInnerLipMat);
    lipLeft.position.set(-innerOpenW / 2 + lipThick / 2, 0, lipDepth / 2);
    frameGroup.add(lipLeft);

    const lipRight = new THREE.Mesh(new THREE.BoxGeometry(lipThick, innerOpenH - lipThick * 2, lipDepth), frameInnerLipMat);
    lipRight.position.set(innerOpenW / 2 - lipThick / 2, 0, lipDepth / 2);
    frameGroup.add(lipRight);

    // 4. Paspartú blanco/marfil en relieve (4 bandas que rodean la ventana de la pintura)
    const matZ = 0.046;
    const matDepth = 0.018;
    const canvasW = innerOpenW - matMargin * 2;
    const canvasH = innerOpenH - matMargin * 2;

    const matTop = new THREE.Mesh(new THREE.BoxGeometry(innerOpenW, matMargin, matDepth), passepartoutMat);
    matTop.position.set(0, innerOpenH / 2 - matMargin / 2, matZ);
    frameGroup.add(matTop);

    const matBot = new THREE.Mesh(new THREE.BoxGeometry(innerOpenW, matMargin, matDepth), passepartoutMat);
    matBot.position.set(0, -innerOpenH / 2 + matMargin / 2, matZ);
    frameGroup.add(matBot);

    const matLeft = new THREE.Mesh(new THREE.BoxGeometry(matMargin, canvasH, matDepth), passepartoutMat);
    matLeft.position.set(-innerOpenW / 2 + matMargin / 2, 0, matZ);
    frameGroup.add(matLeft);

    const matRight = new THREE.Mesh(new THREE.BoxGeometry(matMargin, canvasH, matDepth), passepartoutMat);
    matRight.position.set(innerOpenW / 2 - matMargin / 2, 0, matZ);
    frameGroup.add(matRight);

    // Bisel interior del paspartú alrededor del lienzo
    const bevT = 0.012;
    const bevTop = new THREE.Mesh(new THREE.BoxGeometry(canvasW + bevT * 2, bevT, matDepth + 0.004), passepartoutBevelMat);
    bevTop.position.set(0, canvasH / 2 + bevT / 2, matZ - 0.001);
    frameGroup.add(bevTop);

    const bevBot = new THREE.Mesh(new THREE.BoxGeometry(canvasW + bevT * 2, bevT, matDepth + 0.004), passepartoutBevelMat);
    bevBot.position.set(0, -canvasH / 2 - bevT / 2, matZ - 0.001);
    frameGroup.add(bevBot);

    const bevLeft = new THREE.Mesh(new THREE.BoxGeometry(bevT, canvasH, matDepth + 0.004), passepartoutBevelMat);
    bevLeft.position.set(-canvasW / 2 - bevT / 2, 0, matZ - 0.001);
    frameGroup.add(bevLeft);

    const bevRight = new THREE.Mesh(new THREE.BoxGeometry(bevT, canvasH, matDepth + 0.004), passepartoutBevelMat);
    bevRight.position.set(canvasW / 2 + bevT / 2, 0, matZ - 0.001);
    frameGroup.add(bevRight);

    // 5. Lienzo interno para la pintura (listo para cargar la imagen de cada cuadro)
    const placeholderTex = createCanvasPlaceholderTexture(idx);
    const canvasMat = new THREE.MeshBasicMaterial({
      map: placeholderTex,
      color: 0xffffff,
    });
    frameCanvasMats.push(canvasMat);

    const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(canvasW, canvasH), canvasMat);
    canvasMesh.position.set(0, 0, 0.035);
    frameGroup.add(canvasMesh);

    // 6. Sombra interior proyectada sobre el lienzo + sutil brillo de cristal
    const innerShadowMat = new THREE.ShaderMaterial({
      vertexShader: innerFrameShadowShader.vertexShader,
      fragmentShader: innerFrameShadowShader.fragmentShader,
      transparent: true,
      depthWrite: false,
    });
    const innerShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(canvasW, canvasH), innerShadowMat);
    innerShadowMesh.position.set(0, 0, 0.041);
    frameGroup.add(innerShadowMesh);
  });

  function setFramePaintings(urls = FRAME_PAINTINGS) {
    urls.forEach((url, idx) => {
      if (!url || !frameCanvasMats[idx]) return;
      const finalUrl = getStorageUrl(url);
      texLoader.load(encodeURI(finalUrl), (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        frameCanvasMats[idx].map = tex;
        frameCanvasMats[idx].needsUpdate = true;
      });
    });
  }
  setFramePaintings(FRAME_PAINTINGS);

  // --- Interacción de libros (Habilidades) y Tocadiscos (Música + Vinilo giratorio) ---
  function setBooksHover(hovered) {
    for (const mat of bookMaterials) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.34 : 0,
        duration: 240,
        easing: 'linear',
      });
    }
  }

  function setTurntableHover(hovered) {
    for (const mat of turntableHighlightMats) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.28 : 0,
        duration: 220,
        easing: 'linear',
      });
    }
  }

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = MUSIC_URL;
  audio.loop = true;
  audio.volume = 0.75;
  audio.addEventListener('error', () => {
    if (!audio.src.includes(LOCAL_MUSIC_URL)) {
      audio.src = LOCAL_MUSIC_URL;
    }
  });

  let audioCtx = null;
  let analyser = null;
  let freqData = null;

  function ensureAudioAnalyser() {
    if (audioCtx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (_) {
      // Fallback a animación rítmica si el navegador restringe AudioContext
    }
  }

  const turntableState = {
    playing: false,
    spinSpeed: 0,
    elapsed: 0,
  };

  function toggleTurntable() {
    const nextPlaying = !turntableState.playing;
    turntableState.playing = nextPlaying;

    if (nextPlaying) {
      ensureAudioAnalyser();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audio.play().catch(() => {});
      if (ledMat) ledMat.color.setHex(0x52ff7a); // LED verde brillante encendido
    } else {
      audio.pause();
      if (ledMat) ledMat.color.setHex(0x554433);
    }

    // Acelerar o desacelerar suavemente el giro del vinilo
    anime.remove(turntableState);
    anime({
      targets: turntableState,
      spinSpeed: nextPlaying ? 3.2 : 0,
      duration: nextPlaying ? 900 : 1200,
      easing: nextPlaying ? 'easeInQuad' : 'easeOutQuad',
    });
  }

  function update(dt) {
    turntableState.elapsed += dt;

    if (turntableState.spinSpeed > 0.001) {
      const deltaAngle = turntableState.spinSpeed * dt;
      if (vDiskSpinGroup) vDiskSpinGroup.rotation.z -= deltaAngle;
    }

    // Actualizar altura y brillo de las barras indicadoras de sonido de colores
    const activity = Math.min(1, turntableState.spinSpeed / 3.2);
    if (analyser && freqData && turntableState.playing) {
      analyser.getByteFrequencyData(freqData);
    }

    for (let i = 0; i < eqBars.length; i++) {
      const b = eqBars[i];
      let level = 0;
      if (activity > 0.01) {
        const fftVal = freqData ? (freqData[i % freqData.length] / 255) : 0;
        const synthWave =
          0.45 +
          0.35 * Math.sin(turntableState.elapsed * b.speed + b.phase) +
          0.20 * Math.cos(turntableState.elapsed * (b.speed * 1.6) - b.phase * 1.3);
        level = Math.max(fftVal * 0.95, synthWave * 0.85) * activity;
      }
      const targetScaleY = b.idleH + level * (b.maxH - b.idleH);
      b.mesh.scale.y += (targetScaleY - b.mesh.scale.y) * Math.min(1, dt * 18);
      b.mat.emissiveIntensity = 0.3 + level * 0.95;
    }
  }

  let currentTheme = theme;
  let currentCurtainOpen = 1.0;
  let currentCeilingPower = 1.0;

  function syncBookcaseLighting() {
    const isDark = currentTheme === 'dark';
    const roomFactor = isDark
      ? (0.24 + 0.32 * currentCurtainOpen + 0.44 * currentCeilingPower)
      : (0.20 + 0.48 * currentCurtainOpen + 0.32 * currentCeilingPower);

    woodMainMat.color.setHex(isDark ? 0x996b42 : 0xb58354);
    woodEdgeMat.color.setHex(isDark ? 0xa8784c : 0xc49262);
    woodBackMat.color.setHex(isDark ? 0x754e2d : 0x91633b);
    frameOuterMat.color.setHex(isDark ? 0x1d1715 : 0x261f1c);
    passepartoutMat.color.setHex(isDark ? 0xd9d2c7 : 0xf1ece3);

    for (const cMat of frameCanvasMats) {
      cMat.color.setHex(isDark ? 0xc8c4be : 0xffffff).multiplyScalar(roomFactor);
    }
    topLampLight.intensity = isDark ? 1.35 : 0.85;
    lampShadeMat.emissiveIntensity = isDark ? 1.15 : 0.65;
    frontFillLight.intensity = (isDark ? 0.38 : 0.55) * roomFactor;

    for (const u of cavityUniforms) {
      u.uOpacity.value = isDark ? 0.82 : 0.65;
    }
  }

  function setRoomLighting({ curtainOpen, ceilingPower }) {
    if (curtainOpen !== undefined) currentCurtainOpen = curtainOpen;
    if (ceilingPower !== undefined) currentCeilingPower = ceilingPower;
    syncBookcaseLighting();
  }

  function setTheme(newTheme) {
    currentTheme = newTheme;
    syncBookcaseLighting();
  }
  setTheme(theme);

  return {
    group,
    depth,
    bookMeshes,
    turntableMeshes,
    turntableState,
    setBooksHover,
    setTurntableHover,
    toggleTurntable,
    setFramePaintings,
    setRoomLighting,
    update,
    setTheme,
  };
}

