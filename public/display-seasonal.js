(() => {
  'use strict';

  const root = document.querySelector('#display');
  if (!root) return;

  const defaults = {
    mode: 'auto',
    enabled: true,
    start: { month: 11, day: 25 },
    end: { month: 1, day: 6 }
  };
  const sessionKey = 'ce-grandrang-seasonal-preview';
  let settings = defaults;
  let renderedTheme = null;

  const validDate = value => value && Number.isInteger(value.month) && Number.isInteger(value.day);
  const dayKey = value => value.month * 100 + value.day;

  function inAnnualRange(date, theme) {
    if (!validDate(theme.start) || !validDate(theme.end)) return false;
    const current = (date.getMonth() + 1) * 100 + date.getDate();
    const start = dayKey(theme.start);
    const end = dayKey(theme.end);
    return start <= end ? current >= start && current <= end : current >= start || current <= end;
  }

  function previewOverride() {
    const parameter = new URLSearchParams(location.search).get('season');
    if (['christmas', 'off', 'auto'].includes(parameter)) {
      try {
        if (parameter === 'auto') sessionStorage.removeItem(sessionKey);
        else sessionStorage.setItem(sessionKey, parameter);
      } catch {}
      return parameter === 'auto' ? null : parameter;
    }
    try {
      const stored = sessionStorage.getItem(sessionKey);
      return ['christmas', 'off'].includes(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  function activeTheme(date = new Date()) {
    const override = previewOverride();
    if (override === 'off' || settings.mode === 'off') return null;
    if (override === 'christmas') return 'christmas';
    if (settings.mode === 'christmas') return 'christmas';
    return settings.enabled && inAnnualRange(date, settings) ? 'christmas' : null;
  }

  function christmasDecor() {
    const decor = document.createElement('div');
    decor.className = 'display-seasonal-decor';
    decor.setAttribute('aria-hidden', 'true');
    decor.setAttribute('role', 'presentation');
    decor.inert = true;
    const snow = Array.from({ length: 112 }, (_, index) => {
      const depth = ['back', 'mid', 'mid', 'front', 'mid'][index % 5];
      const size = depth === 'back' ? 2.5 + index % 3 * .8 : depth === 'front' ? 7 + index % 4 * 1.6 : 3.5 + index % 4 * 1.15;
      const duration = depth === 'front' ? 9.5 + index % 5 * 1.1 : 12.5 + index % 7 * 1.2;
      const drift = ((index % 11) - 5) * (depth === 'front' ? 18 : 10);
      const opacity = depth === 'back' ? .48 + index % 4 * .07 : .68 + index % 4 * .09;
      const column = 1 + (index * 47) % 98;
      return `<i class="display-seasonal-snowflake display-seasonal-snowflake--${depth}" style="--display-flake-column:${column}%;--display-flake-size:${size}px;--display-flake-duration:${duration}s;--display-flake-delay:${index * -.67}s;--display-flake-drift:${drift}px;--display-flake-opacity:${opacity}"></i>`;
    }).join('');
    decor.innerHTML = `<div class="display-seasonal-frame">
      <i class="display-seasonal-frame-part display-seasonal-frame-part--top-left"></i>
      <i class="display-seasonal-frame-part display-seasonal-frame-part--top-right"></i>
      <i class="display-seasonal-frame-part display-seasonal-frame-part--bottom-left"></i>
      <i class="display-seasonal-frame-part display-seasonal-frame-part--bottom-right"></i>
    </div><div class="display-seasonal-snow">${snow}</div>`;
    return decor;
  }

  function render() {
    const theme = activeTheme();
    if (theme === renderedTheme) return theme;
    root.querySelectorAll(':scope > .display-seasonal-decor').forEach(element => element.remove());
    root.classList.remove('display-seasonal--christmas');
    document.documentElement.removeAttribute('data-display-season');
    renderedTheme = theme;
    if (theme !== 'christmas') return null;
    document.documentElement.dataset.displaySeason = theme;
    root.classList.add('display-seasonal--christmas');
    root.append(christmasDecor());
    return theme;
  }

  function managedSettings(content) {
    const number = (key, fallback) => {
      const value = Number(content[key]);
      return Number.isInteger(value) ? value : fallback;
    };
    const mode = ['auto', 'christmas', 'off'].includes(content['seasonal.mode']) ? content['seasonal.mode'] : defaults.mode;
    return {
      mode,
      enabled: content['seasonal.christmas.enabled'] == null ? defaults.enabled : content['seasonal.christmas.enabled'] !== '0',
      start: {
        month: number('seasonal.christmas.startMonth', defaults.start.month),
        day: number('seasonal.christmas.startDay', defaults.start.day)
      },
      end: {
        month: number('seasonal.christmas.endMonth', defaults.end.month),
        day: number('seasonal.christmas.endDay', defaults.end.day)
      }
    };
  }

  async function synchronize() {
    try {
      const response = await fetch('/api/content', { cache: 'no-store' });
      if (response.ok) settings = managedSettings(await response.json());
    } catch {}
    render();
  }

  window.DisplaySeasonalDecorations = Object.freeze({
    getActiveTheme: activeTheme,
    refresh: synchronize
  });

  void synchronize();
  setInterval(synchronize, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void synchronize();
  });
})();
