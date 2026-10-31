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
      root.innerHTML = `
        <div class="seasonal-corner seasonal-corner--left"></div>
        <div class="seasonal-corner seasonal-corner--right"></div>
        <div class="seasonal-garland" aria-hidden="true">
          ${Array.from({ length: 13 }, (_, index) => {
            const distance = index - 6;
            return `<i style="--light-left:${index * 8.333}%;--light-drop:${4 + distance * distance * .35}px;--light-delay:${index * -.21}s"></i>`;
          }).join('')}
        </div>
        <div class="seasonal-ornament seasonal-ornament--left"><i></i></div>
        <div class="seasonal-ornament seasonal-ornament--right"><i></i></div>
        <div class="seasonal-snow" aria-hidden="true">
          ${Array.from({ length: 24 }, (_, index) => `<i style="--flake-column:${(index * 37) % 101}%;--flake-size:${2 + (index % 4)}px;--flake-duration:${11 + (index % 7) * 1.4}s;--flake-delay:${index * -.83}s;--flake-drift:${((index % 5) - 2) * 18}px"></i>`).join('')}
        </div>`;
      return root;
    }
  };
  let anchorObserver;

  function syncAnchor(root) {
    const anchor = document.querySelector('.hero,.page-hero');
    const header = document.querySelector('body > header');
    if (!anchor) return;
    const update = () => {
      const headerBottom = header?.getBoundingClientRect().bottom || 0;
      const anchorTop = anchor.getBoundingClientRect().top;
      root.style.setProperty('--seasonal-anchor', `${Math.max(headerBottom, anchorTop)}px`);
    };
    update();
    anchorObserver?.disconnect();
    if ('ResizeObserver' in window) {
      anchorObserver = new ResizeObserver(update);
      if (header) anchorObserver.observe(header);
      const news = document.querySelector('body > .news');
      if (news) anchorObserver.observe(news);
    }
    window.addEventListener('resize', update, { passive: true });
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
    document.querySelector('.seasonal-decor')?.remove();
    document.documentElement.removeAttribute('data-season');
    const theme = activeTheme(date);
    if (!theme) return null;
    const root = renderers[theme]();
    document.documentElement.dataset.season = theme;
    document.body.append(root);
    syncAnchor(root);
    return theme;
  }

  window.SeasonalDecorations = Object.freeze({
    config,
    getActiveTheme: activeTheme,
    refresh
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(), { once: true });
  else refresh();
})();
