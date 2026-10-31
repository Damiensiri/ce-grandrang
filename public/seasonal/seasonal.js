(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    mode: 'auto',
    queryParameter: 'season',
    sessionKey: 'ce-grandrang-seasonal-preview',
    themes: {
      christmas: {
        enabled: true,
        start: { month: 11, day: 25 },
        end: { month: 1, day: 6 }
      }
    }
  };

  const config = {
    ...DEFAULT_CONFIG,
    ...(window.SEASONAL_DECORATIONS || {}),
    themes: {
      ...DEFAULT_CONFIG.themes,
      ...((window.SEASONAL_DECORATIONS || {}).themes || {})
    }
  };

  let backdropObserver = null;
  const CHRISTMAS_BACKDROP = 'linear-gradient(90deg, rgba(8,24,38,.62) 0%, rgba(15,28,38,.38) 46%, rgba(92,53,12,.16) 100%)';

  function restoreBackdrop() {
    backdropObserver?.disconnect();
    backdropObserver = null;
    document.querySelectorAll('[data-seasonal-original-background]').forEach(element => {
      element.style.backgroundImage = element.dataset.seasonalOriginalBackground || '';
      delete element.dataset.seasonalOriginalBackground;
    });
  }

  function applyChristmasBackdrop(host) {
    const update = () => {
      const current = host.style.backgroundImage;
      if (!current || current.includes('rgba(92, 53, 12, 0.16)')) return;
      const imageStart = current.indexOf('url(');
      if (imageStart < 0) return;
      host.dataset.seasonalOriginalBackground = current;
      host.style.backgroundImage = `${CHRISTMAS_BACKDROP}, ${current.slice(imageStart)}`;
    };
    update();
    backdropObserver = new MutationObserver(update);
    backdropObserver.observe(host, { attributes: true, attributeFilter: ['style'] });
  }

  const renderers = {
    christmas() {
      const root = document.createElement('div');
      root.className = 'seasonal-decor seasonal-decor--christmas';
      if (document.querySelector('.page-hero')) root.classList.add('seasonal-decor--inner');
      root.dataset.season = 'christmas';
      root.setAttribute('aria-hidden', 'true');
      root.setAttribute('role', 'presentation');
      root.inert = true;
      const snowflakes = Array.from({ length: 72 }, (_, index) => {
        const depth = ['back', 'back', 'mid', 'mid', 'mid', 'front'][index % 6];
        const size = depth === 'back' ? 1 + (index % 2) * .7 : depth === 'front' ? 5 + (index % 4) * 1.4 : 2 + (index % 3) * 1.15;
        const duration = depth === 'back' ? 18 + (index % 7) * 1.35 : depth === 'front' ? 10.5 + (index % 5) * 1.15 : 14 + (index % 7) * 1.2;
        const drift = ((index % 11) - 5) * (depth === 'front' ? 15 : 8);
        const opacity = depth === 'back' ? .3 + (index % 4) * .06 : depth === 'front' ? .46 + (index % 3) * .09 : .58 + (index % 4) * .07;
        const column = 1 + ((index * 47) % 98);
        const mobileSafe = column < 4 || column > 74 ? ' seasonal-snowflake--mobile-safe' : '';
        return `<i class="seasonal-snowflake seasonal-snowflake--${depth}${mobileSafe}" style="--flake-column:${column}%;--flake-size:${size}px;--flake-duration:${duration}s;--flake-delay:${index * -.67}s;--flake-drift:${drift}px;--flake-opacity:${opacity}"></i>`;
      }).join('');
      root.innerHTML = `
        <div class="seasonal-hero-lighting"></div>
        <div class="seasonal-hero-frame"></div>
        <div class="seasonal-hero-sparkles">
          <i style="--spark-x:6%;--spark-y:18%;--spark-delay:-1.2s"></i>
          <i style="--spark-x:94%;--spark-y:24%;--spark-delay:-3.8s"></i>
          <i style="--spark-x:10%;--spark-y:70%;--spark-delay:-5.1s"></i>
          <i style="--spark-x:89%;--spark-y:76%;--spark-delay:-2.4s"></i>
          <i style="--spark-x:82%;--spark-y:12%;--spark-delay:-6.2s"></i>
        </div>
        <div class="seasonal-snow" aria-hidden="true">
          ${snowflakes}
        </div>`;
      return root;
    }
  };

  function createVillageAmbience() {
    const ambience = document.createElement('div');
    ambience.className = 'seasonal-village-ambience';
    ambience.setAttribute('aria-hidden', 'true');
    ambience.setAttribute('role', 'presentation');
    ambience.inert = true;
    const villageLights = [
      [3.4, 8, 'tree'], [6.1, 12, 'window'], [9.8, 9, 'window'], [13.4, 16, 'tree'],
      [17.2, 9, 'window'], [21.4, 13, 'window'], [25.7, 8, 'tree'], [29.8, 12, 'window'],
      [34.2, 9, 'window'], [38.5, 15, 'tree'], [42.8, 14, 'church'], [47.6, 9, 'window'],
      [52.1, 13, 'window'], [56.4, 8, 'tree'], [61.2, 12, 'window'], [66.7, 9, 'window'],
      [71.4, 15, 'tree'], [76.1, 9, 'window'], [81.3, 13, 'window'], [86.5, 8, 'tree'],
      [91.2, 12, 'window'], [96, 9, 'tree']
    ];
    ambience.innerHTML = `
      <span class="seasonal-village-smoke" style="--village-x:10.5%;--village-delay:-2.1s"></span>
      <span class="seasonal-village-smoke" style="--village-x:43.2%;--village-delay:-5.4s"></span>
      <span class="seasonal-village-smoke" style="--village-x:72.4%;--village-delay:-3.7s"></span>
      ${villageLights.map(([left, bottom, type], index) =>
        `<i class="seasonal-village-light seasonal-village-light--${type}" style="--village-x:${left}%;--village-y:${bottom}px;--village-delay:${index * -.53}s"></i>`
      ).join('')}`;
    return ambience;
  }

  const validDate = value => value && Number.isInteger(value.month) && Number.isInteger(value.day);
  const dayKey = value => value.month * 100 + value.day;

  function isInAnnualRange(date, theme) {
    if (!validDate(theme.start) || !validDate(theme.end)) return false;
    const current = (date.getMonth() + 1) * 100 + date.getDate();
    const start = dayKey(theme.start);
    const end = dayKey(theme.end);
    if (start <= end) return current >= start && current <= end;
    return current >= start || current <= end;
  }

  function readPreviewOverride() {
    const parameter = new URLSearchParams(location.search).get(config.queryParameter);
    const allowed = new Set(['auto', 'off', ...Object.keys(renderers)]);
    if (parameter && allowed.has(parameter)) {
      try {
        if (parameter === 'auto') sessionStorage.removeItem(config.sessionKey);
        else sessionStorage.setItem(config.sessionKey, parameter);
      } catch {}
      return parameter === 'auto' ? null : parameter;
    }
    try {
      const stored = sessionStorage.getItem(config.sessionKey);
      return stored && allowed.has(stored) && stored !== 'auto' ? stored : null;
    } catch {
      return null;
    }
  }

  function activeTheme(date = new Date()) {
    const override = readPreviewOverride();
    if (override === 'off' || config.mode === 'off') return null;
    if (override && renderers[override]) return override;
    if (config.mode !== 'auto' && renderers[config.mode]) return config.mode;
    return Object.entries(config.themes).find(([id, theme]) =>
      renderers[id] && theme.enabled !== false && isInAnnualRange(date, theme)
    )?.[0] || null;
  }

  function refresh(date = new Date()) {
    restoreBackdrop();
    document.querySelectorAll('.seasonal-decor').forEach(element => element.remove());
    document.querySelectorAll('.seasonal-host').forEach(element => element.classList.remove('seasonal-host'));
    document.querySelectorAll('.seasonal-header--christmas').forEach(element => element.classList.remove('seasonal-header--christmas'));
    document.querySelectorAll('.seasonal-news--christmas').forEach(element => element.classList.remove('seasonal-news--christmas'));
    document.querySelectorAll('.seasonal-village-ambience').forEach(element => element.remove());
    document.documentElement.removeAttribute('data-season');
    const theme = activeTheme(date);
    if (!theme) return null;
    const host = document.querySelector('.hero,.page-hero');
    if (!host) return null;
    const root = renderers[theme]();
    document.documentElement.dataset.season = theme;
    host.classList.add('seasonal-host');
    host.prepend(root);
    if (theme === 'christmas') applyChristmasBackdrop(host);
    const header = document.querySelector('body > header');
    header?.classList.add('seasonal-header--christmas');
    header?.append(createVillageAmbience());
    document.querySelector('body > .news')?.classList.add('seasonal-news--christmas');
    return theme;
  }

  async function loadManagedConfig() {
    try {
      const response = await fetch('/api/content', { cache: 'no-store' });
      if (!response.ok) return;
      const content = await response.json();
      const mode = content['seasonal.mode'];
      if (['auto', 'christmas', 'off'].includes(mode)) config.mode = mode;
      const current = config.themes.christmas;
      const number = (key, fallback) => {
        const value = Number(content[key]);
        return Number.isInteger(value) ? value : fallback;
      };
      config.themes.christmas = {
        ...current,
        enabled: content['seasonal.christmas.enabled'] == null ? current.enabled : content['seasonal.christmas.enabled'] !== '0',
        start: {
          month: number('seasonal.christmas.startMonth', current.start.month),
          day: number('seasonal.christmas.startDay', current.start.day)
        },
        end: {
          month: number('seasonal.christmas.endMonth', current.end.month),
          day: number('seasonal.christmas.endDay', current.end.day)
        }
      };
    } catch {}
  }

  async function start() {
    await loadManagedConfig();
    refresh();
  }

  window.SeasonalDecorations = Object.freeze({
    config,
    getActiveTheme: activeTheme,
    refresh
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
