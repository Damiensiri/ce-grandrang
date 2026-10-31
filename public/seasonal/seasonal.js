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

  const renderers = {
    christmas() {
      const root = document.createElement('div');
      root.className = 'seasonal-decor seasonal-decor--christmas';
      if (document.querySelector('.page-hero')) root.classList.add('seasonal-decor--inner');
      root.dataset.season = 'christmas';
      root.setAttribute('aria-hidden', 'true');
      root.setAttribute('role', 'presentation');
      root.inert = true;
      const snowflakes = Array.from({ length: 42 }, (_, index) => {
        const depth = ['back', 'mid', 'mid', 'front'][index % 4];
        const size = depth === 'back' ? 1 + (index % 2) : depth === 'front' ? 5 + (index % 4) : 2 + (index % 3);
        const duration = depth === 'back' ? 17 + (index % 6) * 1.4 : depth === 'front' ? 10 + (index % 4) * 1.2 : 13 + (index % 6) * 1.3;
        const drift = ((index % 9) - 4) * (depth === 'front' ? 18 : 11);
        return `<i class="seasonal-snowflake seasonal-snowflake--${depth}" style="--flake-column:${1 + ((index * 37) % 98)}%;--flake-size:${size}px;--flake-duration:${duration}s;--flake-delay:${index * -.83}s;--flake-drift:${drift}px"></i>`;
      }).join('');
      root.innerHTML = `
        <div class="seasonal-corner-branch seasonal-corner-branch--left"></div>
        <div class="seasonal-corner-branch seasonal-corner-branch--right"></div>
        <div class="seasonal-edge-lights seasonal-edge-lights--left"></div>
        <div class="seasonal-edge-lights seasonal-edge-lights--right"></div>
        <div class="seasonal-warm-bokeh"></div>
        <div class="seasonal-lantern"></div>
        <div class="seasonal-fence-right"></div>
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
    ambience.innerHTML = `
      <span class="seasonal-village-smoke" style="--village-x:18%;--village-delay:-2.1s"></span>
      <span class="seasonal-village-smoke" style="--village-x:47%;--village-delay:-5.4s"></span>
      <span class="seasonal-village-smoke" style="--village-x:73%;--village-delay:-3.7s"></span>
      ${[7, 13, 22, 31, 39, 51, 59, 67, 78, 86, 93].map((left, index) =>
        `<i style="--village-x:${left}%;--village-y:${8 + (index % 3) * 7}px;--village-delay:${index * -.71}s"></i>`
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
