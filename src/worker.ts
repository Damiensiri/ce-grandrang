export interface Env { ASSETS: Fetcher; DB: D1Database; MEDIA: R2Bucket; ADMIN_PASSWORD: string; }

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function authorized(request: Request, env: Env) {
  const token = request.headers.get('authorization');
  const password = env.ADMIN_PASSWORD?.trim();
  return typeof password === 'string' && password.length >= 12 && token === `Bearer ${password}`;
}

async function content(env: Env) {
  const { results } = await env.DB.prepare('SELECT content_key, value FROM site_content').all<{ content_key: string; value: string }>();
  return Object.fromEntries(results.map((row) => [row.content_key, row.value]));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/content' && request.method === 'GET') return json(await content(env));
    if (url.pathname === '/api/menu' && request.method === 'GET') {
      return json((await env.DB.prepare('SELECT slug, menu_label, menu_group FROM pages WHERE published = 1 AND show_on_site = 1 AND show_in_menu = 1 ORDER BY position, menu_label').all()).results);
    }
    if (url.pathname.startsWith('/api/pages/') && request.method === 'GET') {
      const page = await env.DB.prepare('SELECT slug, menu_label, eyebrow, title, introduction, body, image_url, sections FROM pages WHERE slug = ? AND published = 1 AND show_on_site = 1').bind(url.pathname.slice(11)).first();
      return page ? json(page) : json({ error: 'Page introuvable' }, 404);
    }
    if (url.pathname === '/api/admin/session' && request.method === 'POST') {
      return authorized(request, env) ? json({ ok: true }) : json({ error: 'Mot de passe incorrect' }, 401);
    }
    if (url.pathname === '/api/admin/pages' && request.method === 'GET') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      return json((await env.DB.prepare('SELECT slug, menu_label, eyebrow, title, introduction, body, image_url, sections, position, show_in_menu, show_on_site, menu_group FROM pages ORDER BY position, menu_label').all()).results);
    }
    if (url.pathname === '/api/admin/pages' && request.method === 'POST') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const p = await request.json<Record<string, string>>(); const slug = String(p.slug || '').toLowerCase().trim();
      if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ error: 'Adresse invalide : lettres minuscules, chiffres et tirets.' }, 400);
      if (await env.DB.prepare('SELECT slug FROM pages WHERE slug=?').bind(slug).first()) return json({ error: 'Cette adresse est déjà utilisée.' }, 409);
      const max = await env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS position FROM pages').first<{ position: number }>();
      await env.DB.prepare('INSERT INTO pages (slug, menu_label, eyebrow, title, introduction, body, image_url, sections, position, show_in_menu, show_on_site, menu_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(slug, p.menu_label || 'Nouvelle page', p.eyebrow || '', p.title || 'Nouvelle page', p.introduction || '', p.body || '', p.image_url || '', '[]', Number(max?.position || 0) + 10, 1, 1, p.menu_group || '').run();
      return json({ ok: true, slug }, 201);
    }
    if (url.pathname.startsWith('/api/admin/pages/') && request.method === 'PUT') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const p = await request.json<Record<string, string>>();
      await env.DB.prepare('UPDATE pages SET menu_label=?, eyebrow=?, title=?, introduction=?, body=?, image_url=?, sections=?, position=?, show_in_menu=?, show_on_site=?, menu_group=? WHERE slug=?').bind(p.menu_label, p.eyebrow, p.title, p.introduction, p.body, p.image_url || '', p.sections || '[]', Number(p.position)||0, Number(p.show_in_menu)||0, Number(p.show_on_site)||0, p.menu_group||'', url.pathname.slice(17)).run();
      return json({ ok: true });
    }
    if (url.pathname === '/api/admin/content' && request.method === 'PUT') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const entries = await request.json<Record<string, string>>();
      const statements = Object.entries(entries).filter(([key, value]) => key.startsWith('hero.') && typeof value === 'string').map(([key, value]) => env.DB.prepare('INSERT INTO site_content (content_key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(content_key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP').bind(key, value.trim()));
      if (statements.length) await env.DB.batch(statements);
      return json(await content(env));
    }
    if (url.pathname === '/api/admin/media' && request.method === 'POST') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const form = await request.formData(); const file = form.get('file');
      if (!(file instanceof File) || !file.type.startsWith('image/') || file.size > 25 * 1024 * 1024) return json({ error: 'Image requise, maximum 25 Mo.' }, 400);
      const extension = file.type.split('/')[1]; const key = `uploads/${crypto.randomUUID()}.${extension}`;
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return json({ url: `/media/${key}` }, 201);
    }
    if (url.pathname.startsWith('/media/')) {
      const object = await env.MEDIA.get(url.pathname.slice(7));
      if (!object) return new Response('Image introuvable', { status: 404 });
      return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    if (request.method === 'GET' && /^\/[a-z0-9-]+$/.test(url.pathname)) {
      const page = await env.DB.prepare('SELECT slug FROM pages WHERE slug=? AND published=1 AND show_on_site=1').bind(url.pathname.slice(1)).first();
      if (page) {
        const template = await env.ASSETS.fetch(new Request(new URL('/page-template.txt', url), request));
        return new Response(template.body, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
      }
    }
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
