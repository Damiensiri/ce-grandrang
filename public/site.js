document.head.insertAdjacentHTML('beforeend', '<style>.gr-brand{flex-basis:132px!important}.gr-brand img{width:130px!important;height:76px!important}header .menu-group{display:block;position:relative}header .menu-group summary{list-style:none;color:#06376b;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}header .menu-group summary::-webkit-details-marker{display:none}header .menu-group summary:after{content:"⌄";margin-left:6px}header .menu-group>div{display:none;position:absolute;top:28px;left:-15px;width:225px;padding:10px 15px;background:#fff;border:1px solid #dce6ef;box-shadow:0 12px 25px #10243c22}header .menu-group[open]>div{display:block}header .menu-group>div a{display:block;padding:10px 0;border-bottom:1px solid #edf1f5}.mobile-menu{display:none}.mobile-group{display:block;padding:13px 12px 6px;color:#07539a;font-size:11px;font-weight:700;letter-spacing:.1em}@media(max-width:700px){.gr-brand{flex-basis:98px!important}.gr-brand img{width:98px!important;height:64px!important}header .menu-group{display:none}.mobile-menu{display:block;margin-left:auto}.mobile-menu summary{list-style:none;border:1px solid #07539a;color:#07539a;padding:9px 13px;font-weight:700}.mobile-menu[open]{position:absolute;right:20px;top:10px;width:260px;padding:10px;background:#fff;box-shadow:0 10px 25px #0002}.mobile-menu[open] a{display:block;padding:12px;color:#06376b!important;border-top:1px solid #dce6ef;font-weight:700}}</style>');

const header = document.querySelector('header');

fetch('/api/menu')
  .then((response) => response.json())
  .then((items) => {
    const groups = new Map();
    const ordered = [];
    const seen = new Set();

    for (const item of items) {
      if (!item.menu_group) {
        ordered.push({ type: 'link', item });
        continue;
      }
      if (!groups.has(item.menu_group)) groups.set(item.menu_group, []);
      groups.get(item.menu_group).push(item);
      if (!seen.has(item.menu_group)) {
        seen.add(item.menu_group);
        ordered.push({ type: 'group', name: item.menu_group });
      }
    }

    const link = (page) => `<a href="${page.external_url || `/${page.slug}`}"${page.external_url ? ' target="_blank" rel="noopener"' : ''}>${page.menu_label}</a>`;
    const desktop = ordered.map((entry) => {
      if (entry.type === 'link') return link(entry.item);
      return `<details class="menu-group"><summary>${entry.name}</summary><div>${groups.get(entry.name).map(link).join('')}</div></details>`;
    }).join('');
    const mobile = ordered.map((entry) => {
      if (entry.type === 'link') return link(entry.item);
      return `<span class="mobile-group">${entry.name}</span>${groups.get(entry.name).map(link).join('')}`;
    }).join('');

    header.innerHTML = `<a class="gr-brand" href="/"><img src="/logo-grand-rang.png" alt="Centre Équestre du Grand Rang"></a><nav>${desktop}</nav><details class="mobile-menu"><summary>Menu</summary>${mobile}</details>`;
  });

fetch('/api/content')
  .then((response) => response.json())
  .then((content) => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    hero.style.backgroundImage = `linear-gradient(90deg,rgba(4,37,74,.86),rgba(4,37,74,.3)),url("${content.hero_image || ''}")`;
    const eyebrow = hero.querySelector('.eyebrow');
    const title = hero.querySelector('h1');
    const text = hero.querySelector('p');
    const button = hero.querySelector('.button');
    if (eyebrow) eyebrow.textContent = content.hero_eyebrow || '';
    if (title) title.textContent = content.hero_title || '';
    if (text) text.textContent = content.hero_text || '';
    if (button) {
      button.textContent = content.hero_button_label || '';
      button.href = content.hero_button_link || '#';
      button.hidden = !content.hero_button_label;
    }
  });
