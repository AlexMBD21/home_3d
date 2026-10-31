// furniture3d.js – Modelos 3D de escritorio (escritorio.glb) y silla (sillagamer.glb) cerca de la pared frontal.
// Carga ambos archivos GLB desde /img/3d/ con proporciones realistas y calcula la caja 3D exacta de los monitores.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import anime from 'animejs';
import { getStorageUrl } from './supabase.js';

const LOCAL_DESK_URL = '/img/3d/escritorio.glb';
const DESK_URL = getStorageUrl('3d/escritorio.glb');

const LOCAL_CHAIR_URL = '/img/3d/sillagamer.glb';
const CHAIR_URL = getStorageUrl('3d/sillagamer.glb');

// Sombra suave de contacto en el piso
const floorShadowShader = {
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
      float alpha = 1.0 - smoothstep(-uBlur * 0.35, uBlur, dist);
      gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * uOpacity);
    }
  `,
};

function createContactShadow(w, d, blur = 0.35, opacity = 0.42) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.ShaderMaterial({
    vertexShader: floorShadowShader.vertexShader,
    fragmentShader: floorShadowShader.fragmentShader,
    uniforms: {
      uSize: { value: new THREE.Vector2(w, d) },
      uBlur: { value: blur },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  return mesh;
}

/**
 * Centra un modelo cargado en X y Z y apoya su base exactamente en Y = 0,
 * escalándolo luego a las dimensiones objetivo { x, y, z }.
 */
function normalizeAndScaleModel(root, targetSize) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const wrapper = new THREE.Group();
  const offsetGroup = new THREE.Group();

  offsetGroup.position.set(-center.x, -box.min.y, -center.z);
  offsetGroup.add(root);

  const sx = targetSize.x ? targetSize.x / Math.max(size.x, 0.0001) : 1;
  const sy = targetSize.y ? targetSize.y / Math.max(size.y, 0.0001) : 1;
  const sz = targetSize.z ? targetSize.z / Math.max(size.z, 0.0001) : 1;
  wrapper.scale.set(sx, sy, sz);
  wrapper.add(offsetGroup);

  return wrapper;
}

export function createFurniture3D(loadingManager, theme = 'light', onMonitorsReady) {
  const group = new THREE.Group();
  const gltfLoader = new GLTFLoader(loadingManager);

  // Iluminación envolvente para resaltar el escritorio, monitores y silla en modo día y noche
  const hemiLight = new THREE.HemisphereLight(0xfff8ee, 0xb8a898, 1.25);
  group.add(hemiLight);

  const frontDirLight = new THREE.DirectionalLight(0xfff4e2, 1.25);
  frontDirLight.position.set(1.8, 3.8, 2.5);
  frontDirLight.target.position.set(0, -2.5, -3.5);
  group.add(frontDirLight);
  group.add(frontDirLight.target);

  const monitorGlow = new THREE.PointLight(0xffb86b, 1.1, 9, 1.4);
  monitorGlow.position.set(0, -1.0, -3.2);
  group.add(monitorGlow);

  // 1. Contenedor del Escritorio 3D (apoyado directamente en el suelo 3D y = -4.99 y mirando hacia +Z)
  const deskContainer = new THREE.Group();
  deskContainer.position.set(0.15, -4.99, -3.58);
  deskContainer.rotation.y = Math.PI;
  group.add(deskContainer);

  const deskShadow = createContactShadow(7.0, 3.0, 0.48, 0.48);
  deskContainer.add(deskShadow);

  // 2. Contenedor de la Silla 3D (apoyada directamente en el suelo 3D y = -4.99, mirando hacia la derecha)
  const chairContainer = new THREE.Group();
  const baseChairRotY = Math.PI * 0.65;
  chairContainer.position.set(-1.35, -4.99, -1.82);
  chairContainer.rotation.y = baseChairRotY;
  group.add(chairContainer);

  const chairShadow = createContactShadow(2.3, 2.3, 0.45, 0.52);
  chairContainer.add(chairShadow);

  const monitorMeshes = [];
  const screenMaterials = [];
  const chairMeshes = [];

  // Cargar escritorio.glb desde Supabase (con respaldo local)
  const loadDesk = (url, isFallback = false) => {
    gltfLoader.load(
      encodeURI(url),
      (gltf) => {
        const model = gltf.scene;

        // Ampliar ligeramente el soporte de monitores dobles para que destaquen en proporción al escritorio
        model.traverse((node) => {
          if (node.name === 'Dual Monitors on sit-stand arm') {
            const tabletopY = 0.942;
            const boost = 1.28;
            node.scale.multiplyScalar(boost);
            node.position.y = tabletopY + (node.position.y - tabletopY) * boost;
          }
        });

        // 1ª pasada: recopilar nodos de los paneles de monitor y sus meshes hijas
        const monitorPanelNodes = [];
        const screenMeshIds = new Set();

        model.traverse((child) => {
          if (child.name && (child.name.includes('Dupli|22') || child.name.includes('Dupli|23'))) {
            monitorPanelNodes.push(child);
            child.traverse((m) => {
              if (m.isMesh) screenMeshIds.add(m.uuid);
            });
          }
        });

        // 2ª pasada: aplicar materiales distinguiendo pantallas reales del soporte/brazo
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              const mat = child.material;
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              }
              if (mat.name === 'BlackWood') {
                mat.color.setHex(0x8a6042);
                mat.roughness = 0.46;
                mat.metalness = 0.08;
              } else if (mat.name === 'BlackCoatSteel' || mat.name === 'BlackPlastic') {
                mat.color.setHex(0x2a2d34);
                mat.roughness = 0.4;
                mat.metalness = 0.35;
              } else if (mat.name === 'mat22.010') {
                if (screenMeshIds.has(child.uuid)) {
                  // Superficie real de las pantallas de los 2 monitores
                  const screenMat = mat.clone();
                  screenMat.color.setHex(0x2b303c);
                  screenMat.emissive = new THREE.Color(0xffb85c);
                  screenMat.emissiveIntensity = 0.06;
                  screenMat.roughness = 0.25;
                  screenMat.metalness = 0.1;
                  child.material = screenMat;
                  screenMaterials.push(screenMat);
                } else {
                  // Soporte, brazo, bisel – negro mate sin brillo emisivo
                  const bezelMat = mat.clone();
                  bezelMat.color.setHex(0x14161b);
                  bezelMat.emissive = new THREE.Color(0x000000);
                  bezelMat.emissiveIntensity = 0;
                  bezelMat.roughness = 0.6;
                  bezelMat.metalness = 0.15;
                  child.material = bezelMat;
                }
              } else {
                mat.metalness = Math.min(mat.metalness ?? 0.1, 0.25);
                mat.roughness = Math.max(mat.roughness ?? 0.5, 0.35);
              }
              child.material.needsUpdate = true;
            }
          }
        });

        // Escala amplia que cubre el ancho de la zona de trabajo desde el suelo 3D
        const normalizedDesk = normalizeAndScaleModel(model, {
          x: 6.65,
          y: 4.88,
          z: 2.55,
        });
        deskContainer.add(normalizedDesk);

        // Calcular la caja 3D exacta en coordenadas globales de las 2 pantallas de los monitores
        group.updateWorldMatrix(true, true);
        const monitorBox = new THREE.Box3();
        for (const panel of monitorPanelNodes) {
          panel.traverse((m) => {
            if (m.isMesh) {
              monitorMeshes.push(m);
              monitorBox.expandByObject(m);
            }
          });
        }

        if (!monitorBox.isEmpty() && onMonitorsReady) {
          const center = monitorBox.getCenter(new THREE.Vector3());
          const size = monitorBox.getSize(new THREE.Vector3());
          onMonitorsReady({ box: monitorBox, center, size });
        }
      },
      undefined,
      (err) => {
        if (!isFallback && url !== LOCAL_DESK_URL) {
          console.warn('Cargando escritorio.glb local como respaldo:', err);
          loadDesk(LOCAL_DESK_URL, true);
        } else {
          console.warn('No se pudo cargar escritorio.glb:', err);
        }
      }
    );
  };
  loadDesk(DESK_URL);

  // Cargar sillagamer.glb desde Supabase (con respaldo local)
  const loadChair = (url, isFallback = false) => {
    gltfLoader.load(
      encodeURI(url),
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            chairMeshes.push(child);

            if (child.material) {
              const mat = child.material;
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              }
              if (mat.name === 'Executive__2') {
                mat.color.setHex(0x423832);
                mat.roughness = 0.42;
                mat.metalness = 0.12;
              } else if (mat.name === 'Executive__1') {
                mat.color.setHex(0x26282e);
                mat.roughness = 0.38;
                mat.metalness = 0.28;
              } else if (mat.name === 'Executive') {
                mat.color.setHex(0xa68564);
                mat.roughness = 0.45;
                mat.metalness = 0.15;
              } else {
                mat.metalness = Math.min(mat.metalness ?? 0.15, 0.3);
                mat.roughness = Math.max(mat.roughness ?? 0.45, 0.35);
              }
              mat.needsUpdate = true;
            }
          }
        });

        // Silla con proporción real respecto al escritorio apoyada en el suelo 3D
        const normalizedChair = normalizeAndScaleModel(model, {
          x: 2.1,
          y: 3.92,
          z: 2.1,
        });
        chairContainer.add(normalizedChair);
      },
      undefined,
      (err) => {
        if (!isFallback && url !== LOCAL_CHAIR_URL) {
          console.warn('Cargando sillagamer.glb local como respaldo:', err);
          loadChair(LOCAL_CHAIR_URL, true);
        } else {
          console.warn('No se pudo cargar sillagamer.glb:', err);
        }
      }
    );
  };
  loadChair(CHAIR_URL);

  // Resaltar directamente las 2 pantallas 3D al pasar el cursor
  function setMonitorHover(hovered) {
    for (const mat of screenMaterials) {
      anime.remove(mat);
      anime({
        targets: mat,
        emissiveIntensity: hovered ? 0.38 : 0.06,
        duration: 250,
        easing: 'linear',
      });
    }
  }

  // Animación interactiva al hacer clic en la silla (giro suave)
  let chairSpinning = false;
  function spinChair() {
    if (chairSpinning) return;
    chairSpinning = true;
    anime.remove(chairContainer.rotation);
    anime({
      targets: chairContainer.rotation,
      y: [
        { value: baseChairRotY + 0.45, duration: 420, easing: 'easeOutQuad' },
        { value: baseChairRotY - 0.22, duration: 480, easing: 'easeInOutSine' },
        { value: baseChairRotY, duration: 520, easing: 'easeOutElastic(1, 0.6)' },
      ],
      complete: () => {
        chairSpinning = false;
      },
    });
  }

  let currentTheme = theme;
  let currentCurtainOpen = 1.0;
  let currentCeilingPower = 1.0;

  function syncFurnitureLights() {
    const isDark = currentTheme === 'dark';
    const roomFactor = isDark
      ? (0.20 + 0.34 * currentCurtainOpen + 0.46 * currentCeilingPower)
      : (0.16 + 0.50 * currentCurtainOpen + 0.34 * currentCeilingPower);

    hemiLight.intensity = (isDark ? 0.95 : 1.25) * roomFactor;
    frontDirLight.intensity = (isDark ? 0.95 : 1.25) * roomFactor;
    monitorGlow.intensity = isDark ? 1.35 : 0.85;
    monitorGlow.color.setHex(isDark ? 0xffaa55 : 0xffcc88);
  }

  function setRoomLighting({ curtainOpen, ceilingPower }) {
    if (curtainOpen !== undefined) currentCurtainOpen = curtainOpen;
    if (ceilingPower !== undefined) currentCeilingPower = ceilingPower;
    syncFurnitureLights();
  }

  function setTheme(newTheme) {
    currentTheme = newTheme;
    syncFurnitureLights();
  }
  setTheme(theme);

  return {
    group,
    deskContainer,
    chairContainer,
    monitorMeshes,
    chairMeshes,
    setMonitorHover,
    spinChair,
    setRoomLighting,
    setTheme,
  };
}
