// ceiling3d.js – Techo procedural completo + Lámpara empotrada 3D (plafón circular LED)
// y detector de humo 3D en la esquina, con control de encendido/apagado y respuesta a las cortinas.

import * as THREE from 'three';
import anime from 'animejs';

// Shader procedural para toda la superficie del techo (10x10):
// - Estuco mate cálido en modo día y gris carbón en modo noche
// - Reacciona tanto al interruptor de la lámpara (uPower) como a la apertura de las cortinas (uCurtainOpen)
const fullCeilingShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uPower;       // 0 = lámpara apagada, 1 = encendida
    uniform float uCurtainOpen; // 0 = cortinas cerradas, 1 = abiertas
    uniform float uIsDark;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 p = (vUv - 0.5) * 2.0; // -1 a 1 desde el centro del techo
      float r = length(p);

      // Grano fino de estuco/yeso del techo
      float grain = (hash(vUv * 360.0) - 0.5) * 0.010;

      // Viñeteado suave hacia los bordes/esquinas donde el techo se une con la cornisa
      float edgeDist = max(abs(p.x), abs(p.y));
      float cornerVignette = smoothstep(0.35, 1.0, r * 0.78);
      float perimeterAO = smoothstep(0.88, 1.0, edgeDist) * 0.08;

      // Factor ambiental combinado (ventana + lámpara techo)
      float dayAmbient   = 0.14 + 0.52 * uCurtainOpen + 0.34 * uPower;
      float nightAmbient = 0.22 + 0.32 * uCurtainOpen + 0.46 * uPower;

      // Color base del techo en modo día
      vec3 dayCenter = vec3(0.875, 0.804, 0.753); // #dfcdbf
      vec3 dayEdge   = vec3(0.796, 0.718, 0.667); // #cbb7aa
      vec3 dayCol = mix(dayCenter, dayEdge, cornerVignette) * (1.0 - perimeterAO) * dayAmbient;

      // Color base del techo en modo noche
      vec3 nightCenter = vec3(0.082, 0.078, 0.086);
      vec3 nightEdge   = vec3(0.047, 0.045, 0.051);
      vec3 nightCol = mix(nightCenter, nightEdge, cornerVignette) * nightAmbient;

      vec3 basePlaster = mix(dayCol, nightCol, uIsDark);

      // Halo cálido radial que emite la lámpara sobre el techo SOLO cuando está encendida (uPower > 0)
      // Al cerrar las cortinas en modo día, el halo cálido destaca más sobre el techo oscurecido
      float glowCore = exp(-r * 4.8) * 0.52;
      float glowMid  = exp(-r * 2.4) * 0.26;
      float glowWide = exp(-r * 1.15) * 0.10;
      float dayHaloBoost = mix(0.68, 0.28, uCurtainOpen);
      float haloStrength = (glowCore + glowMid + glowWide) * uPower * mix(dayHaloBoost, 1.0, uIsDark);

      vec3 warmGlow = vec3(1.0, 0.90, 0.72);
      vec3 finalCol = basePlaster + warmGlow * haloStrength + grain;

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `,
};

// Shader para el lente difusor LED central (cambia entre encendido brillante y vidrio esmerilado apagado)
const diffuserLensShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uPower; // 0 = apagada, 1 = encendida
    uniform float uCurtainOpen;
    uniform float uIsDark;
    varying vec2 vUv;

    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;

      // Apagada: acrílico/vidrio esmerilado mate que también se oscurece si las cortinas están cerradas
      float offRoomLight = mix(0.28, 1.0, uCurtainOpen);
      vec3 offBase = mix(vec3(0.76, 0.73, 0.69) * offRoomLight, vec3(0.26, 0.25, 0.24) * mix(0.45, 1.0, uCurtainOpen), uIsDark);
      float offVignette = mix(1.0, 0.80, smoothstep(0.25, 1.0, r));
      vec3 offColor = offBase * offVignette;

      // Encendida: núcleo blanco cálido intenso con borde suave dorado
      vec3 onCenter = vec3(1.0, 0.99, 0.93);
      vec3 onEdge = vec3(0.99, 0.89, 0.68);
      vec3 onColor = mix(onCenter, onEdge, smoothstep(0.15, 1.0, r * r));

      vec3 col = mix(offColor, onColor, uPower);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// Sombra anular suave de contacto alrededor del bisel exterior de la lámpara y del detector
const ringShadowShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uInnerR;
    uniform float uOuterR;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float r = length(vUv - 0.5) * 2.0;
      if (r < uInnerR * 0.85 || r > 1.0) discard;
      float ring = smoothstep(uInnerR * 0.88, uInnerR, r) * (1.0 - smoothstep(uInnerR + 0.04, uOuterR, r));
      gl_FragColor = vec4(0.02, 0.015, 0.01, ring * uOpacity);
    }
  `,
};

export function createCeilingLamp3D(theme = 'light', ceilingMesh = null, onPowerChange = null) {
  // caps.techo está en y = 5 con rotation.x = Math.PI / 2, por lo que +Z local apunta hacia abajo (hacia el interior del cuarto)
  const group = new THREE.Group();
  group.position.set(0.0, -0.02, 0.004); // centrada sobre la lámpara del techo

  const lampMeshes = [];
  const state = {
    on: true,
    power: 1.0,
    curtainOpen: 1.0,
    isDark: theme === 'dark' ? 1.0 : 0.0,
  };

  // --- 1. Superficie procedural completa del techo (sin necesidad de techo.jpg) ---
  const ceilingUniforms = {
    uPower: { value: 1.0 },
    uCurtainOpen: { value: 1.0 },
    uIsDark: { value: state.isDark },
  };
  const ceilingMat = new THREE.ShaderMaterial({
    vertexShader: fullCeilingShader.vertexShader,
    fragmentShader: fullCeilingShader.fragmentShader,
    uniforms: ceilingUniforms,
  });

  if (ceilingMesh) {
    if (ceilingMesh.material) ceilingMesh.material.dispose();
    ceilingMesh.material = ceilingMat;
  }

  // --- 2. Sombra perimetral del aro empotrado contra el techo ---
  const outerRadius = 0.485;
  const shadowPlaneSize = outerRadius * 2.35;
  const ringShadowMat = new THREE.ShaderMaterial({
    vertexShader: ringShadowShader.vertexShader,
    fragmentShader: ringShadowShader.fragmentShader,
    uniforms: {
      uInnerR: { value: outerRadius / (shadowPlaneSize * 0.5) },
      uOuterR: { value: 0.98 },
      uOpacity: { value: 0.68 },
    },
    transparent: true,
    depthWrite: false,
  });
  const ringShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(shadowPlaneSize, shadowPlaneSize), ringShadowMat);
  ringShadowMesh.position.z = 0.003;
  group.add(ringShadowMesh);

  // --- 3. Estructura 3D del plafón circular empotrado (aro exterior, cavidad oscura, bisel interno y difusor) ---
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d5,
    emissive: new THREE.Color(0xffe4b5),
    emissiveIntensity: 0.12,
    roughness: 0.36,
    metalness: 0.18,
  });
  const darkRecessMat = new THREE.MeshBasicMaterial({
    color: 0x1e1b18,
  });
  const innerRimMat = new THREE.MeshStandardMaterial({
    color: 0xf4eee4,
    emissive: new THREE.Color(0xffdf9e),
    emissiveIntensity: 0.25,
    roughness: 0.32,
    metalness: 0.12,
  });

  const fixtureGroup = new THREE.Group();
  fixtureGroup.position.z = 0.005;
  group.add(fixtureGroup);

  // Cilindro base del cuerpo exterior empotrado
  const housingDepth = 0.032;
  const outerCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius, outerRadius * 0.97, housingDepth, 48, 1, true),
    bezelMat
  );
  outerCylinder.rotation.x = Math.PI / 2;
  outerCylinder.position.z = housingDepth / 2;
  fixtureGroup.add(outerCylinder);

  // Cara anular frontal biselada del aro exterior (entre r = 0.365 y R = 0.485)
  const innerCutRadius = 0.365;
  const outerRingGeo = new THREE.RingGeometry(innerCutRadius, outerRadius, 48);
  const outerRingMesh = new THREE.Mesh(outerRingGeo, bezelMat);
  outerRingMesh.position.z = housingDepth;
  fixtureGroup.add(outerRingMesh);

  // Reborde redondeado 3D en el perímetro exterior e interior del aro
  const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(outerRadius - 0.012, 0.014, 16, 48), bezelMat);
  outerTorus.position.z = housingDepth - 0.004;
  fixtureGroup.add(outerTorus);

  const stepTorus = new THREE.Mesh(new THREE.TorusGeometry(innerCutRadius + 0.008, 0.012, 16, 48), bezelMat);
  stepTorus.position.z = housingDepth - 0.002;
  fixtureGroup.add(stepTorus);

  // Ranura / cavidad oscura entre el aro exterior y el aro del difusor (r = 0.338..0.365)
  const grooveRing = new THREE.Mesh(new THREE.RingGeometry(0.335, innerCutRadius + 0.004, 48), darkRecessMat);
  grooveRing.position.z = housingDepth - 0.008;
  fixtureGroup.add(grooveRing);

  // Aro interior fino que sostiene el cristal difusor (r = 0.318..0.342)
  const lensRadius = 0.322;
  const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(lensRadius + 0.010, 0.011, 14, 48), innerRimMat);
  innerCollar.position.z = housingDepth - 0.002;
  fixtureGroup.add(innerCollar);

  // --- 4. Lente difusor LED central en 3D ---
  const lensUniforms = {
    uPower: { value: 1.0 },
    uCurtainOpen: { value: 1.0 },
    uIsDark: { value: state.isDark },
  };
  const lensMat = new THREE.ShaderMaterial({
    vertexShader: diffuserLensShader.vertexShader,
    fragmentShader: diffuserLensShader.fragmentShader,
    uniforms: lensUniforms,
  });
  const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(lensRadius, 48), lensMat);
  lensMesh.position.z = housingDepth - 0.003;
  fixtureGroup.add(lensMesh);

  fixtureGroup.traverse((child) => {
    if (child.isMesh) lampMeshes.push(child);
  });

  // --- 5. Detector de humo 3D en la esquina del techo (idéntico al de techo.jpg en u = 0.128, v = 0.132) ---
  const detectorGroup = new THREE.Group();
  detectorGroup.position.set(-3.72, 3.70, 0.002);
  group.add(detectorGroup);

  const detR = 0.355;
  const detShadowSize = detR * 2.5;
  const detShadowMat = new THREE.ShaderMaterial({
    vertexShader: ringShadowShader.vertexShader,
    fragmentShader: ringShadowShader.fragmentShader,
    uniforms: {
      uInnerR: { value: detR / (detShadowSize * 0.5) },
      uOuterR: { value: 0.96 },
      uOpacity: { value: 0.42 },
    },
    transparent: true,
    depthWrite: false,
  });
  const detShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(detShadowSize, detShadowSize), detShadowMat);
  detShadowMesh.position.set(-0.025, 0.025, 0.001);
  detectorGroup.add(detShadowMesh);

  const detectorMat = new THREE.MeshStandardMaterial({
    color: 0xe6dcd2,
    roughness: 0.45,
    metalness: 0.06,
  });
  const detectorInnerMat = new THREE.MeshStandardMaterial({
    color: 0xd9cfc4,
    roughness: 0.50,
    metalness: 0.05,
  });

  // Base cilíndrica escalonada del detector de humo
  const detBase = new THREE.Mesh(new THREE.CylinderGeometry(detR, detR * 0.94, 0.048, 36), detectorMat);
  detBase.rotation.x = Math.PI / 2;
  detBase.position.z = 0.024;
  detectorGroup.add(detBase);

  const detTier2 = new THREE.Mesh(new THREE.CylinderGeometry(detR * 0.78, detR * 0.84, 0.032, 36), detectorInnerMat);
  detTier2.rotation.x = Math.PI / 2;
  detTier2.position.z = 0.056;
  detectorGroup.add(detTier2);

  // Botón central de prueba y ranuras curvas del sensor
  const testBtn = new THREE.Mesh(new THREE.CylinderGeometry(detR * 0.28, detR * 0.28, 0.012, 24), detectorMat);
  testBtn.rotation.x = Math.PI / 2;
  testBtn.position.set(-0.02, 0.01, 0.074);
  detectorGroup.add(testBtn);

  const testRing = new THREE.Mesh(new THREE.RingGeometry(detR * 0.28, detR * 0.31, 24), darkRecessMat);
  testRing.position.set(-0.02, 0.01, 0.075);
  detectorGroup.add(testRing);

  for (let i = 0; i < 3; i++) {
    const rSlot = detR * (0.44 + i * 0.08);
    const slotArc = new THREE.Mesh(
      new THREE.RingGeometry(rSlot, rSlot + 0.014, 16, 1, -0.9, 0.95),
      darkRecessMat
    );
    slotArc.position.set(0.01, -0.01, 0.075);
    detectorGroup.add(slotArc);
  }

  // Indicador LED verde 3D en el detector de humo (ubicado a la derecha de las ranuras donde señala la flecha)
  const ledPos = new THREE.Vector3(0.122, 0.038, 0.074);

  const ledBezel = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.023, 20), darkRecessMat);
  ledBezel.position.set(ledPos.x, ledPos.y, ledPos.z + 0.001);
  detectorGroup.add(ledBezel);

  const detLedMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x2eff6b),
  });
  const ledDomeGeo = new THREE.SphereGeometry(0.016, 16, 12);
  ledDomeGeo.scale(1, 1, 0.55);
  const ledDome = new THREE.Mesh(ledDomeGeo, detLedMat);
  ledDome.position.copy(ledPos);
  detectorGroup.add(ledDome);

  // Halo luminoso verde suave alrededor del LED sobre la carcasa del detector
  const ledHaloUniforms = {
    uIntensity: { value: 0.75 },
  };
  const ledHaloMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        float glow = exp(-r * 3.4) * (1.0 - smoothstep(0.6, 1.0, r));
        gl_FragColor = vec4(0.15, 1.0, 0.42, glow * uIntensity);
      }
    `,
    uniforms: ledHaloUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ledHaloMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), ledHaloMat);
  ledHaloMesh.position.set(ledPos.x, ledPos.y, ledPos.z + 0.002);
  detectorGroup.add(ledHaloMesh);

  // --- 6. Luz puntual 3D real bajo la lámpara para iluminar los objetos 3D de la habitación ---
  const ceilingLight = new THREE.PointLight(0xffe8bf, 0.65, 14, 1.4);
  ceilingLight.position.set(0, 0, 0.35); // 0.35 unidades debajo del techo hacia el centro del cuarto
  group.add(ceilingLight);

  function syncVisuals(notifyPower = false) {
    const p = state.power;
    const cOpen = state.curtainOpen;
    const isDark = state.isDark > 0.5;
    ceilingUniforms.uPower.value = p;
    ceilingUniforms.uCurtainOpen.value = cOpen;
    lensUniforms.uPower.value = p;
    lensUniforms.uCurtainOpen.value = cOpen;

    bezelMat.emissiveIntensity = (isDark ? 0.18 : 0.10) * p;
    innerRimMat.emissiveIntensity = (isDark ? 0.38 : 0.22) * p;
    ceilingLight.intensity = (isDark ? 0.85 : 0.55) * p;

    const detDim = isDark
      ? (0.20 + 0.28 * cOpen + 0.32 * p)
      : (0.18 + 0.50 * cOpen + 0.32 * p);
    detectorMat.color.setHex(isDark ? 0x6a656c : 0xe6dcd2).multiplyScalar(detDim);
    detectorInnerMat.color.setHex(isDark ? 0x58535a : 0xd9cfc4).multiplyScalar(detDim);

    if (notifyPower && typeof onPowerChange === 'function') {
      onPowerChange(p);
    }
  }

  // Permite encender o apagar la lámpara del techo (desde el interruptor de pared)
  function setLightOn(on, immediate = false) {
    state.on = Boolean(on);
    anime.remove(state);
    if (immediate) {
      state.power = state.on ? 1.0 : 0.0;
      syncVisuals(true);
      return;
    }
    anime({
      targets: state,
      power: state.on ? 1.0 : 0.0,
      duration: 380,
      easing: 'easeInOutQuad',
      update: () => syncVisuals(true),
    });
  }

  function toggleLight() {
    setLightOn(!state.on);
  }

  function setCurtainOpen(openFactor) {
    state.curtainOpen = openFactor;
    syncVisuals(false);
  }

  function setLampHover(hovered) {
    anime.remove(bezelMat);
    const baseEmissive = (state.isDark > 0.5 ? 0.18 : 0.10) * state.power;
    anime({
      targets: bezelMat,
      emissiveIntensity: hovered ? Math.max(0.32, baseEmissive + 0.20) : baseEmissive,
      duration: 220,
      easing: 'linear',
    });
  }

  function setTheme(newTheme) {
    const isDark = newTheme === 'dark';
    state.isDark = isDark ? 1.0 : 0.0;
    ceilingUniforms.uIsDark.value = state.isDark;
    lensUniforms.uIsDark.value = state.isDark;

    bezelMat.color.setHex(isDark ? 0x9e968c : 0xe8e0d5);
    innerRimMat.color.setHex(isDark ? 0xbab1a4 : 0xf4eee4);
    syncVisuals();
  }
  setTheme(theme);

  let ledElapsed = 0;
  function update(dt) {
    ledElapsed += dt;
    // Pulso realista de detector: mantiene un verde base visible y emite un destello más intenso cada ~2.4 s
    const cycle = (ledElapsed % 2.4) / 2.4;
    const flash = Math.exp(-Math.pow((cycle - 0.12) * 14.0, 2.0));
    const brightness = 0.42 + 0.58 * flash;
    detLedMat.color.setRGB(0.12 * brightness, 0.96 * brightness, 0.36 * brightness);
    ledHaloUniforms.uIntensity.value = 0.25 + 0.70 * flash;
  }

  return {
    group,
    lampMeshes,
    state,
    ceilingLight,
    setLightOn,
    toggleLight,
    setCurtainOpen,
    setLampHover,
    update,
    setTheme,
  };
}
