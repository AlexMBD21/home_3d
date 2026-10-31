// Visual Studio Code - Entorno interactivo para la pantalla del PC
// Muestra archivos reales con syntax highlighting, pestañas, explorador y terminal integrada.

const FILES = {
  'developer.ts': {
    name: 'developer.ts',
    dir: 'src',
    lang: 'typescript',
    icon: 'ts',
    content: `/**
 * @file developer.ts
 * @author Alex Bello
 * @role Software Developer / Full-Stack Engineer
 * @summary Código limpio, interfaces inmersivas y arquitecturas modernas
 */

export interface DeveloperProfile {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly availability: string;
  readonly corePhilosophy: string;
  readonly passions: string[];
}

export class AlexBello implements DeveloperProfile {
  public readonly name = "Alex Bello";
  public readonly role = "Desarrollador de Software";
  public readonly location = "Barranquilla, Colombia (Disponible remoto)";
  public readonly availability = "Abierto a proyectos de alto impacto";

  public readonly corePhilosophy =
    "Construir software no es solo escribir código que funcione, sino crear " +
    "experiencias fluidas, mantenibles y optimizadas desde la base de datos hasta el píxel.";

  public readonly passions = [
    "Desarrollo Frontend reactivo y accesible con React, Next.js y TypeScript",
    "Gráficos 3D en la web y shaders interactivos con Three.js",
    "Bases de datos en tiempo real y servicios cloud con Supabase y Firebase",
    "Diseño de arquitecturas limpias, rendimiento web y mobile-first",
  ];

  public getStatus(): object {
    return {
      status: "Activo y construyendo",
      currentFocus: "Experiencias web 3D interactivas y aplicaciones SaaS escalables",
      coffeeLevel: "100%",
    };
  }

  public async collaborate(): Promise<string> {
    return "¡Listo para nuevos desafíos técnicos! Contáctame para trabajar juntos.";
  }
}

export default new AlexBello();`
  },

  'projects.ts': {
    name: 'projects.ts',
    dir: 'src',
    lang: 'typescript',
    icon: 'ts',
    content: `/**
 * @file projects.ts
 * @description Portafolio de proyectos y soluciones desarrolladas por Alex Bello
 */

export interface Project {
  id: string;
  title: string;
  category: "Full-Stack" | "Frontend" | "Interactive 3D" | "Lógica";
  techStack: string[];
  description: string;
  highlights: string[];
  status: "Producción" | "Completado" | "En evolución";
}

export const FEATURED_PROJECTS: Project[] = [
  {
    id: "suminavales",
    title: "Suminavales S.A.S",
    category: "Full-Stack",
    techStack: ["React", "TypeScript", "TailwindCSS", "Node.js", "Express", "Supabase"],
    description: "Plataforma integral para gestión de formularios técnicos y registros operativos en SST.",
    highlights: [
      "Digitalización de flujos operativos eliminando el uso de papel",
      "Almacenamiento seguro en PostgreSQL mediante Supabase Auth y Storage",
      "Módulo de firma digital en Canvas y generación instantánea de reportes en PDF",
      "Control de roles, historial y estadísticas de cumplimiento",
    ],
    status: "Producción",
  },
  {
    id: "elcompae",
    title: "El Compae",
    category: "Full-Stack",
    techStack: ["Next.js", "React", "TypeScript", "Firebase Realtime DB", "MercadoPago"],
    description: "Aplicación web para gestión de rifas digitales con reservas en tiempo real y pagos integrados.",
    highlights: [
      "Integración completa de pagos automatizados con MercadoPago",
      "Generación y descarga de comprobantes en PDF con pdf-lib",
      "Control de concurrencia y validación de números sin colisiones",
      "Panel administrativo con estadísticas y seguimiento en vivo",
    ],
    status: "Producción",
  },
  {
    id: "encuestas-uni",
    title: "Encuestas Universidad",
    category: "Full-Stack",
    techStack: ["React", "TypeScript", "Vite", "Node.js", "Supabase", "Docker"],
    description: "Sistema para recolección, asignación y análisis centralizado de encuestas académicas.",
    highlights: [
      "Diseño modular de encuestas dinámicas con múltiples tipos de preguntas",
      "Autenticación y control de acceso seguro mediante Supabase",
      "Visualización centralizada de resultados y exportación de reportes",
      "Entorno de despliegue contenerizado con Docker",
    ],
    status: "Completado",
  },
  {
    id: "infinito-store",
    title: "Infinito Stores",
    category: "Frontend",
    techStack: ["React", "TypeScript", "TailwindCSS", "Supabase"],
    description: "Tienda online de productos decorativos artesanales en madera rústica.",
    highlights: [
      "Diseño UI/UX moderno enfocado en la experiencia de compra",
      "Catálogo interactivo con filtrado dinámico y vista previa de productos",
      "Carga optimizada con almacenamiento en Supabase Storage",
    ],
    status: "Producción",
  },
  {
    id: "inventario",
    title: "Sistema de Inventario Empresarial",
    category: "Full-Stack",
    techStack: ["React", "Firebase Firestore", "Authentication", "Vite", "Recharts"],
    description: "Plataforma web para gestión y control de existencias, ventas y métricas para comercios.",
    highlights: [
      "Actualización de stock en tiempo real tras cada venta",
      "Generación automática de códigos SKU y validación de unidades",
      "Gráficas interactivas de ventas y alertas de stock bajo",
    ],
    status: "Completado",
  },
  {
    id: "portfolio-3d",
    title: "Habitación 3D Interactiva (Este Sitio)",
    category: "Interactive 3D",
    techStack: ["Three.js", "GLSL / Shaders", "Supabase Storage CDN", "Vite", "Anime.js"],
    description: "Entorno 3D procedural con iluminación reactiva, joystick virtual y navegación táctil.",
    highlights: [
      "Paredes, rodapiés, molduras, interruptores e iluminación generados proceduralmente",
      "Conexión con Supabase Storage para entrega ultrarrápida de texturas",
      "Joystick 360° y navegación táctil con inercia para dispositivos móviles",
    ],
    status: "En evolución",
  },
];`
  },

  'skills.json': {
    name: 'skills.json',
    dir: 'src',
    lang: 'json',
    icon: 'json',
    content: `{
  "$schema": "https://json.schemastore.org/package",
  "developer": "Alex Bello",
  "specialization": "Full-Stack Software Engineering",
  "technologies": {
    "frontend": [
      "React 18 / 19",
      "Next.js (App Router)",
      "TypeScript",
      "JavaScript (ESNext)",
      "TailwindCSS",
      "HTML5 / Semantic Web",
      "CSS3 / Grid / Flexbox / Shaders",
      "Three.js (3D WebGL)"
    ],
    "backend_and_apis": [
      "Node.js",
      "Express.js",
      "RESTful API Design",
      "Next.js API Routes",
      "JWT & Auth Workflows"
    ],
    "databases_and_cloud": [
      "Supabase (PostgreSQL, Storage, Auth, Realtime)",
      "Firebase (Firestore, Realtime DB, Auth)",
      "Docker",
      "Vercel / Netlify"
    ],
    "tooling_and_workflow": [
      "Git & GitHub",
      "Visual Studio Code",
      "Vite",
      "Postman",
      "npm / pnpm",
      "Figma UI/UX"
    ]
  },
  "methodologies": [
    "Clean Code & SOLID principles",
    "Mobile-First Responsive Design",
    "Component-Driven Development",
    "Continuous Integration / Deployment"
  ]
}`
  },

  'contact.ts': {
    name: 'contact.ts',
    dir: 'src',
    lang: 'typescript',
    icon: 'ts',
    content: `/**
 * @file contact.ts
 * @description Canales oficiales de contacto y redes profesionales
 */

export interface SocialLinks {
  email: string;
  github: string;
  linkedin: string;
  location: string;
}

export const CONTACT: SocialLinks = {
  email: "alexbello.dev@gmail.com",
  github: "https://github.com/AlexBelloDev",
  linkedin: "https://linkedin.com/in/alex-bello",
  location: "Barranquilla, Colombia",
};

export async function sendMessage(sender: string, message: string) {
  if (!sender || !message) {
    throw new Error("Por favor incluye tu nombre o correo y el mensaje.");
  }

  // Simulación de envío a través de API
  console.log(\`[Mensaje recibido de \${sender}]: \${message}\`);

  return {
    status: 200,
    success: true,
    message: "¡Mensaje enviado con éxito! Me pondré en contacto contigo pronto.",
  };
}`
  },

  'package.json': {
    name: 'package.json',
    dir: '',
    lang: 'json',
    icon: 'json',
    content: `{
  "name": "alex-bello-portfolio-3d",
  "version": "2.4.0",
  "private": true,
  "type": "module",
  "description": "Portafolio interactivo 3D con Three.js, Supabase Storage y VS Code integrado",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "animejs": "^3.2.2",
    "three": "^0.170.0"
  },
  "devDependencies": {
    "vite": "^5.4.14"
  }
}`
  },

  'README.md': {
    name: 'README.md',
    dir: '',
    lang: 'markdown',
    icon: 'md',
    content: `# ⚡ Alex Bello — Software Developer

Bienvenido a mi entorno de trabajo. Este espacio simula un **Visual Studio Code** real corriendo dentro del monitor de mi habitación 3D interactiva.

---

### 👨‍💻 Sobre Mí
Soy un desarrollador de software enfocado en crear aplicaciones web modernas, rápidas y escalables. Me apasiona resolver problemas complejos mediante interfaces intuitivas y arquitecturas limpias.

### 🧭 Navegación por los archivos:
* 📄 \`src/developer.ts\` -> Conoce mi perfil, mentalidad y rol profesional.
* 📄 \`src/projects.ts\`  -> Explora mis proyectos destacados con su arquitectura e impacto.
* 📄 \`src/skills.json\`  -> Consulta mi stack tecnológico completo (Frontend, Backend, DB, Cloud).
* 📄 \`src/contact.ts\`   -> Encuentra mis canales de contacto, correo y redes.
* 📄 \`package.json\`     -> Configuración y dependencias del proyecto.

---

> *"Primero resuelve el problema. Luego, escribe el código."*  
> — John Johnson`
  }
};

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightTypeScript(code) {
  const tokenRegex = /(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:import|export|from|default|class|interface|type|const|let|var|function|return|public|private|protected|readonly|async|await|new|typeof|as|extends|implements|static|void|this|super|throw)\b)|(\b(?:true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b(?:console|log|Error|Promise|Date|Math|Array|Object|String|Number|Boolean)\b)|([{}()[\],.;:+\-*/=<>!&|?])/g;

  return code.replace(tokenRegex, (match, blockC, lineC, str, kw, val, num, typ, builtin, punct) => {
    if (blockC || lineC) return `<span class="vsc-tok-comment">${esc(match)}</span>`;
    if (str) return `<span class="vsc-tok-str">${esc(match)}</span>`;
    if (kw) return `<span class="vsc-tok-kw">${esc(match)}</span>`;
    if (val) return `<span class="vsc-tok-val">${esc(match)}</span>`;
    if (num) return `<span class="vsc-tok-num">${esc(match)}</span>`;
    if (typ) return `<span class="vsc-tok-type">${esc(match)}</span>`;
    if (builtin) return `<span class="vsc-tok-builtin">${esc(match)}</span>`;
    if (punct) return `<span class="vsc-tok-punct">${esc(match)}</span>`;
    return esc(match);
  });
}

function highlightJson(code) {
  const tokenRegex = /("(?:[^"\\]|\\.)*"(?:\s*:)?)|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?\b)|([{}[\],:])/g;

  return code.replace(tokenRegex, (match, strKey, val, num, punct) => {
    if (strKey) {
      if (strKey.endsWith(':')) {
        const keyText = strKey.slice(0, -1).trim();
        return `<span class="vsc-tok-json-key">${esc(keyText)}</span>:`;
      }
      return `<span class="vsc-tok-str">${esc(match)}</span>`;
    }
    if (val) return `<span class="vsc-tok-val">${esc(match)}</span>`;
    if (num) return `<span class="vsc-tok-num">${esc(match)}</span>`;
    if (punct) return `<span class="vsc-tok-punct">${esc(match)}</span>`;
    return esc(match);
  });
}

function highlightMarkdown(code) {
  return code
    .split('\n')
    .map((line) => {
      if (/^#{1,6}\s/.test(line)) {
        return `<span class="vsc-tok-md-h">${esc(line)}</span>`;
      }
      if (/^>\s/.test(line)) {
        return `<span class="vsc-tok-md-quote">${esc(line)}</span>`;
      }
      if (/^\s*[-*]\s/.test(line)) {
        return `<span class="vsc-tok-md-list">${esc(line)}</span>`;
      }
      let processed = esc(line);
      processed = processed.replace(/(`[^`]+`)/g, '<span class="vsc-tok-md-code">$1</span>');
      processed = processed.replace(/(\*\*[^*]+\*\*)/g, '<span class="vsc-tok-md-bold">$1</span>');
      return processed;
    })
    .join('\n');
}

function highlight(code, lang) {
  if (lang === 'json') return highlightJson(code);
  if (lang === 'markdown') return highlightMarkdown(code);
  return highlightTypeScript(code);
}

export function initScreen(root) {
  const tabbar = root.querySelector('#vsc-tabbar');
  const codeContent = root.querySelector('#vsc-code-content');
  const gutter = root.querySelector('#vsc-gutter');
  const minimapLines = root.querySelector('#vsc-minimap-lines');
  const bcDir = root.querySelector('#vsc-bc-dir');
  const bcFile = root.querySelector('#vsc-bc-file');
  const statusLang = root.querySelector('#vsc-status-lang');
  const statusPos = root.querySelector('#vsc-status-pos');
  const editorScroll = root.querySelector('#vsc-editor-scroll');
  const sidebar = root.querySelector('#vsc-sidebar');
  const toggleBtn = root.querySelector('#vsc-toggle-btn');
  const actExplorer = root.querySelector('#vsc-act-explorer');

  let activeFileName = 'developer.ts';
  let openTabs = ['developer.ts', 'projects.ts', 'README.md'];

  function renderTabs() {
    tabbar.innerHTML = openTabs.map((fname) => {
      const file = FILES[fname] || { name: fname, icon: 'ts' };
      const isActive = fname === activeFileName;
      return `
        <div class="vsc-tab ${isActive ? 'active' : ''}" data-file="${fname}" role="tab" aria-selected="${isActive}">
          <span class="vsc-fbadge ${file.icon}">${file.icon.toUpperCase()}</span>
          <span class="vsc-tab-title">${file.name}</span>
          <button class="vsc-tab-close" data-close-tab="${fname}" aria-label="Cerrar pestaña">✕</button>
        </div>`;
    }).join('');
  }

  function renderFile(fileName) {
    const file = FILES[fileName] || FILES['developer.ts'];
    activeFileName = file.name;

    if (!openTabs.includes(activeFileName)) {
      openTabs.push(activeFileName);
    }
    renderTabs();

    // Actualizar árbol en la barra lateral
    root.querySelectorAll('.vsc-tree-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.file === activeFileName);
    });

    // Actualizar Breadcrumbs
    if (file.dir) {
      bcDir.style.display = 'inline';
      bcDir.textContent = file.dir;
      const sep = root.querySelectorAll('.vsc-bc-sep')[0];
      if (sep) sep.style.display = 'inline';
    } else {
      bcDir.style.display = 'none';
      const sep = root.querySelectorAll('.vsc-bc-sep')[0];
      if (sep) sep.style.display = 'none';
    }
    bcFile.textContent = file.name;

    // Actualizar status bar
    const langNames = { typescript: 'TypeScript', json: 'JSON', markdown: 'Markdown' };
    statusLang.textContent = langNames[file.lang] || 'Plain Text';

    // Líneas y código con colores
    const lines = file.content.split('\n');
    gutter.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    codeContent.innerHTML = highlight(file.content, file.lang);

    // Minimapa
    minimapLines.innerHTML = lines.slice(0, 75).map((l) => {
      const w = Math.min(95, Math.max(15, l.trim().length * 2.2));
      const indent = (l.match(/^\s*/)[0].length || 0) * 2;
      return `<div class="vsc-mini-line" style="width: ${w}%; margin-left: ${indent}px;"></div>`;
    }).join('');

    // Reset scroll
    if (editorScroll) editorScroll.scrollTop = 0;
    if (statusPos) statusPos.textContent = `Ln 1, Col 1 (${lines.length} líneas)`;
  }

  // Interacción de pestañas
  tabbar.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close-tab]');
    if (closeBtn) {
      e.stopPropagation();
      const targetName = closeBtn.dataset.closeTab;
      openTabs = openTabs.filter((t) => t !== targetName);
      if (openTabs.length === 0) openTabs = ['developer.ts'];
      if (activeFileName === targetName) {
        renderFile(openTabs[openTabs.length - 1]);
      } else {
        renderTabs();
      }
      return;
    }

    const tab = e.target.closest('.vsc-tab');
    if (tab && tab.dataset.file) {
      renderFile(tab.dataset.file);
    }
  });

  // Interacción en el árbol de archivos
  root.querySelectorAll('.vsc-tree-item').forEach((item) => {
    item.addEventListener('click', () => {
      const file = item.dataset.file;
      if (file && FILES[file]) {
        renderFile(file);
        // En pantallas móviles cerramos el sidebar automáticamente al seleccionar un archivo
        if (window.innerWidth <= 768 && sidebar) {
          sidebar.classList.remove('open');
        }
      }
    });
  });

  // Botón colapsar / expandir explorador lateral
  function toggleSidebar() {
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      if (toggleBtn) {
        toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
      }
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
  }

  if (actExplorer) {
    actExplorer.addEventListener('click', () => {
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // Pestañas del terminal inferior
  const termTabs = root.querySelectorAll('.vsc-term-tab');
  termTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      termTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Render inicial
  renderFile(activeFileName);

  return {
    open: () => {
      renderFile(activeFileName);
    },
    showGrid: () => {
      renderFile(activeFileName);
    },
    reset: () => {
      renderFile('developer.ts');
    },
    selectFile: renderFile,
  };
}
