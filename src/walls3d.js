// walls3d.js – Paredes y techo procedurales 3D (estilo CSS/Shader + molduras 3D de cornisa y zócalo)
// Reemplaza las imágenes pesadas .jpg de las paredes y del techo para una carga instantánea
// y permite que la iluminación de la habitación reaccione en tiempo real a los interruptores y a las cortinas.

import * as THREE from 'three';

const WALL_SIZE = 10;

// Shader procedural para las 4 paredes:
// - Pintura mate cálida con grano micro-texturizado de estuco
// - Cornisa superior escalonada y zócalo blanco inferior con bisel y sombra
// - Iluminación dinámica combinada: lámpara del techo (uCeilingPower) + luz natural de ventana/cortinas (uCurtainOpen)
const wallPaintShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uIsDark;
    uniform float uCeilingPower; // 0 = lámpara techo apagada, 1 = encendida
    uniform float uCurtainOpen;  // 0 = cortinas cerradas, 1 = cortinas abiertas
    uniform float uWallSeed;
    varying vec2 vUv;

    // Ruido pseudo-aleatorio suave para textura mate de pintura/estuco sin banding
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      float u = vUv.x;
      float y = vUv.y; // 0.0 = piso (abajo), 1.0 = techo (arriba)

      // Micro-grano de estuco muy sutil
      float grain = (hash(vUv * 420.0 + uWallSeed) - 0.5) * 0.010;

      // Sombreado horizontal suave hacia las esquinas izquierda y derecha de la pared
      float edgeDistX = abs(u - 0.5) * 2.0; // 0 en el centro, 1 en las esquinas
      float cornerShade = smoothstep(0.15, 1.0, edgeDistX);

      // Factor combinado de luz ambiental en la habitación:
      // - Si cortinas abiertas (1) y luz techo encendida (1) -> 1.00 (100%)
      // - Si cortinas cerradas (0) y luz techo encendida (1) -> ~0.50 (oscurece al bloquear el sol, queda luz interior)
      // - Si cortinas abiertas (1) y luz techo apagada (0)   -> ~0.66 (queda solo luz natural de la ventana)
      // - Si cortinas cerradas (0) y luz techo apagada (0)   -> ~0.14 (habitación a oscuras / penumbra)
      float dayAmbient = 0.14 + 0.52 * uCurtainOpen + 0.34 * uCeilingPower;
      float nightAmbient = 0.22 + 0.32 * uCurtainOpen + 0.46 * uCeilingPower;

      // =========================================================================
      // 1. ZÓCALO INFERIOR (RODAPIÉ BLANCO/MARFIL: y = 0.000 .. 0.032)
      // =========================================================================
      if (y < 0.032) {
        vec3 baseLight = mix(vec3(0.796, 0.729, 0.690), vec3(0.722, 0.651, 0.612), cornerShade * 0.85) * dayAmbient;
        vec3 baseDark  = mix(vec3(0.424, 0.400, 0.427), vec3(0.310, 0.290, 0.318), cornerShade * 0.90) * nightAmbient;

        vec3 baseCol = mix(baseLight, baseDark, uIsDark);

        // Línea de brillo en el bisel superior del zócalo (y ~ 0.029..0.032)
        float topLip = smoothstep(0.027, 0.0315, y);
        float lipStrength = mix(dayAmbient, nightAmbient * 0.55, uIsDark);
        baseCol += vec3(0.055, 0.050, 0.048) * topLip * lipStrength;

        // Sombra fina de contacto contra el piso (y ~ 0.000..0.004)
        float floorAO = 1.0 - smoothstep(0.0, 0.004, y) * 0.14;
        gl_FragColor = vec4(baseCol * floorAO + grain * 0.5, 1.0);
        return;
      }

      // =========================================================================
      // 2. CORNISA SUPERIOR Y BANDA DEL TECHO (y = 0.928 .. 1.000)
      // =========================================================================
      if (y > 0.928) {
        // Banda superior pegada al techo (y = 0.968 .. 1.000)
        if (y > 0.968) {
          vec3 fasciaLight = mix(vec3(0.792, 0.710, 0.667), vec3(0.718, 0.635, 0.592), cornerShade * 0.85) * dayAmbient;
          vec3 fasciaDark  = mix(vec3(0.275, 0.259, 0.282), vec3(0.188, 0.176, 0.196), cornerShade * 0.90) * nightAmbient;
          vec3 fasciaCol = mix(fasciaLight, fasciaDark, uIsDark);
          gl_FragColor = vec4(fasciaCol + grain * 0.5, 1.0);
          return;
        }

        // Moldura escalonada de la cornisa (y = 0.928 .. 0.968)
        float t = (y - 0.928) / 0.040; // 0 abajo de la moldura, 1 arriba
        vec3 moldLight = mix(vec3(0.835, 0.765, 0.722), vec3(0.753, 0.678, 0.635), cornerShade * 0.85) * dayAmbient;
        vec3 moldDark  = mix(vec3(0.365, 0.345, 0.373), vec3(0.245, 0.231, 0.255), cornerShade * 0.90) * nightAmbient;
        vec3 moldCol = mix(moldLight, moldDark, uIsDark);

        // Surcos horizontales clásicos de la moldura (relieve arquitectónico)
        float stepWave = sin(t * 3.14159265 * 4.0);
        float grooveShade = stepWave * mix(0.038 * dayAmbient, 0.045 * nightAmbient, uIsDark);
        moldCol += vec3(grooveShade);

        gl_FragColor = vec4(moldCol + grain * 0.4, 1.0);
        return;
      }

      // =========================================================================
      // 3. PINTURA PRINCIPAL DE LA PARED (y = 0.032 .. 0.928)
      // =========================================================================
      // Modo Día: tonos durazno/terracota suave
      vec3 dayCenter  = vec3(0.784, 0.608, 0.486); // #c89b7c tono medio cálido
      vec3 dayEdge    = vec3(0.624, 0.471, 0.376); // #9f7860 sombreado suave en esquinas
      vec3 dayHotspot = vec3(0.859, 0.686, 0.561); // #dbaf8f halo cálido superior central

      // Distancia radial al foco cálido superior-central (u = 0.50, y = 0.73)
      vec2 spotDelta = vec2((u - 0.5) * 1.15, (y - 0.73) * 1.35);
      float spotDist = length(spotDelta);
      float warmSpot = exp(-spotDist * spotDist * 2.6);

      // Viñeteado suave perimetral hacia las esquinas y bordes superior/inferior
      float vertEdge = smoothstep(0.32, 0.928, abs(y - 0.52) * 1.85);
      float vignette = clamp(cornerShade * 0.72 + vertEdge * 0.38, 0.0, 1.0);

      vec3 dayBase = mix(dayCenter, dayEdge, vignette);
      // Parte iluminada por la ventana (uCurtainOpen) vs parte iluminada por la lámpara del techo (uCeilingPower)
      vec3 dayWall = dayBase * dayAmbient;
      // Halo cálido superior proyectado por la lámpara del techo cuando está encendida (resalta más al cerrar cortinas)
      dayWall += vec3(0.18, 0.12, 0.07) * warmSpot * uCeilingPower * mix(1.35, 0.65, uCurtainOpen);
      // Ligero realce natural superior cuando las cortinas están abiertas
      dayWall = mix(dayWall, dayHotspot, warmSpot * 0.32 * uCurtainOpen);

      // Modo Noche: gris carbón cálido
      vec3 nightBase = mix(vec3(0.086, 0.078, 0.086), vec3(0.055, 0.051, 0.059), vignette);
      vec2 nightSpotDelta = vec2((u - 0.5) * 1.35, (y - 0.76) * 1.65);
      float nightSpot = exp(-dot(nightSpotDelta, nightSpotDelta) * 3.2);
      vec3 nightGlow = vec3(0.155, 0.108, 0.082) * nightSpot * uCeilingPower;
      vec3 nightWall = nightBase * nightAmbient + nightGlow;

      vec3 wallCol = mix(dayWall, nightWall, uIsDark);

      // Sombra proyectada inmediatamente debajo de la cornisa superior (y ~ 0.912..0.928)
      float underCrown = smoothstep(0.912, 0.928, y);
      wallCol *= 1.0 - underCrown * mix(0.08, 0.22, uIsDark);

      // Sombra sutil de oclusión justo encima del zócalo (y ~ 0.032..0.045)
      float aboveBaseboard = 1.0 - smoothstep(0.032, 0.046, y);
      wallCol *= 1.0 - aboveBaseboard * mix(0.04, 0.10, uIsDark);

      gl_FragColor = vec4(wallCol + grain, 1.0);
    }
  `,
};

// Construye las molduras arquitectónicas en 3D real (zócalo inferior y cornisa superior)
// para una pared de 10x10 unidades. En la pared 'trasera', el zócalo se interrumpe en el vano de la puerta.
function createWallMoldings3D(moldingMat, trimMat, wallName = '') {
  const moldingGroup = new THREE.Group();

  // 1. Zócalo / Rodapié inferior 3D (y = -5.0 a -4.68)
  const baseStartU = wallName === 'trasera' ? 0.282 : 0.0;
  const baseW = WALL_SIZE * (1.0 - baseStartU);
  const baseCenterX = ((baseStartU + 1.0) * 0.5 - 0.5) * WALL_SIZE;

  const baseH = 0.32;
  const baseD = 0.016;
  const baseboard = new THREE.Mesh(
    new THREE.BoxGeometry(baseW, baseH, baseD),
    moldingMat
  );
  baseboard.position.set(baseCenterX, -WALL_SIZE / 2 + baseH / 2, baseD / 2);
  moldingGroup.add(baseboard);

  // Bisel superior del zócalo
  const baseLipH = 0.028;
  const baseLipD = 0.020;
  const baseLip = new THREE.Mesh(
    new THREE.BoxGeometry(baseW, baseLipH, baseLipD),
    trimMat
  );
  baseLip.position.set(baseCenterX, -WALL_SIZE / 2 + baseH - baseLipH / 2, baseLipD / 2);
  moldingGroup.add(baseLip);

  // 2. Cornisa superior escalonada 3D (y = +4.28 a +5.0)
  const fasciaH = 0.32;
  const fasciaD = 0.032;
  const topFascia = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SIZE, fasciaH, fasciaD),
    moldingMat
  );
  topFascia.position.set(0, WALL_SIZE / 2 - fasciaH / 2, fasciaD / 2);
  moldingGroup.add(topFascia);

  // Escalón intermedio de la cornisa (y = +4.46 a +4.68)
  const step1H = 0.22;
  const step1D = 0.046;
  const crownStep1 = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SIZE, step1H, step1D),
    trimMat
  );
  crownStep1.position.set(0, WALL_SIZE / 2 - fasciaH - step1H / 2, step1D / 2);
  moldingGroup.add(crownStep1);

  // Escalón inferior fino de la cornisa (y = +4.28 a +4.46)
  const step2H = 0.18;
  const step2D = 0.026;
  const crownStep2 = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SIZE, step2H, step2D),
    moldingMat
  );
  crownStep2.position.set(0, WALL_SIZE / 2 - fasciaH - step1H - step2H / 2, step2D / 2);
  moldingGroup.add(crownStep2);

  return moldingGroup;
}

export function setupProceduralWalls3D(walls, theme = 'light') {
  const isDark = theme === 'dark' ? 1.0 : 0.0;
  const wallUniformsList = [];

  // Materiales 3D compartidos para los zócalos y cornisas de las 4 paredes
  const moldingMat = new THREE.MeshStandardMaterial({
    color: theme === 'dark' ? 0x625d64 : 0xd2c1b7,
    roughness: 0.48,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: theme === 'dark' ? 0x746e76 : 0xdfd0c6,
    roughness: 0.42,
    metalness: 0.05,
  });

  let seed = 1.0;
  for (const [name, w] of Object.entries(walls)) {
    const uniforms = {
      uIsDark: { value: isDark },
      uCeilingPower: { value: 1.0 },
      uCurtainOpen: { value: 1.0 },
      uWallSeed: { value: seed * 13.37 },
    };
    seed += 1.0;
    wallUniformsList.push(uniforms);

    const mat = new THREE.ShaderMaterial({
      vertexShader: wallPaintShader.vertexShader,
      fragmentShader: wallPaintShader.fragmentShader,
      uniforms,
    });

    if (w.mesh.material) w.mesh.material.dispose();
    w.mesh.material = mat;

    // Añadir las molduras 3D de zócalo y cornisa a cada pared
    const moldings = createWallMoldings3D(moldingMat, trimMat, name);
    w.mesh.add(moldings);
  }

  let currentTheme = theme;
  let currentPower = 1.0;
  let currentCurtainOpen = 1.0;

  function syncMoldingColors() {
    const dark = currentTheme === 'dark';
    const baseHex = dark ? 0x625d64 : 0xd2c1b7;
    const trimHex = dark ? 0x746e76 : 0xdfd0c6;
    const dimFactor = dark
      ? (0.22 + 0.32 * currentCurtainOpen + 0.46 * currentPower)
      : (0.18 + 0.50 * currentCurtainOpen + 0.32 * currentPower);

    moldingMat.color.setHex(baseHex).multiplyScalar(dimFactor);
    trimMat.color.setHex(trimHex).multiplyScalar(dimFactor);
  }

  function setTheme(newTheme) {
    currentTheme = newTheme;
    const darkVal = newTheme === 'dark' ? 1.0 : 0.0;
    for (const u of wallUniformsList) {
      u.uIsDark.value = darkVal;
    }
    syncMoldingColors();
  }

  function setCeilingLightPower(power) {
    currentPower = power;
    for (const u of wallUniformsList) {
      u.uCeilingPower.value = power;
    }
    syncMoldingColors();
  }

  function setCurtainOpen(openFactor) {
    currentCurtainOpen = openFactor;
    for (const u of wallUniformsList) {
      u.uCurtainOpen.value = openFactor;
    }
    syncMoldingColors();
  }

  setTheme(theme);

  return {
    setTheme,
    setCeilingLightPower,
    setCurtainOpen,
  };
}
