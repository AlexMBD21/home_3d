// Interfaz de "monitor" a pantalla completa (estilo editor de código).
// Edita FILES con tu información real.

export const FILES = [
  {
    id: 'proyecto-1', group: 'proyectos', name: 'proyecto-1.md', icon: '◆',
    html: `<h1># Proyecto 1</h1>
      <p class="c">// Descripción breve del proyecto y su impacto.</p>
      <p><span class="k">stack</span> = [<span class="s">"React"</span>, <span class="s">"Node"</span>]</p>
      <p><span class="k">demo</span> = <a href="#" target="_blank" rel="noopener">https://tu-demo.com</a></p>
      <p><span class="k">repo</span> = <a href="#" target="_blank" rel="noopener">https://github.com/tu-usuario/proyecto-1</a></p>`,
  },
  {
    id: 'proyecto-2', group: 'proyectos', name: 'proyecto-2.md', icon: '◆',
    html: `<h1># Proyecto 2</h1>
      <p class="c">// Descripción breve del proyecto y su impacto.</p>
      <p><span class="k">stack</span> = [<span class="s">"Three.js"</span>, <span class="s">"CSS"</span>]</p>
      <p><span class="k">demo</span> = <a href="#" target="_blank" rel="noopener">https://tu-demo.com</a></p>
      <p><span class="k">repo</span> = <a href="#" target="_blank" rel="noopener">https://github.com/tu-usuario/proyecto-2</a></p>`,
  },
  {
    id: 'proyecto-3', group: 'proyectos', name: 'proyecto-3.md', icon: '◆',
    html: `<h1># Proyecto 3</h1>
      <p class="c">// Descripción breve del proyecto y su impacto.</p>
      <p><span class="k">stack</span> = [<span class="s">"TypeScript"</span>, <span class="s">"API"</span>]</p>
      <p><span class="k">demo</span> = <a href="#" target="_blank" rel="noopener">https://tu-demo.com</a></p>
      <p><span class="k">repo</span> = <a href="#" target="_blank" rel="noopener">https://github.com/tu-usuario/proyecto-3</a></p>`,
  },
];

const GROUPS = { proyectos: 'PROYECTOS' };

export function initScreen(root) {
  const explorer = root.querySelector('#screen-explorer');
  const editor = root.querySelector('#screen-editor');
  const tab = root.querySelector('#screen-tab');

  let html = '';
  for (const g of Object.keys(GROUPS)) {
    html += `<div class="ex-group">${GROUPS[g]}</div>`;
    for (const f of FILES.filter((x) => x.group === g)) {
      html += `<button class="ex-file" data-file="${f.id}"><b>${f.icon}</b>${f.name}</button>`;
    }
  }
  explorer.innerHTML = html;

  function open(id) {
    const f = FILES.find((x) => x.id === id) || FILES[0];
    explorer.querySelectorAll('.ex-file').forEach((b) => b.classList.toggle('active', b.dataset.file === f.id));
    tab.textContent = f.name;
    editor.innerHTML = f.html;
    editor.classList.remove('swap'); void editor.offsetWidth; editor.classList.add('swap');
  }
  explorer.addEventListener('click', (e) => {
    const b = e.target.closest('.ex-file');
    if (b) open(b.dataset.file);
  });
  open(FILES[0].id);
  return { open };
}
