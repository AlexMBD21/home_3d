// Contenido editable del portafolio.
// rect = [u0, v0, u1, v1] en fracciones de la imagen de la pared (0,0 = esquina superior izquierda).
// Una sección por pared: frontal = Proyectos, izquierda = Habilidades, derecha = Sobre mí, trasera = Contacto.
// `modal` (opcional) indica qué contenido de MODALS abre; por defecto el propio id.

export const HOTSPOTS = [
  { id: 'pc',       wall: 'frontal',   label: 'Mis proyectos', rect: [0.27, 0.44, 0.73, 0.58], fullscreen: true },
  { id: 'libreros', wall: 'izquierda', label: 'Habilidades',   rect: [0.21, 0.51, 0.79, 0.94] },
  { id: 'ventana',  wall: 'derecha',   label: 'Sobre mí',      rect: [0.34, 0.23, 0.66, 0.665] },
  { id: 'pizarra',  wall: 'trasera',   label: 'Contacto',      rect: [0.56, 0.285, 0.955, 0.61], modal: 'contacto' },
  { id: 'puerta',   wall: 'trasera',   label: 'Contacto',      rect: [0.04, 0.24, 0.34, 0.9],    modal: 'contacto' },
];

export const MODALS = {
  libreros: `
    <h2 class="stagger">Habilidades</h2>
    <p class="stagger">Tecnologías y herramientas con las que trabajo.</p>
    <div class="tags big stagger"><span>JavaScript</span><span>TypeScript</span><span>React</span><span>Node.js</span><span>Three.js</span><span>APIs REST</span><span>Bases de datos</span><span>CI/CD</span><span>Git</span></div>`,
  ventana: `
    <h2 class="stagger">Sobre mí</h2>
    <p class="stagger">Escribe aquí tu presentación: quién eres, qué te apasiona y qué tipo de proyectos buscas.</p>
    <ul class="list">
      <li class="stagger"><strong>Estudios</strong><span>Tu carrera / institución / año.</span></li>
      <li class="stagger"><strong>Cursos</strong><span>Certificaciones y cursos relevantes.</span></li>
    </ul>`,
  contacto: `
    <h2 class="stagger">Contacto</h2>
    <p class="stagger">¿Trabajamos juntos? Escríbeme.</p>
    <p class="stagger"><a href="mailto:tu@correo.com">tu@correo.com</a></p>
    <p class="stagger"><a href="https://github.com/" target="_blank" rel="noopener">GitHub</a> · <a href="https://linkedin.com/" target="_blank" rel="noopener">LinkedIn</a></p>`,
};
