// shelves3d.js – Los 4 estantes flotantes 3D con tiras LED debajo en la pared frontal.
// Posicionados con coordenadas UV exactas sobre walls.frontal.mesh.

import * as THREE from 'three';

const WALL_SIZE = 10;

// Coordenadas UV de los 4 estantes en la pared frontal con mayor grosor y presencia 3D
const SHELVES_UV = [
  { id: 'top-left',     u0: 0.175, v0: 0.232, u1: 0.462, v1: 0.258 },
  { id: 'top-right',    u0: 0.538, v0: 0.232, u1: 0.825, v1: 0.258 },
  { id: 'bottom-left',  u0: 0.175, v0: 0.368, u1: 0.462, v1: 0.394 },
  { id: 'bottom-right', u0: 0.538, v0: 0.368, u1: 0.825, v1: 0.394 },
];

function uvToLocal(u, v) {
  return new THREE.Vector2((u - 0.5) * WALL_SIZE, (0.5 - v) * WALL_SIZE);
}

// Shader para el halo de luz cálida proyectado por cada tira LED bajo el estante
const ledWallGlowShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorCore;
    uniform vec3 uColorHalo;
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
      // vUv.y = 1.0 justo pegado debajo de la tira LED, 0.0 abajo del todo
      float verticalFalloff = pow(clamp(vUv.y, 0.0, 1.0), 1.85);

      // Atenuación suave hacia los extremos izquierdo y derecho de la tira LED
      float edgeFade = smoothstep(0.0, 0.09, vUv.x) * smoothstep(0.0, 0.09, 1.0 - vUv.x);

      // Forma trapezoidal sutil del cono de luz al abrirse hacia abajo
      float coneSpread = mix(0.14, 0.04, vUv.y);
      float coneMask = smoothstep(0.0, coneSpread, vUv.x) * smoothstep(0.0, coneSpread, 1.0 - vUv.x);

      // Núcleo brillante pegado al borde inferior del estante
      float hotCore = exp(-pow((1.0 - vUv.y) * 14.0, 2.0)) * edgeFade;

      float alpha = (verticalFalloff * 0.58 * coneMask + hotCore * 0.75) * uIntensity;
      vec3 col = mix(uColorHalo, uColorCore, clamp(hotCore * 1.4 + pow(vUv.y, 4.0) * 0.5, 0.0, 1.0));

      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
    }
  `,
};

// Sombra de contacto suave detrás de cada estante contra la pared
const shelfShadowShader = {
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

export function createShelves3D(theme = 'light') {
  const group = new THREE.Group();
  group.position.z = 0.015; // ligeramente delante de la pared frontal

  // Materiales 3D de madera cálida para los estantes flotantes
  const woodMainMat = new THREE.MeshStandardMaterial({
    color: 0xa6754e,
    roughness: 0.46,
    metalness: 0.06,
  });

  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x8f603c,
    roughness: 0.52,
    metalness: 0.08,
  });

  // Canal de aluminio empotrado bajo el estante para alojar la tira LED
  const channelMat = new THREE.MeshStandardMaterial({
    color: 0x3b3530,
    roughness: 0.35,
    metalness: 0.6,
  });

  // Difusor físico 3D de la tira LED (emite luz propia)
  const ledStripMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c8,
  });

  const glowUniformsList = [];
  const shelfLights = [];

  const shelfDepth = 0.48; // profundidad 3D hacia afuera de la pared (+Z)

  for (const s of SHELVES_UV) {
    const tl = uvToLocal(s.u0, s.v0);
    const br = uvToLocal(s.u1, s.v1);
    const w = br.x - tl.x;
    const h = tl.y - br.y;
    const cx = (tl.x + br.x) / 2;
    const cy = (tl.y + br.y) / 2;

    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(cx, cy, 0);
    group.add(shelfGroup);

    // 1. Sombra suave de montaje sobre la pared detrás del estante
    const padX = 0.16;
    const padY = 0.10;
    const shadowGeo = new THREE.PlaneGeometry(w + padX, h + padY);
    const shadowMat = new THREE.ShaderMaterial({
      vertexShader: shelfShadowShader.vertexShader,
      fragmentShader: shelfShadowShader.fragmentShader,
      uniforms: {
        uSize: { value: new THREE.Vector2(w + padX, h + padY) },
        uBlur: { value: 0.08 },
        uOpacity: { value: 0.42 },
      },
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, 0.01, -0.008);
    shelfGroup.add(shadowMesh);

    // 2. Cuerpo principal de madera 3D del estante flotante
    const plankGeo = new THREE.BoxGeometry(w, h, shelfDepth);
    const plankMesh = new THREE.Mesh(plankGeo, woodMainMat);
    plankMesh.position.set(0, 0, shelfDepth / 2);
    plankMesh.castShadow = true;
    plankMesh.receiveShadow = true;
    shelfGroup.add(plankMesh);

    // Bisel frontal de madera para darle acabado realista al borde del estante
    const frontLipGeo = new THREE.BoxGeometry(w + 0.01, h * 0.82, 0.022);
    const frontLipMesh = new THREE.Mesh(frontLipGeo, woodTrimMat);
    frontLipMesh.position.set(0, 0, shelfDepth + 0.008);
    shelfGroup.add(frontLipMesh);

    // 3. Tira LED 3D empotrada debajo del estante
    const ledWidth = w * 0.91; // coincide con la longitud real de las tiras LED
    const ledDepth = 0.042;
    const ledHeight = 0.022;
    const ledZ = shelfDepth * 0.46;

    // Perfil/canal metálico bajo el estante
    const channelGeo = new THREE.BoxGeometry(ledWidth + 0.04, ledHeight, ledDepth + 0.018);
    const channelMesh = new THREE.Mesh(channelGeo, channelMat);
    channelMesh.position.set(0, -h / 2 - ledHeight * 0.3, ledZ);
    shelfGroup.add(channelMesh);

    // Barra difusora luminosa 3D de la tira LED
    const ledBarGeo = new THREE.BoxGeometry(ledWidth, ledHeight * 0.9, ledDepth);
    const ledBarMesh = new THREE.Mesh(ledBarGeo, ledStripMat);
    ledBarMesh.position.set(0, -h / 2 - ledHeight * 0.65, ledZ);
    shelfGroup.add(ledBarMesh);

    // Halo volumétrico en la cara inferior del estante (ilumina la madera por debajo)
    const underGlowGeo = new THREE.PlaneGeometry(ledWidth * 1.04, shelfDepth * 0.92);
    const underGlowUniforms = {
      uColorCore: { value: new THREE.Color(0xfff2cc) },
      uColorHalo: { value: new THREE.Color(0xff9d3b) },
      uIntensity: { value: 0.9 },
    };
    const underGlowMat = new THREE.ShaderMaterial({
      vertexShader: ledWallGlowShader.vertexShader,
      fragmentShader: `
        uniform vec3 uColorCore;
        uniform vec3 uColorHalo;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float distZ = abs(vUv.y - 0.46) * 2.0;
          float radial = exp(-pow(distZ * 2.4, 2.0));
          float edgeX = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.x);
          float alpha = radial * edgeX * 0.85 * uIntensity;
          vec3 col = mix(uColorHalo, uColorCore, radial);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: underGlowUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const underGlowMesh = new THREE.Mesh(underGlowGeo, underGlowMat);
    underGlowMesh.rotation.x = Math.PI / 2;
    underGlowMesh.position.set(0, -h / 2 - 0.005, shelfDepth / 2);
    shelfGroup.add(underGlowMesh);

    // 4. Baño de luz LED proyectado hacia abajo sobre la pared bajo cada estante
    const wallGlowH = 0.55;
    const wallGlowGeo = new THREE.PlaneGeometry(ledWidth * 1.06, wallGlowH);
    const wallGlowUniforms = {
      uColorCore: { value: new THREE.Color(0xfff0c2) },
      uColorHalo: { value: new THREE.Color(0xff942e) },
      uIntensity: { value: 0.85 },
    };
    glowUniformsList.push(wallGlowUniforms, underGlowUniforms);

    const wallGlowMat = new THREE.ShaderMaterial({
      vertexShader: ledWallGlowShader.vertexShader,
      fragmentShader: ledWallGlowShader.fragmentShader,
      uniforms: wallGlowUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wallGlowMesh = new THREE.Mesh(wallGlowGeo, wallGlowMat);
    wallGlowMesh.position.set(0, -h / 2 - wallGlowH / 2 + 0.01, 0.006);
    shelfGroup.add(wallGlowMesh);

    // 5. Luz puntual 3D cálida bajo cada estante para iluminar su entorno en 3D
    const pointLight = new THREE.PointLight(0xffa94d, 0.55, 2.6, 1.8);
    pointLight.position.set(0, -h / 2 - 0.08, shelfDepth * 0.55);
    shelfGroup.add(pointLight);
    shelfLights.push(pointLight);
  }

  function setTheme(newTheme) {
    const isDark = newTheme === 'dark';
    woodMainMat.color.setHex(isDark ? 0x996843 : 0xad7a52);
    woodTrimMat.color.setHex(isDark ? 0x825534 : 0x94643f);
    ledStripMat.color.setHex(isDark ? 0xfff3cf : 0xffebba);

    const glowInt = isDark ? 1.0 : 0.72;
    for (const u of glowUniformsList) {
      u.uIntensity.value = glowInt;
    }
    for (const l of shelfLights) {
      l.intensity = isDark ? 0.75 : 0.42;
    }
  }
  setTheme(theme);

  return {
    group,
    setTheme,
  };
}

