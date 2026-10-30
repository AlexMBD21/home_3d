// Pantalla del PC: carrusel 3D (coverflow) de proyectos a pantalla completa.
// Edita PROJECTS con tu información real (las imágenes están en /public/img/proyectos/).
// Campos: title, summary (texto de la tarjeta), tags, overview (Visión general),
//         stack (lista de responsabilidades), impact (Impacto final), demo, repo.

export const PROJECTS = [
  {
    id: 'ahorcado', title: 'El Ahorcado Game', img: 'ahorcado.png',
    summary: 'Juego de adivinación de palabras con lógica de niveles y conteo de errores.',
    tags: ['JavaScript', 'CSS3', 'HTML5'],
    overview: 'Juego educativo de adivinación de palabras que pone a prueba el vocabulario de los usuarios a través de una mecánica de niveles y un sistema de dibujo dinámico.',
    stack: [
      'Lógica de validación de palabras y letras con JavaScript',
      'Dibujo dinámico de estados del ahorcado con CSS',
      'Implementación de sistema de niveles y dificultades',
      'Diseño de interfaz minimalista y funcional',
    ],
    impact: 'Se desarrolló un juego estable y entretenido con una curva de aprendizaje bien balanceada y una respuesta visual inmediata a las acciones del usuario.',
    demo: '', repo: '',
  },
  { id: 'batatabit',     title: 'BatataBit',      img: 'batatabit.png',     desc: 'Descripción pendiente.', tags: [], demo: '', repo: '' },
  {
    id: 'black', title: 'BlackJack 21', img: 'black.png',
    summary: 'Juego de Blackjack interactivo. Reta tu suerte por conseguir 21.',
    tags: ['JavaScript', 'CSS3', 'Game Logic'],
    overview: 'Desarrollo de un juego de cartas clásico utilizando lógica pura de programación, enfocado en la manipulación dinámica del DOM y el manejo de estados de juego complejos.',
    stack: [
      'Implementación de lógica de juego distribuida en JavaScript',
      'Manejo dinámico de barajas y conteo de puntaje',
      'Diseño de interfaz con CSS3 y animaciones de cartas',
      'Desarrollo de IA básica para el comportamiento del crupier',
    ],
    impact: 'Se logró una aplicación interactiva y divertida que demuestra habilidades sólidas en lógica de programación y manipulación del DOM.',
    demo: '', repo: '',
  },
  {
    id: 'elcompae', title: 'El Compae', img: 'elcompae.png',
    summary: 'Aplicación web para la gestión de rifas en línea con pagos integrados.',
    tags: ['React', 'Next.js', 'Firebase'],
    overview: 'Aplicación web para la gestión de rifas en línea, que permite seleccionar, reservar y pagar números de forma digital. Está orientada a organizadores y participantes que buscan un proceso más ordenado y confiable. Integra en un solo flujo el registro, la compra y la generación de comprobantes, mejorando la experiencia del usuario y el control del sistema.',
    stack: [
      'Desarrollo de interfaz interactiva con React, Next.js y TypeScript',
      'Manejo de estado y lógica de negocio mediante hooks personalizados',
      'Implementación de APIs con Next.js API Routes',
      'Integración de pagos en línea con MercadoPago',
      'Gestión de datos en tiempo real con Firebase Realtime Database',
      'Generación de comprobantes en PDF usando pdf-lib',
      'Validación de disponibilidad de números para evitar duplicados',
      'Envío de notificaciones por correo con nodemailer',
      'Implementación de panel de administración y búsqueda de registros',
      'Control básico de acceso mediante tokens',
    ],
    impact: 'Se desarrolló una solución funcional para la gestión de rifas digitales, mejorando la organización del proceso, reduciendo errores en la asignación de números y facilitando la interacción entre organizadores y participantes.',
    demo: '', repo: '',
  },
  {
    id: 'encuestas', title: 'Encuestas Universidad', img: 'encuestas.png',
    summary: 'Aplicación web para la gestión y análisis de encuestas con visualización centralizada de resultados.',
    tags: ['React', 'TypeScript', 'Supabase'],
    overview: 'Aplicación web para la gestión y análisis de encuestas, que permite crear formularios, asignarlos a usuarios y visualizar resultados de forma centralizada. Está orientada a entornos académicos o equipos que requieren recolectar y analizar información de manera organizada. Integra en un solo sistema la recolección de datos y la generación de reportes.',
    stack: [
      'Desarrollo de interfaz con React, TypeScript y Vite',
      'Implementación de navegación con React Router',
      'Autenticación y control de acceso mediante Supabase',
      'Desarrollo de backend con Node.js y Express para APIs',
      'Consumo de servicios REST para gestión de encuestas y reportes',
      'Manejo de estado y lógica de negocio con hooks personalizados',
      'Integración de notificaciones en tiempo real con Supabase',
      'Estilización personalizada con CSS',
      'Configuración de entorno de desarrollo con Docker para facilitar la ejecución local del proyecto',
    ],
    impact: 'Se desarrolló una solución que centraliza la gestión de encuestas y facilita el acceso a resultados, permitiendo organizar la información y apoyar la toma de decisiones basada en datos.',
    demo: '', repo: '',
  },
  {
    id: 'infinitostore', title: 'Infinito Stores', img: 'infinitoStore.png',
    summary: 'Tienda online de productos decorativos en madera rústica.',
    tags: ['React', 'TypeScript', 'TailwindCSS'],
    overview: 'Aplicación web enfocada en la visualización y gestión de productos artesanales, diseñada para ofrecer una experiencia de usuario intuitiva y atractiva. El proyecto combina un diseño moderno con una estructura funcional orientada a facilitar la navegación y exploración de productos.',
    stack: [
      'Desarrollo del frontend con React y TypeScript',
      'Diseño de interfaz UI/UX centrado en la experiencia del usuario',
      'Integración con Supabase para la gestión de datos',
      'Implementación de diseño responsive para distintos dispositivos',
    ],
    impact: 'Se logró una plataforma funcional que permite explorar productos de forma clara y organizada, mejorando la interacción del usuario y la presentación del catálogo digital.',
    demo: '', repo: '',
  },
  {
    id: 'inventario', title: 'Sistema de Inventario', img: 'inventario.png',
    summary: 'Plataforma web para gestión y control de inventario empresarial.',
    tags: ['React', 'Firebase', 'Vite'],
    overview: 'Aplicación web para la gestión de ventas e inventario, orientada a pequeños y medianos comercios. Permite registrar productos, controlar existencias y gestionar ventas desde un mismo sistema. Incluye funcionalidades como búsqueda de productos y alertas de bajo stock, facilitando la organización y el seguimiento del inventario.',
    stack: [
      'Implementación de base de datos en tiempo real con Firebase Firestore',
      'Desarrollo de interfaz con React y Vite',
      'Autenticación y control de sesiones con Firebase Authentication',
      'Visualización de métricas de ventas mediante Recharts',
      'Diseño de interfaz responsive con Bootstrap',
      'Actualización automática de inventario tras cada venta',
      'Implementación de lógica para generación de identificadores de productos (SKU)',
      'Validación de tipos de inventario (unidad, paquete, peso)',
    ],
    impact: 'Se desarrolló una solución que permite llevar el control de inventario y ventas de forma organizada, reduciendo errores manuales y facilitando el seguimiento de productos dentro del sistema.',
    demo: '', repo: '',
  },
  { id: 'juridica',      title: 'Jurídica',       img: 'juridica.png',      desc: 'Descripción pendiente.', tags: [], demo: '', repo: '' },
  { id: 'milook',        title: 'MiLook',         img: 'milook.png',        desc: 'Descripción pendiente.', tags: [], demo: '', repo: '' },
  {
    id: 'suminavales', title: 'Suminavales S.A.S', img: 'suminavales.png',
    summary: 'Aplicación web para la gestión de formularios técnicos y registros operativos en SST.',
    tags: ['React', 'TypeScript', 'Supabase'],
    overview: 'Aplicación web orientada a la gestión de formularios técnicos y registros operativos en entornos de Seguridad y Salud en el Trabajo (SST). Permite digitalizar procesos que tradicionalmente se manejan en papel, facilitando el registro, consulta y almacenamiento de información de forma centralizada. Está dirigida a organizaciones que buscan mejorar el control y acceso a sus datos operativos.',
    stack: [
      'Desarrollo de interfaces con React, TypeScript y TailwindCSS',
      'Implementación de APIs con Node.js, Express y TypeScript',
      'Autenticación de usuarios mediante Supabase Auth y JWT',
      'Gestión de datos con Supabase (PostgreSQL)',
      'Captura de firmas digitales usando Canvas en el frontend',
      'Generación y descarga de documentos desde el cliente',
      'Manejo de estado global y lógica con Context API y hooks personalizados',
      'Almacenamiento de archivos en Supabase Storage',
      'Desarrollo de módulos de historial, estadísticas y calendario',
      'Uso de almacenamiento local para mejorar la disponibilidad de datos',
    ],
    impact: 'Se desarrolló una solución que digitaliza la gestión de formularios técnicos, reduciendo el uso de papel y facilitando el acceso a la información. Mejora la organización de los registros y optimiza los procesos dentro de la aplicación.',
    demo: '', repo: '',
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initScreen(root) {
  const track = root.querySelector('#screen-carousel');
  const dotsEl = root.querySelector('#screen-dots');
  const detail = root.querySelector('#screen-detail');
  const view = root.querySelector('#screen-view');
  const prev = root.querySelector('#screen-prev');
  const next = root.querySelector('#screen-next');
  const caption = root.querySelector('#screen-caption');

  let index = 0;

  track.innerHTML = PROJECTS.map((p, i) => `
    <button class="cf-card" data-i="${i}" aria-label="Abrir ${esc(p.title)}">
      <img src="/img/proyectos/${p.img}" alt="Captura de ${esc(p.title)}" draggable="false" />
      <span class="cf-info">
        <strong>${esc(p.title)}</strong>
        <em>${esc(p.summary || 'Próximamente.')}</em>
        <span class="tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</span>
      </span>
    </button>`).join('');
  dotsEl.innerHTML = PROJECTS.map((p, i) => `<button class="cf-dot" data-i="${i}" aria-label="Ir a ${esc(p.title)}"></button>`).join('');
  const cards = [...track.children];
  const dots = [...dotsEl.children];

  function layout() {
    cards.forEach((c, i) => {
      const o = i - index;
      const a = Math.abs(o);
      const s = Math.sign(o);
      const x = o === 0 ? 0 : s * (58 + (a - 1) * 24);   // % del ancho de la tarjeta
      const rot = -s * Math.min(a, 1) * 42;
      const z = -Math.min(a, 3) * 140;
      const sc = o === 0 ? 1 : 0.86;
      c.style.transform = `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${rot}deg) scale(${sc})`;
      c.style.zIndex = String(100 - a);
      c.style.opacity = a > 2 ? 0 : a === 2 ? 0.45 : 1;
      c.style.pointerEvents = a > 2 ? 'none' : 'auto';
      c.classList.toggle('center', o === 0);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    caption.textContent = PROJECTS[index].title;
    prev.disabled = index === 0;
    next.disabled = index === PROJECTS.length - 1;
  }
  const go = (i) => { index = Math.max(0, Math.min(PROJECTS.length - 1, i)); layout(); };

  function showDetail(i) {
    const p = PROJECTS[i];
    const links = [
      p.demo && `<a class="btn" href="${esc(p.demo)}" target="_blank" rel="noopener">Ver demo ↗</a>`,
      p.repo && `<a class="btn ghost" href="${esc(p.repo)}" target="_blank" rel="noopener">Código ↗</a>`,
    ].filter(Boolean).join('');
    const section = (title, body) => body ? `<section class="d-sec"><h3>${title}</h3>${body}</section>` : '';
    const overview = p.overview || p.desc || 'Descripción pendiente.';
    detail.innerHTML = `
      <button class="back" id="screen-back">Regresar a proyectos</button>
      <div class="d-wrap">
        <div class="d-img"><img src="/img/proyectos/${p.img}" alt="Captura de ${esc(p.title)}" /></div>
        <div class="d-info">
          <h2>${esc(p.title)}</h2>
          <div class="tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
          ${section('Visión general', `<p>${esc(overview)}</p>`)}
          ${section('Stack y responsabilidades', p.stack && p.stack.length ? `<ul class="d-list">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '')}
          ${section('Impacto final', p.impact ? `<blockquote>${esc(p.impact)}</blockquote>` : '')}
          <div class="d-links">${links}</div>
        </div>
      </div>`;
    view.classList.add('detail');
  }
  function showGrid() { view.classList.remove('detail'); }

  // Clic en una tarjeta: si no es la central la centra; si ya es la central abre el contenido
  track.addEventListener('click', (e) => {
    if (dragMoved) return;
    const c = e.target.closest('.cf-card');
    if (!c) return;
    const i = Number(c.dataset.i);
    if (i === index) showDetail(i); else go(i);
  });
  dotsEl.addEventListener('click', (e) => { const d = e.target.closest('.cf-dot'); if (d) go(Number(d.dataset.i)); });
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  detail.addEventListener('click', (e) => { if (e.target.closest('#screen-back')) showGrid(); });

  // Flechas del teclado (solo con la pantalla abierta) + arrastre / swipe
  window.addEventListener('keydown', (e) => {
    if (!root.classList.contains('open') || view.classList.contains('detail')) return;
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'Enter') showDetail(index);
  });
  let startX = 0, dragging = false, dragMoved = false;
  track.addEventListener('pointerdown', (e) => { dragging = true; dragMoved = false; startX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) { dragMoved = true; go(index + (dx < 0 ? 1 : -1)); setTimeout(() => { dragMoved = false; }, 0); }
  });
  root.addEventListener('wheel', (e) => {
    if (view.classList.contains('detail')) return;
    if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 20) return;
    go(index + ((e.deltaX || e.deltaY) > 0 ? 1 : -1));
  }, { passive: true });

  layout();
  return { showGrid, reset: () => { showGrid(); go(0); } };
}
