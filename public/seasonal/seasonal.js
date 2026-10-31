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
        <div class="seasonal-edge-lights seasonal-edge-lights--left"></div>
        <div class="seasonal-edge-lights seasonal-edge-lights--right"></div>
        <div class="seasonal-bottom-garland"></div>
        <div class="seasonal-snow" aria-hidden="true">
          ${Array.from({ length: 16 }, (_, index) => `<i style="--flake-column:${3 + ((index * 37) % 94)}%;--flake-size:${2 + (index % 3)}px;--flake-duration:${12 + (index % 6) * 1.45}s;--flake-delay:${index * -.91}s;--flake-drift:${((index % 5) - 2) * 16}px"></i>`).join('')}
        </div>`;
      return root;
    }
  };

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
    document.documentElement.removeAttribute('data-season');
    const theme = activeTheme(date);
    if (!theme) return null;
    const host = document.querySelector('.hero,.page-hero');
    if (!host) return null;
    const root = renderers[theme]();
    document.documentElement.dataset.season = theme;
    host.classList.add('seasonal-host');
    host.prepend(root);
    document.querySelector('body > header')?.classList.add('seasonal-header--christmas');
    document.querySelector('body > .news')?.classList.add('seasonal-news--christmas');
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
