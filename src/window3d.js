// window3d.js – Ventana 3D de doble hoja abatible con cortinas animadas.
// Permite abrir/cerrar las dos cortinas y abrir/cerrar las dos hojas de la ventana en 3D.

import * as THREE from 'three';
import anime from 'animejs';
import { getStorageUrl } from './supabase.js';

const WALL_SIZE = 10;

// ─── Coordenadas UV de la ventana en la imagen derecha.jpg ───
const WIN = { u0: 0.34, v0: 0.23, u1: 0.66, v1: 0.665 };
const CURTAIN = { u0: 0.28, v0: 0.19, u1: 0.72, v1: 0.91 };
const ROD = { u0: 0.27, v0: 0.17, u1: 0.73, v1: 0.195 };

function uvToLocal(u, v) {
  return new THREE.Vector2((u - 0.5) * WALL_SIZE, (0.5 - v) * WALL_SIZE);
}

// ─── Shader para las cortinas con física de tela (arrastre, ondas e inercia) y sombreado 3D ───
const curtainVertexShader = `
  uniform float uFold;      // 0 = abierta (plegada a un lado), 1 = cerrada (estirada)
  uniform float uSide;      // -1 = cortina izquierda, 1 = cortina derecha
  uniform float uTime;
  uniform float uMotion;    // Inercia física de péndulo al abrir/cerrar (positivo o negativo)
  uniform float uRipple;    // Intensidad de ondas de tela en movimiento (0 en reposo -> 1 en movimiento)
  uniform float uScaleX;    // Escala horizontal actual para mantener proporción física real
  attribute vec2 aUvBase;
  varying vec2 vUv;
  varying float vFold;
  varying float vSlope;

  void main() {
    vUv = uv;

    vec3 basePos = position;
    vec3 pos = basePos;

    float normalizedX = uv.x;
    // leadFactor: 0 en el borde exterior fijo al muro, 1 en el borde interior móvil que se jala
    float leadFactor = (uSide < 0.0) ? uv.x : (1.0 - uv.x);
    // hang: 0 arriba en las argollas (sujeto a la barra), 1 abajo en el ruedo de la cortina
    float hang = 1.0 - uv.y;
    float smoothHang = smoothstep(0.0, 1.0, hang);

    // 1. Pliegues verticales de confección (con compresión elástica progresiva tipo acordeón)
    float foldFreq = 10.0;
    float foldAmp = 0.12;
    float accordionShift = uMotion * 0.28 * sin(leadFactor * 3.14159) * smoothstep(0.0, 0.5, hang);
    float phase = (normalizedX * foldFreq + accordionShift) * 3.14159;

    float topAtten = smoothstep(0.0, 0.25, hang);
    float fold = sin(phase) * foldAmp * topAtten;

    // 2. Arrastre e inercia de tela al abrir/cerrar (curva suave desde las argollas hasta el ruedo)
    float dragProfile = (hang * hang * (1.35 - 0.35 * hang)) * mix(0.22, 1.0, smoothstep(0.0, 1.0, leadFactor));
    // Onda sedosa que desciende por la caída de la tela
    float flutterWave = sin(hang * 4.2 - uTime * 5.2 + leadFactor * 2.4) * uRipple * (hang * smoothHang) * 0.036;
    pos.x += (uMotion * dragProfile + flutterWave) / max(uScaleX, 0.25);

    // Ligera elevación orgánica del borde inferior cuando la tela se curva
    pos.y += (uMotion * uMotion) * (hang * hang) * mix(0.2, 1.0, leadFactor) * 0.08;

    // 3. Abombamiento suave por aire (billow) y ondas fluidas en Z
    float airBillow = clamp(abs(uMotion) * 1.15, 0.0, 0.065) * sin(hang * 3.14159) * mix(0.3, 1.0, leadFactor);
    float clothRippleZ = sin(leadFactor * 6.0 - uTime * 5.8 + hang * 3.2) * uRipple * smoothHang * 0.03;
    pos.z += fold + airBillow + max(-0.015, clothRippleZ);

    // Pendiente lateral del pliegue para sombreado direccional 3D
    vSlope = cos(phase) * topAtten + clothRippleZ * 3.2;

    // 4. Brisa suave constante usando basePos.x (evita vibración al desplazarse pos.x)
    float breeze = sin(uTime * 1.4 + basePos.y * 1.8 + basePos.x * 2.5) * 0.018 * smoothHang;
    pos.z += breeze;

    vFold = (fold + clothRippleZ * 0.4) / foldAmp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const curtainFragmentShader = `
  uniform vec3 uColor;
  uniform float uFold;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFold;
  varying float vSlope;

  void main() {
    vec3 color = uColor;

    // 1. Oclusión ambiental en los valles (vFold < 0 se hunde en sombra, vFold > 0 sale a la luz)
    float valleyAO = smoothstep(-1.0, 0.85, vFold);
    float depthShade = mix(0.46, 1.08, valleyAO);

    // 2. Luz direccional lateral sobre las paredes de cada pliegue (da volumen cilíndrico 3D)
    float sideLight = vSlope * 0.16;

    // 3. Brillo especular suave de tela en la cresta de cada ondulación
    float crestHighlight = pow(max(0.0, vFold), 3.0) * 0.10;

    // 4. Sombra superior bajo el cabezal/barra y gradiente hacia el piso
    float topPinchShadow = mix(0.76, 1.0, smoothstep(0.0, 0.10, 1.0 - vUv.y));
    float verticalGrad = mix(0.82, 1.02, vUv.y);

    // 5. Viñeteado sutil en los bordes izquierdo y derecho del paño para darle grosor al borde
    float edgeRolling = smoothstep(0.0, 0.035, vUv.x) * smoothstep(0.0, 0.035, 1.0 - vUv.x);
    float edgeShade = mix(0.72, 1.0, edgeRolling);

    // Textura tipo lino con noise simple
    float grain = fract(sin(dot(vUv * 200.0, vec2(12.9898, 78.233))) * 43758.5453);
    color = mix(color, color * 0.90, grain * 0.15);

    float totalLight = (depthShade + sideLight + crestHighlight) * topPinchShadow * verticalGrad * edgeShade;
    color *= clamp(totalLight, 0.35, 1.16);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Shader para sombra suave alrededor del marco / bajo la repisa ───
const dropShadowShader = {
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

// ─── Shader para vidrio con sombra interior y barrido de reflejo que pasa y se quita ───
const glassShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uGlint;      // Progreso del barrido: -0.6 (fuera) -> 2.4 (sale por completo)
    uniform float uPaneOffset; // Desfase entre hoja izquierda y derecha para barrido continuo
    varying vec2 vUv;

    void main() {
      // Sombra interior pegada al borde del marco (da profundidad de nicho)
      float edgeL = smoothstep(0.0, 0.08, vUv.x);
      float edgeR = smoothstep(0.0, 0.06, 1.0 - vUv.x);
      float edgeT = smoothstep(0.0, 0.10, 1.0 - vUv.y);
      float edgeB = smoothstep(0.0, 0.05, vUv.y);
      float innerFrameMask = edgeL * edgeR * edgeT * edgeB;
      float innerAO = 1.0 - innerFrameMask;

      // Coordenada diagonal continua a través de ambas hojas de la ventana
      float diag = (vUv.x + uPaneOffset) * 0.55 + vUv.y * 0.75;
      float d = diag - uGlint;

      // Perfil gaussiano suave: un haz principal + un destello secundario fino + halo ancho
      float mainBeam = exp(-pow(d * 6.5, 2.0));
      float thinRay  = exp(-pow((d - 0.11) * 18.0, 2.0)) * 0.75;
      float softHalo = exp(-pow((d - 0.03) * 2.6, 2.0)) * 0.25;

      // Envolvente de aparición y desaparición (entra suave, brilla al centro y se apaga al salir)
      float fadeEnv = smoothstep(-0.45, 0.15, uGlint) * (1.0 - smoothstep(1.55, 2.25, uGlint));

      // Atenuar ligeramente cerca de los bordes para que parezca contenido dentro del bisel del vidrio
      float glassMask = smoothstep(0.0, 0.03, vUv.x) * smoothstep(0.0, 0.03, 1.0 - vUv.x)
                      * smoothstep(0.0, 0.03, vUv.y) * smoothstep(0.0, 0.03, 1.0 - vUv.y);

      float sheen = (mainBeam * 0.34 + thinRay * 0.28 + softHalo * 0.18) * fadeEnv * glassMask;

      // Color del destello: mezcla entre luz cálida solar en el núcleo y reflejo celeste en el halo
      vec3 glintColor = mix(vec3(0.82, 0.92, 1.0), vec3(1.0, 0.98, 0.92), mainBeam + thinRay * 0.5);
      vec3 aoColor = vec3(0.05, 0.04, 0.03);

      float aoAlpha = innerAO * 0.34;
      float totalAlpha = clamp(aoAlpha + sheen, 0.0, 0.65);
      vec3 finalCol = mix(aoColor, glintColor, clamp(sheen / max(totalAlpha, 0.0001), 0.0, 1.0));

      gl_FragColor = vec4(finalCol, totalAlpha);
    }
  `,
};

// ─── Crea la escena de la ventana ───
export function createWindow3D(wallMesh, theme, onCurtainChange = null) {
  const group = new THREE.Group();
  group.position.z = 0.02; // ligeramente delante de la pared

  // --- Iluminación para dar volumen 3D real al marco y la barra ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
  group.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff6ea, 0.95);
  dirLight.position.set(-2.5, 4.5, 4.0);
  group.add(dirLight);
  group.add(dirLight.target);

  const fillLight = new THREE.DirectionalLight(0xdde8f5, 0.28);
  fillLight.position.set(2.0, -3.0, 2.0);
  group.add(fillLight);
  group.add(fillLight.target);

  // --- Coordenadas de la ventana ---
  const winTL = uvToLocal(WIN.u0, WIN.v0);
  const winBR = uvToLocal(WIN.u1, WIN.v1);
  const winW = winBR.x - winTL.x;
  const winH = winTL.y - winBR.y;
  const winCX = (winTL.x + winBR.x) / 2;
  const winCY = (winTL.y + winBR.y) / 2;

  // --- 1. Sombra exterior proyectada sobre la pared detrás de toda la ventana ---
  const shadowPad = 0.42;
  const shadowGeo = new THREE.PlaneGeometry(winW + shadowPad, winH + shadowPad);
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: dropShadowShader.vertexShader,
    fragmentShader: dropShadowShader.fragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(winW + shadowPad, winH + shadowPad) },
      uBlur: { value: 0.22 },
      uOpacity: { value: 0.42 },
    },
    transparent: true,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.set(winCX + 0.03, winCY - 0.05, -0.012);
  shadowMesh.renderOrder = 0;
  group.add(shadowMesh);

  // --- 1b. Imagen de paisaje dentro de la ventana cargada desde Supabase Storage ---
  const texLoader = new THREE.TextureLoader();
  const loadViewTex = (path) => {
    const t = texLoader.load(getStorageUrl(path));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const viewTextures = {
    light: loadViewTex('ventana.jpg'),
  };

  const viewMat = new THREE.MeshBasicMaterial({
    map: viewTextures.light,
  });
  const viewGeo = new THREE.PlaneGeometry(winW, winH);
  const viewMesh = new THREE.Mesh(viewGeo, viewMat);
  viewMesh.position.set(winCX, winCY, -0.005);
  viewMesh.renderOrder = 0;
  group.add(viewMesh);

  // --- Materiales 3D del marco (responden a la luz con sombras en sus caras) ---
  const outerFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ec,
    roughness: 0.42,
    metalness: 0.05,
  });
  const innerSashMat = new THREE.MeshStandardMaterial({
    color: 0xe9e5de,
    roughness: 0.48,
    metalness: 0.05,
  });
  const bevelDarkMat = new THREE.MeshStandardMaterial({
    color: 0xcfc9bf,
    roughness: 0.55,
    metalness: 0.08,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8dc,
    roughness: 0.25,
    metalness: 0.75,
  });

  // Helper para añadir cajas 3D a un contenedor dado
  const addBoxTo = (parent, w, h, d, x, y, z, mat = outerFrameMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  };

  // --- 2. Marco exterior principal fijo (chambrana / moldura gruesa con relieve) ---
  const outerT = 0.13;  // grosor del marco exterior
  const outerD = 0.11;  // profundidad hacia afuera

  addBoxTo(group, winW + outerT * 2, outerT, outerD, winCX, winCY + winH / 2 + outerT / 2, outerD / 2 - 0.01, outerFrameMat);
  addBoxTo(group, winW + outerT * 2, outerT, outerD, winCX, winCY - winH / 2 - outerT / 2, outerD / 2 - 0.01, outerFrameMat);
  addBoxTo(group, outerT, winH, outerD, winCX - winW / 2 - outerT / 2, winCY, outerD / 2 - 0.01, outerFrameMat);
  addBoxTo(group, outerT, winH, outerD, winCX + winW / 2 + outerT / 2, winCY, outerD / 2 - 0.01, outerFrameMat);

  // Moldura escalonada exterior (bisel perimetral)
  const trimT = 0.04;
  const trimD = 0.055;
  const totalOuterW = winW + outerT * 2;
  const totalOuterH = winH + outerT * 2;
  addBoxTo(group, totalOuterW + trimT * 2, trimT, trimD, winCX, winCY + totalOuterH / 2 + trimT / 2, trimD / 2 - 0.01, bevelDarkMat);
  addBoxTo(group, trimT, totalOuterH, trimD, winCX - totalOuterW / 2 - trimT / 2, winCY, trimD / 2 - 0.01, bevelDarkMat);
  addBoxTo(group, trimT, totalOuterH, trimD, winCX + totalOuterW / 2 + trimT / 2, winCY, trimD / 2 - 0.01, bevelDarkMat);

  // --- 3. Repisa / Alféizar inferior sobresaliente con sombra propia ---
  const sillW = totalOuterW + 0.36;
  const sillH = 0.09;
  const sillD = 0.16;
  const sillY = winCY - winH / 2 - outerT - sillH / 2 + 0.01;
  addBoxTo(group, sillW, sillH, sillD, winCX, sillY, sillD / 2 - 0.01, outerFrameMat);
  addBoxTo(group, sillW - 0.18, 0.06, 0.07, winCX, sillY - sillH / 2 - 0.03, 0.025, innerSashMat);

  const sillShadowGeo = new THREE.PlaneGeometry(sillW + 0.2, 0.32);
  const sillShadowMat = new THREE.ShaderMaterial({
    vertexShader: dropShadowShader.vertexShader,
    fragmentShader: dropShadowShader.fragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(sillW + 0.2, winH * 0 + 0.32) },
      uBlur: { value: 0.14 },
      uOpacity: { value: 0.48 },
    },
    transparent: true,
    depthWrite: false,
  });
  const sillShadow = new THREE.Mesh(sillShadowGeo, sillShadowMat);
  sillShadow.position.set(winCX, sillY - sillH / 2 - 0.08, -0.01);
  sillShadow.renderOrder = 0;
  group.add(sillShadow);

  // --- 4. Dos hojas batientes (izquierda y derecha) que rotan sobre sus bisagras exteriores ---
  const leafW = winW / 2; // cada hoja ocupa exactamente la mitad del vano
  const sashT = 0.085;    // grosor del perfil de la hoja
  const sashD = 0.075;    // profundidad de la hoja
  const hingeZ = sashD / 2;

  const glintState = { value: 2.4 };
  const paneGlassUniformsList = [];
  const sashes = [];
  const windowState = { open: false };

  for (const side of [-1, 1]) {
    // El pivote (bisagra) se ubica en el borde exterior izquierdo (-1) o derecho (+1) de la ventana
    const hingeX = winCX + side * (winW / 2);
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, winCY, hingeZ);
    group.add(pivot);

    // Dentro del pivot, el centro de la hoja está desplazado hacia el centro de la ventana:
    // para side = -1 (izq), el centro de la hoja está en +leafW / 2
    // para side = +1 (der), el centro de la hoja está en -leafW / 2
    const localCX = -side * (leafW / 2);
    const localZ = 0;

    // Sub-marco de la hoja (arriba, abajo, borde exterior y borde central de cierre)
    addBoxTo(pivot, leafW, sashT, sashD, localCX, winH / 2 - sashT / 2, localZ, innerSashMat);
    addBoxTo(pivot, leafW, sashT, sashD, localCX, -winH / 2 + sashT / 2, localZ, innerSashMat);
    // Perfil lado bisagra
    addBoxTo(pivot, sashT, winH - sashT * 2, sashD, -side * (sashT / 2), 0, localZ, innerSashMat);
    // Perfil lado central (donde se juntan las dos hojas)
    addBoxTo(pivot, sashT, winH - sashT * 2, sashD, -side * (leafW - sashT / 2), 0, localZ, outerFrameMat);

    // Solapa central (astrágalo) para que cerradas se vean perfectamente unidas
    addBoxTo(pivot, 0.03, winH, sashD + 0.015, -side * (leafW - 0.015), 0, localZ + 0.008, outerFrameMat);

    // Junquillo interior oscuro que enmarca el cristal
    const innerGlassW = leafW - sashT * 2;
    const innerGlassH = winH - sashT * 2;
    const beadT = 0.022;
    const beadD = 0.045;
    addBoxTo(pivot, innerGlassW, beadT, beadD, localCX, innerGlassH / 2 - beadT / 2, localZ, bevelDarkMat);
    addBoxTo(pivot, innerGlassW, beadT, beadD, localCX, -innerGlassH / 2 + beadT / 2, localZ, bevelDarkMat);
    addBoxTo(pivot, beadT, innerGlassH, beadD, localCX - innerGlassW / 2 + beadT / 2, 0, localZ, bevelDarkMat);
    addBoxTo(pivot, beadT, innerGlassH, beadD, localCX + innerGlassW / 2 - beadT / 2, 0, localZ, bevelDarkMat);

    // Travesaño horizontal decorativo en cada hoja
    addBoxTo(pivot, innerGlassW, 0.035, 0.05, localCX, 0.04, localZ, innerSashMat);

    // Cristal de la hoja (DoubleSide para verse bien al abrirse en ángulo)
    const paneUniforms = {
      uGlint: { value: glintState.value },
      uPaneOffset: { value: side === -1 ? 0.0 : 1.05 },
    };
    paneGlassUniformsList.push(paneUniforms);

    const paneGlassGeo = new THREE.PlaneGeometry(innerGlassW, innerGlassH);
    const paneGlassMat = new THREE.ShaderMaterial({
      vertexShader: glassShader.vertexShader,
      fragmentShader: glassShader.fragmentShader,
      uniforms: paneUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const paneGlass = new THREE.Mesh(paneGlassGeo, paneGlassMat);
    paneGlass.position.set(localCX, 0, localZ);
    paneGlass.renderOrder = 1;
    pivot.add(paneGlass);

    // Bisagras metálicas exteriores (arriba y abajo)
    for (const hy of [winH * 0.34, -winH * 0.34]) {
      addBoxTo(pivot, 0.028, 0.14, 0.035, -side * 0.01, hy, sashD / 2, handleMat);
    }

    // Manija metálica 3D en el borde central de cada hoja (con pivote propio para girar al abrir)
    const handleX = -side * (leafW - sashT * 0.55);
    const handleY = -0.12;
    addBoxTo(pivot, 0.028, 0.11, 0.02, handleX, handleY, sashD / 2 + 0.01, handleMat);

    const handlePivot = new THREE.Group();
    handlePivot.position.set(handleX, handleY + 0.02, sashD / 2 + 0.028);
    pivot.add(handlePivot);
    addBoxTo(handlePivot, 0.022, 0.16, 0.025, 0, -0.06, 0, handleMat);

    sashes.push({
      pivot,
      handlePivot,
      side,
    });
  }

  // --- Barra de cortina (cilindro con sombreado 3D) por delante del marco ---
  const rodTL = uvToLocal(ROD.u0, ROD.v0);
  const rodBR = uvToLocal(ROD.u1, ROD.v1);
  const rodLen = rodBR.x - rodTL.x;
  const rodY = (rodTL.y + rodBR.y) / 2;
  const rodRadius = 0.04;

  const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLen, 16);
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.35,
    metalness: 0.45,
  });
  const rodMesh = new THREE.Mesh(rodGeo, rodMat);
  rodMesh.rotation.z = Math.PI / 2;
  rodMesh.position.set((rodTL.x + rodBR.x) / 2, rodY, 0.32);
  rodMesh.renderOrder = 3;
  group.add(rodMesh);

  // Sombra proyectada por la barra sobre la pared
  const rodShadowGeo = new THREE.PlaneGeometry(rodLen + 0.3, 0.24);
  const rodShadowMat = new THREE.ShaderMaterial({
    vertexShader: dropShadowShader.vertexShader,
    fragmentShader: dropShadowShader.fragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(rodLen + 0.3, 0.24) },
      uBlur: { value: 0.11 },
      uOpacity: { value: 0.38 },
    },
    transparent: true,
    depthWrite: false,
  });
  const rodShadowMesh = new THREE.Mesh(rodShadowGeo, rodShadowMat);
  rodShadowMesh.position.set((rodTL.x + rodBR.x) / 2, rodY - 0.06, -0.008);
  rodShadowMesh.renderOrder = 0;
  group.add(rodShadowMesh);

  // Finiales de la barra (esferas en los extremos)
  const finialGeo = new THREE.SphereGeometry(rodRadius * 1.6, 12, 12);
  const finialMat = new THREE.MeshStandardMaterial({
    color: 0x6B5B45,
    roughness: 0.3,
    metalness: 0.5,
  });
  for (const side of [-1, 1]) {
    const f = new THREE.Mesh(finialGeo, finialMat);
    f.position.set((rodTL.x + rodBR.x) / 2 + side * rodLen / 2, rodY, 0.32);
    f.renderOrder = 3;
    group.add(f);
  }

  // --- Cortinas (2 planos con shader) por delante de la ventana ---
  const curtTL = uvToLocal(CURTAIN.u0, CURTAIN.v0);
  const curtBR = uvToLocal(CURTAIN.u1, CURTAIN.v1);
  const curtFullW = (curtBR.x - curtTL.x) / 2; // ancho de cada cortina
  const curtH = curtTL.y - curtBR.y;
  const curtTop = curtTL.y;
  const curtBot = curtBR.y;
  const curtCY = (curtTop + curtBot) / 2;

  const curtainColors = {
    light: new THREE.Color(0xb5a99a),
    dark: new THREE.Color(0x9a9aaa),
  };

  const curtainSegmentsX = 96;
  const curtainSegmentsY = 64;

  // Geometrías y material para las argollas que conectan cada cortina con la barra
  const RINGS_PER_CURTAIN = 8;
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a35,
    roughness: 0.28,
    metalness: 0.65,
  });
  const torusGeo = new THREE.TorusGeometry(rodRadius * 1.48, 0.013, 12, 24);
  const connectorH = Math.max(0.02, rodY - curtTop);
  const clipGeo = new THREE.CylinderGeometry(0.011, 0.011, connectorH + 0.03, 10);
  const eyeletGeo = new THREE.BoxGeometry(0.032, 0.028, 0.028);

  const curtains = [];
  const curtainMeshes = [];
  const curtainState = { open: true }; // empiezan abiertas

  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(curtFullW, curtH, curtainSegmentsX, curtainSegmentsY);

    const uniforms = {
      uFold: { value: 0.0 },
      uSide: { value: side },
      uTime: { value: 0.0 },
      uMotion: { value: 0.0 },
      uRipple: { value: 0.0 },
      uScaleX: { value: 0.28 },
      uColor: { value: (curtainColors[theme] || curtainColors.light).clone() },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: curtainVertexShader,
      fragmentShader: curtainFragmentShader,
      uniforms,
      transparent: false,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;

    const edgeX = side === -1 ? curtTL.x : curtBR.x;
    const openW = curtFullW * 0.28;

    mesh.position.set(
      edgeX + side * (-curtFullW / 2),
      curtCY,
      0.34,
    );

    group.add(mesh);
    curtainMeshes.push(mesh);

    // Sombra 3D proyectada detrás de cada paño de cortina (se mueve y escala con la cortina)
    const curtShadowW = curtFullW + 0.36;
    const curtShadowH = curtH + 0.28;
    const curtShadowGeo = new THREE.PlaneGeometry(curtShadowW, curtShadowH);
    const curtShadowUniforms = {
      uSize: { value: new THREE.Vector2(curtShadowW, curtShadowH) },
      uBlur: { value: 0.22 },
      uOpacity: { value: 0.45 },
    };
    const curtShadowMat = new THREE.ShaderMaterial({
      vertexShader: dropShadowShader.vertexShader,
      fragmentShader: dropShadowShader.fragmentShader,
      uniforms: curtShadowUniforms,
      transparent: true,
      depthWrite: false,
    });
    const curtShadowMesh = new THREE.Mesh(curtShadowGeo, curtShadowMat);
    curtShadowMesh.position.set(mesh.position.x, curtCY - 0.04, 0.16);
    curtShadowMesh.renderOrder = 1.5;
    group.add(curtShadowMesh);

    // Crear las argollas para esta cortina (se deslizan sin deformarse junto con la tela)
    const rings = [];
    for (let i = 0; i < RINGS_PER_CURTAIN; i++) {
      // offset normalizado dentro de la cortina (-0.45 a +0.45 del ancho)
      const localNormX = -0.45 + (i / (RINGS_PER_CURTAIN - 1)) * 0.90;

      const ringGroup = new THREE.Group();
      ringGroup.position.set(0, rodY, 0.32);

      // Aro que abraza la barra (ligeramente girado en Y para lucir su volumen 3D)
      const torus = new THREE.Mesh(torusGeo, ringMat);
      torus.rotation.y = Math.PI * 0.38;
      torus.renderOrder = 4;
      ringGroup.add(torus);

      // Presilla vertical que baja desde el aro hasta el borde superior de la cortina
      const clip = new THREE.Mesh(clipGeo, ringMat);
      clip.position.set(0, -connectorH * 0.55, 0.015);
      clip.renderOrder = 4;
      ringGroup.add(clip);

      // Broche / ojal donde sujeta la tela arriba
      const eyelet = new THREE.Mesh(eyeletGeo, ringMat);
      eyelet.position.set(0, -(rodY - curtTop) - 0.01, 0.02);
      eyelet.renderOrder = 4;
      ringGroup.add(eyelet);

      group.add(ringGroup);
      rings.push({ group: ringGroup, localNormX });
    }

    curtains.push({
      mesh,
      shadowMesh: curtShadowMesh,
      mat,
      uniforms,
      side,
      edgeX,
      fullW: curtFullW,
      openW,
      geo,
      rings,
      progress: 0, // 0 = abierta, 1 = cerrada
      prevLeadX: 0,
      smoothVel: 0,
      clothLag: 0,
      clothVel: 0,
      ripple: 0,
    });
  }

  let currentTheme = theme || 'light';
  let currentRoomLightPower = 1.0;
  let currentCurtainOpen = 1.0;

  function syncWindowLighting() {
    const isDark = currentTheme === 'dark';
    const baseCol = curtainColors[currentTheme] || curtainColors.light;

    // Al cerrar las cortinas o apagar la luz del techo, la tela interior y el marco también se oscurecen
    const clothBright = isDark
      ? (0.34 + 0.30 * currentCurtainOpen + 0.36 * currentRoomLightPower)
      : (0.28 + 0.44 * currentCurtainOpen + 0.28 * currentRoomLightPower);

    for (const c of curtains) {
      c.uniforms.uColor.value.copy(baseCol).multiplyScalar(clothBright);
    }

    const lightFactor = isDark
      ? (0.25 + 0.35 * currentCurtainOpen + 0.40 * currentRoomLightPower)
      : (0.20 + 0.50 * currentCurtainOpen + 0.30 * currentRoomLightPower);

    ambientLight.intensity = (isDark ? 0.38 : 0.68) * lightFactor;
    dirLight.intensity = (isDark ? 0.55 : 0.95) * lightFactor;
    dirLight.color.setHex(isDark ? 0xc8daff : 0xfff6ea);
  }

  // Aplica el progreso (0 = abierta, 1 = cerrada) a posición, escala y pliegues
  function applyCurtainProgress(c) {
    const t = c.progress;
    const minScale = c.openW / c.fullW;
    const scaleX = minScale + (1.0 - minScale) * t;
    const currentW = c.fullW * scaleX;
    c.mesh.scale.x = scaleX;
    c.mesh.position.x = c.edgeX - c.side * (currentW * 0.5);
    c.uniforms.uFold.value = t;
    c.uniforms.uScaleX.value = scaleX;

    if (c.side === -1) {
      currentCurtainOpen = 1.0 - t;
      syncWindowLighting();
      if (typeof onCurtainChange === 'function') {
        onCurtainChange(currentCurtainOpen);
      }
    }
  }

  // Sincroniza la posición X de cada argolla y la sombra proyectada con su cortina
  function syncRings() {
    for (const c of curtains) {
      const currentW = c.fullW * c.mesh.scale.x;
      for (const r of c.rings) {
        // Las argollas cercanas al borde móvil sienten también un sutil retraso elástico
        const leadWeight = c.side === -1 ? (r.localNormX + 0.45) / 0.90 : (0.45 - r.localNormX) / 0.90;
        const elasticOffset = c.clothLag * 0.07 * leadWeight * (1.0 - leadWeight);
        r.group.position.x = c.mesh.position.x + r.localNormX * currentW + elasticOffset;
        // Las argollas se inclinan suavemente sobre la barra al ser jaladas por la cortina
        r.group.rotation.z = THREE.MathUtils.clamp(-c.clothLag * (0.25 + 0.75 * leadWeight) * 0.38, -0.24, 0.24);
      }
      if (c.shadowMesh) {
        c.shadowMesh.position.x = c.mesh.position.x - c.side * 0.03 + c.clothLag * 0.22;
        c.shadowMesh.scale.x = Math.max(0.36, c.mesh.scale.x * 1.08);
      }
    }
  }

  // Estado abierto inicial: comprimir las cortinas a los lados
  for (const c of curtains) {
    c.progress = 0;
    applyCurtainProgress(c);
    c.prevLeadX = c.mesh.position.x - c.side * (c.fullW * c.mesh.scale.x * 0.5);
  }
  syncRings();

  // ─── Barrido de reflejo en los cristales ───
  function sweepGlint(forward = true, delay = 0) {
    anime.remove(glintState);
    glintState.value = forward ? -0.5 : 2.2;
    anime({
      targets: glintState,
      value: forward ? 2.4 : -0.5,
      delay,
      duration: forward ? 1300 : 950,
      easing: 'easeInOutSine',
      update: () => {
        for (const u of paneGlassUniformsList) u.uGlint.value = glintState.value;
      },
    });
  }

  // ─── Animación de abrir/cerrar las 2 hojas de la ventana ───
  let animatingWindow = false;

  function setWindowOpen(open, onDone) {
    if (windowState.open === open && !animatingWindow) {
      if (onDone) onDone();
      return;
    }
    animatingWindow = true;
    windowState.open = open;

    // Barrer el reflejo por los cristales mientras se mueven las hojas
    sweepGlint(open, 80);

    let completed = 0;
    for (const s of sashes) {
      anime.remove([s.pivot.rotation, s.handlePivot.rotation]);

      // 1. Girar manija (90° al abrir, vuelve a 0° al cerrar)
      const targetHandleZ = open ? s.side * (Math.PI / 2.2) : 0;
      anime({
        targets: s.handlePivot.rotation,
        z: targetHandleZ,
        duration: 380,
        delay: open ? 0 : 750,
        easing: 'easeInOutQuad',
      });

      // 2. Abatir cada hoja hacia adentro sobre su bisagra exterior (~62 grados)
      // Izquierda (side = -1) gira -Y para abrir hacia +Z; derecha (side = +1) gira +Y para abrir hacia +Z
      const targetRotY = open ? s.side * 1.08 : 0;
      anime({
        targets: s.pivot.rotation,
        y: targetRotY,
        duration: 1200,
        delay: open ? 180 : 0,
        easing: 'easeInOutCubic',
        complete: () => {
          completed++;
          if (completed >= sashes.length) {
            animatingWindow = false;
            if (onDone) onDone();
          }
        },
      });
    }
  }

  function toggleWindow() {
    if (animatingWindow || !curtainState.open) return;
    setWindowOpen(!windowState.open);
  }

  // ─── Animación de abrir/cerrar cortinas ───
  function toggleCurtains() {
    const opening = !curtainState.open;

    // Si las hojas de la ventana están abiertas y se van a cerrar las cortinas,
    // cerramos también las hojas para que no atraviesen la tela
    if (!opening && windowState.open) {
      setWindowOpen(false);
    }

    curtainState.open = opening;
    sweepGlint(opening, opening ? 240 : 0);

    const targetProgress = opening ? 0.0 : 1.0;
    for (const c of curtains) {
      anime.remove(c);
      anime({
        targets: c,
        progress: targetProgress,
        duration: 1650,
        easing: 'cubicBezier(0.32, 0.0, 0.18, 1.0)',
        update: () => applyCurtainProgress(c),
      });
    }
  }

  // ─── Plano invisible para detectar clic en las 2 hojas de la ventana ───
  const winClickGeo = new THREE.PlaneGeometry(winW + outerT * 2, winH + outerT * 2);
  const winClickMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const windowClickMesh = new THREE.Mesh(winClickGeo, winClickMat);
  windowClickMesh.position.set(winCX, winCY, 0.16);
  windowClickMesh.userData.isWindowClick = true;
  group.add(windowClickMesh);

  // ─── Update loop (física de tela filtrada con sub-pasos para máxima fluidez) ───
  let elapsed = 0;
  function update(dt) {
    const step = Math.min(Math.max(dt, 0.001), 0.04);
    elapsed += step;

    const subSteps = 4;
    const subDt = step / subSteps;

    for (const c of curtains) {
      c.uniforms.uTime.value = elapsed;
      c.uniforms.uScaleX.value = c.mesh.scale.x;

      // Velocidad filtrada del borde móvil (elimina cualquier salto entre frames)
      const leadX = c.mesh.position.x - c.side * (c.fullW * c.mesh.scale.x * 0.5);
      const rawVel = (leadX - c.prevLeadX) / step;
      c.prevLeadX = leadX;
      c.smoothVel += (rawVel - c.smoothVel) * Math.min(1.0, step * 16.0);

      // Integración con sub-pasos del péndulo de tela para oscilación sedosa y estable
      const targetLag = THREE.MathUtils.clamp(-c.smoothVel * 0.22, -0.55, 0.55);
      for (let i = 0; i < subSteps; i++) {
        const springForce = (targetLag - c.clothLag) * 18.0 - c.clothVel * 5.2;
        c.clothVel += springForce * subDt;
        c.clothLag += c.clothVel * subDt;
      }

      // Envolvente suave de ondas en la tela
      const speedNorm = Math.min(1.0, Math.abs(c.smoothVel) * 0.48 + Math.abs(c.clothVel) * 0.28);
      c.ripple += (speedNorm - c.ripple) * Math.min(1.0, step * 6.0);

      c.uniforms.uMotion.value = c.clothLag;
      c.uniforms.uRipple.value = c.ripple;
    }
    syncRings();
  }

  function setRoomLightPower(power) {
    currentRoomLightPower = power;
    syncWindowLighting();
  }

  // ─── Cambiar tema ───
  function setTheme(newTheme) {
    currentTheme = newTheme;
    viewMat.map = viewTextures[newTheme] || viewTextures.light;
    viewMat.needsUpdate = true;
    syncWindowLighting();
  }
  setTheme(theme);

  return {
    group,
    curtainMeshes,
    windowClickMesh,
    toggleCurtains,
    toggleWindow,
    setWindowOpen,
    setRoomLightPower,
    update,
    setTheme,
    curtainState,
    windowState,
  };
}
