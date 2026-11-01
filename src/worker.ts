export interface Env { ASSETS: Fetcher; PACK: Fetcher; DB: D1Database; MEDIA: R2Bucket; ADMIN_PASSWORD: string; PREVIEW_ONLY?: string; }

const contactEndpoint = 'https://script.google.com/macros/s/AKfycbye9MNIH8oasKx1AbNl-sfKkf8HA1lyBQua4VfLeNm288heyocfZ4Op7u-je4U2n-9y/exec';
const tabletEndpoint = 'https://grand-rang-pack-annuel.damiensiri-pro.workers.dev/api/bootstrap';
const adultTabletEndpoint = 'https://grand-rang-pack-annuel.damiensiri-pro.workers.dev/api/adults/bootstrap';
const documentKey = (id: string) => `documents/${id}.pdf`;
const documentUrl = (origin: string, id: string) => `${origin}/media/${documentKey(id)}`;
const safePdfName = (value: string) => { const name = value.replace(/[\\/\r\n"<>:|?*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'document.pdf'; return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`; };
const seasonalContentKeys = new Set(['seasonal.mode','seasonal.christmas.enabled','seasonal.christmas.startMonth','seasonal.christmas.startDay','seasonal.christmas.endMonth','seasonal.christmas.endDay']);
const validAnnualDate = (month: number, day: number) => { const value = new Date(2024, month - 1, day); return Number.isInteger(month) && Number.isInteger(day) && value.getMonth() === month - 1 && value.getDate() === day; };

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const xml = (value: string) => value.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]!));
const text = (value: string) => value.replace(/\s+/g, ' ').trim();
const pageSeo = (title: string, description: string, path: string) => `<title>${xml(title)} | Centre Équestre du Grand Rang</title><meta name="description" content="${xml(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://ce-dugrandrang.com${path}"><link rel="icon" href="/logo-grand-rang.png" type="image/png"><link rel="apple-touch-icon" href="/logo-grand-rang.png"><meta property="og:type" content="website"><meta property="og:title" content="${xml(title)} | Centre Équestre du Grand Rang"><meta property="og:description" content="${xml(description)}"><meta property="og:image" content="https://ce-dugrandrang.com/logo-grand-rang.png"><meta property="og:locale" content="fr_FR">`;
type DisplayItem={id:string;active:number;position:number;type:'site_page'|'news'|'image'|'video'|'external_url'|'message';source_slug:string;section_indexes:string;title:string;text:string;media_url:string;external_url:string;duration_seconds:number;transition:'fade'|'slide'|'none';starts_at:string;ends_at:string;time_from:string;time_to:string;updated_at:string};
const displayTypes=['site_page','news','image','video','external_url','message'];
const cleanDisplayItem=(value:Record<string,unknown>)=>{const type=String(value.type||'');if(!displayTypes.includes(type))throw new Error('Type de slide invalide.');const duration=Math.round(Number(value.duration_seconds)||12);if(duration<5||duration>300)throw new Error('La durée doit être comprise entre 5 et 300 secondes.');const transition=['fade','slide','none'].includes(String(value.transition))?String(value.transition):'fade';const str=(key:string,max:number)=>String(value[key]||'').trim().slice(0,max),media_url=str('media_url',1000),external_url=str('external_url',2000);let section_indexes='[]';try{section_indexes=JSON.stringify((Array.isArray(JSON.parse(String(value.section_indexes||'[]')))?JSON.parse(String(value.section_indexes||'[]')):[]).map(Number).filter(Number.isInteger).filter(n=>n>=0).slice(0,3))}catch{throw new Error('Sections invalides.')}const http=(value:string)=>/^https?:\/\//i.test(value);if(media_url&&!(media_url.startsWith('/media/')||http(media_url)))throw new Error('Adresse média invalide.');if(external_url&&!http(external_url))throw new Error('Le lien externe doit commencer par https:// ou http://.');if(type==='external_url'&&!external_url)throw new Error('Une adresse externe est obligatoire pour cette slide.');return {active:value.active?1:0,position:Math.max(0,Math.round(Number(value.position)||0)),type,source_slug:str('source_slug',60),section_indexes,title:str('title',160),text:str('text',3000),media_url,external_url,duration_seconds:duration,transition,starts_at:str('starts_at',10),ends_at:str('ends_at',10),time_from:str('time_from',5),time_to:str('time_to',5)}};
const displayLive=(item:DisplayItem,now:Date)=>{const date=now.toISOString().slice(0,10),time=now.toISOString().slice(11,16);return Boolean(item.active)&&(!item.starts_at||date>=item.starts_at)&&(!item.ends_at||date<=item.ends_at)&&(!item.time_from||time>=item.time_from)&&(!item.time_to||time<=item.time_to)};

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
    const isolatedPreview = env.PREVIEW_ONLY === '1';
    if (isolatedPreview) {
      const blockedPreviewPath = ['/admin', '/api/admin', '/preinscription', '/api/preinscription', '/merci-inscription', '/display', '/api/display', '/api/contact']
        .some((path) => url.pathname.startsWith(path));
      if (blockedPreviewPath || !['GET', 'HEAD'].includes(request.method)) {
        return json({ error: 'Action désactivée dans la prévisualisation.' }, 405);
      }
    }
    if (url.pathname === '/merci-inscription' && request.method === 'GET') {
      const page = await env.ASSETS.fetch(new Request(new URL('/merci-inscription.html', url), request));
      return new Response(page.body, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/display' && request.method === 'GET') { const page=await env.ASSETS.fetch(new Request(new URL('/display.html',url),request));return new Response(page.body,{headers:{'Content-Type':'text/html; charset=UTF-8','Cache-Control':'no-store'}}); }
    if (url.pathname === '/preinscription' && request.method === 'GET') {
      const page = await env.ASSETS.fetch(new Request(new URL('/preinscription.html', url), request));
      return new Response(page.body, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/preinscription-adultes' && request.method === 'GET') {
      const page = await env.ASSETS.fetch(new Request(new URL('/preinscription-adultes.html', url), request));
      return new Response(page.body, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/content' && request.method === 'GET') return json(await content(env));
    if (url.pathname === '/sitemap.xml' && request.method === 'GET') {
      const pages = await env.DB.prepare('SELECT slug FROM pages WHERE published = 1 AND show_on_site = 1 ORDER BY position').all<{ slug: string }>();
      const urls = ['', '/preinscription', ...pages.results.map((page) => `/${page.slug}`)];
      const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>https://ce-dugrandrang.com${path}</loc></url>`).join('')}</urlset>`;
      return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=UTF-8', 'Cache-Control': 'public, max-age=3600' } });
    }
    if (url.pathname === '/api/preinscription/catalog' && request.method === 'GET') {
      const response = await fetch(tabletEndpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return json({ error: `Planning tablette indisponible (${response.status}).` }, 502);
      return new Response(response.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/preinscription-adultes/catalog' && request.method === 'GET') {
      const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname);
      const response = local
        ? await fetch('http://127.0.0.1:8788/api/adults/bootstrap', { headers: { Accept: 'application/json' } })
        : await env.PACK.fetch(new Request('https://pack.internal/api/adults/bootstrap', { headers: { Accept: 'application/json' } }));
      if (!response.ok) return json({ error: `Planning adultes indisponible (${response.status}).` }, 502);
      return new Response(response.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/preinscription-adultes' && request.method === 'POST') {
      const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname);
      const init = { method: 'POST', body: request.body, headers: { 'Content-Type': request.headers.get('Content-Type') || 'multipart/form-data' } };
      const response = local
        ? await fetch('http://127.0.0.1:8788/api/public/adult-preinscriptions', init)
        : await env.PACK.fetch(new Request('https://pack.internal/api/public/adult-preinscriptions', init));
      return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/preinscription/pack' && request.method === 'POST') {
      const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname);
      const init = { method: 'POST', body: request.body, headers: { 'Content-Type': request.headers.get('Content-Type') || 'multipart/form-data' } };
      try {
        const response = local
          ? await fetch('http://127.0.0.1:8788/api/public/preinscriptions', init)
          : await env.PACK.fetch(new Request('https://pack.internal/api/public/preinscriptions', init));
        return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      } catch {
        return json({ error: 'Le service d’inscription est momentanément indisponible. Vérifiez votre connexion puis réessayez.' }, 502);
      }
    }
    if (url.pathname === '/api/preinscription' && request.method === 'POST') {
      const p = await request.json<Record<string, string>>();
      if (p.website || !p.legalName?.trim() || !p.riderName?.trim() || !p.address?.trim() || !p.email?.trim() || !p.phone?.trim() || !p.formula?.trim()) return json({ error: 'Merci de remplir les champs obligatoires.' }, 400);
      if(p.addressVersion==='2'&&(!/^\d{5}$/.test(p.postalCode||'')||!p.city?.trim()))return json({error:'Renseignez le code postal et la ville.'},400);
      const message = `Pré-inscription publique\nFormule : ${p.formula}\nCréneau : ${p.slot || 'à définir'}\nDébut : ${p.startDate || 'à définir'}\nPaiement : ${p.paymentType || 'à définir'}\nCavalier : ${p.riderName}\nAdresse : ${p.address} ${p.postalCode||''} ${p.city||''}\nTéléphone : ${p.phone}\nRIB transmis de manière sécurisée : ${p.ribProvided==='oui'?'oui':'non'}\nInformations : ${p.note || '—'}`;
      const response = await fetch(contactEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ nom: p.legalName, email: p.email, message, source: 'Pré-inscription site' }), redirect: 'follow' });
      return response.ok ? json({ ok: true }) : json({ error: 'Envoi impossible pour le moment.' }, 502);
    }
    if (url.pathname === '/api/menu' && request.method === 'GET') {
      return json((await env.DB.prepare('SELECT slug, menu_label, menu_group, external_url FROM pages WHERE published = 1 AND show_on_site = 1 AND show_in_menu = 1 ORDER BY position, menu_label').all()).results);
    }
    if (url.pathname === '/api/display' && request.method === 'GET') { const items=(await env.DB.prepare('SELECT * FROM display_playlist_items ORDER BY position, updated_at').all<DisplayItem>()).results,pages=(await env.DB.prepare('SELECT slug, menu_label, eyebrow, title, introduction, image_url, sections FROM pages WHERE published=1 AND show_on_site=1').all<{slug:string;menu_label:string;eyebrow:string;title:string;introduction:string;image_url:string;sections:string}>()).results,site=await content(env),bySlug=new Map(pages.map(p=>[p.slug,p]));const slides=items.filter(item=>displayLive(item,new Date())).map(item=>{if(item.type==='site_page'){const p=bySlug.get(item.source_slug);if(!p)return null;let allSections:unknown[]=[];let indexes:number[]=[];try{allSections=JSON.parse(p.sections||'[]');indexes=JSON.parse(item.section_indexes||'[]')}catch{}const sections=Array.isArray(allSections)&&Array.isArray(indexes)?indexes.map(i=>allSections[Number(i)]).filter(s=>s&&typeof s==='object').slice(0,3):[];return {...item,title:item.title||p.title,eyebrow:p.eyebrow,text:item.text||p.introduction,media_url:item.media_url||p.image_url,sections,source_url:`/${p.slug}`}}if(item.type==='news')return site['news.enabled']==='1'?{...item,title:item.title||site['news.title']||'À la une',text:item.text||site['news.text']||'',external_url:item.external_url||site['news.buttonUrl']||'',media_url:item.media_url||site['hero.image']||''}:null;return item}).filter(Boolean);return json({slides,generatedAt:new Date().toISOString()}); }
    if (url.pathname.startsWith('/api/pages/') && request.method === 'GET') {
      const page = await env.DB.prepare('SELECT slug, menu_label, eyebrow, title, introduction, body, secondary_body, image_url, sections FROM pages WHERE slug = ? AND published = 1 AND show_on_site = 1').bind(url.pathname.slice(11)).first();
      return page ? json(page) : json({ error: 'Page introuvable' }, 404);
    }
    if (url.pathname === '/api/admin/session' && request.method === 'POST') {
      return authorized(request, env) ? json({ ok: true }) : json({ error: 'Mot de passe incorrect' }, 401);
    }
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      const payload = await request.json<Record<string, string>>();
      if (payload.website || !payload.nom?.trim() || !payload.email?.trim() || !payload.message?.trim()) return json({ error: 'Merci de remplir les champs obligatoires.' }, 400);
      const response = await fetch(contactEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
      return response.ok ? json({ ok: true }) : json({ error: 'Envoi impossible pour le moment.' }, 502);
    }
    if (url.pathname === '/api/admin/pages' && request.method === 'GET') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      return json((await env.DB.prepare('SELECT slug, menu_label, eyebrow, title, introduction, body, secondary_body, image_url, sections, external_url, position, show_in_menu, show_on_site, menu_group FROM pages ORDER BY position, menu_label').all()).results);
    }
    if (url.pathname === '/api/admin/display' && request.method === 'GET') { if(!authorized(request,env))return json({error:'Non autorisé'},401);const [items,pages]=await Promise.all([env.DB.prepare('SELECT * FROM display_playlist_items ORDER BY position, updated_at').all<DisplayItem>(),env.DB.prepare('SELECT slug, menu_label, title, introduction, image_url, sections FROM pages WHERE published=1 AND show_on_site=1 ORDER BY position').all<{slug:string;menu_label:string;title:string;introduction:string;image_url:string;sections:string}>()]);return json({items:items.results,pages:pages.results}); }
    if (url.pathname === '/api/admin/display' && request.method === 'POST') { if(!authorized(request,env))return json({error:'Non autorisé'},401);try{const item=cleanDisplayItem(await request.json<Record<string,unknown>>()),id=crypto.randomUUID();await env.DB.prepare('INSERT INTO display_playlist_items(id,active,position,type,source_slug,section_indexes,title,text,media_url,external_url,duration_seconds,transition,starts_at,ends_at,time_from,time_to,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind(id,item.active,item.position,item.type,item.source_slug,item.section_indexes,item.title,item.text,item.media_url,item.external_url,item.duration_seconds,item.transition,item.starts_at,item.ends_at,item.time_from,item.time_to).run();return json({id,...item},201)}catch(error){return json({error:error instanceof Error?error.message:'Slide invalide.'},400)} }
    const displayAdmin=url.pathname.match(/^\/api\/admin\/display\/([^/]+)$/);
    if (displayAdmin && request.method === 'PUT') { if(!authorized(request,env))return json({error:'Non autorisé'},401);try{const item=cleanDisplayItem(await request.json<Record<string,unknown>>());await env.DB.prepare('UPDATE display_playlist_items SET active=?,position=?,type=?,source_slug=?,section_indexes=?,title=?,text=?,media_url=?,external_url=?,duration_seconds=?,transition=?,starts_at=?,ends_at=?,time_from=?,time_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(item.active,item.position,item.type,item.source_slug,item.section_indexes,item.title,item.text,item.media_url,item.external_url,item.duration_seconds,item.transition,item.starts_at,item.ends_at,item.time_from,item.time_to,displayAdmin[1]).run();return json({ok:true})}catch(error){return json({error:error instanceof Error?error.message:'Slide invalide.'},400)} }
    if (displayAdmin && request.method === 'DELETE') { if(!authorized(request,env))return json({error:'Non autorisé'},401);await env.DB.prepare('DELETE FROM display_playlist_items WHERE id=?').bind(displayAdmin[1]).run();return json({ok:true}); }
    if (url.pathname === '/api/admin/pages' && request.method === 'POST') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const p = await request.json<Record<string, string>>(); const slug = String(p.slug || '').toLowerCase().trim();
      if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ error: 'Adresse invalide : lettres minuscules, chiffres et tirets.' }, 400);
      if (await env.DB.prepare('SELECT slug FROM pages WHERE slug=?').bind(slug).first()) return json({ error: 'Cette adresse est déjà utilisée.' }, 409);
      const max = await env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS position FROM pages').first<{ position: number }>();
      await env.DB.prepare('INSERT INTO pages (slug, menu_label, eyebrow, title, introduction, body, secondary_body, image_url, sections, external_url, position, show_in_menu, show_on_site, menu_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(slug, p.menu_label || 'Nouvelle page', p.eyebrow || '', p.title || 'Nouvelle page', p.introduction || '', p.body || '', p.secondary_body || '', p.image_url || '', '[]', p.external_url || '', Number(max?.position || 0) + 10, 1, 1, p.menu_group || '').run();
      return json({ ok: true, slug }, 201);
    }
    if (url.pathname.startsWith('/api/admin/pages/') && request.method === 'PUT') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const p = await request.json<Record<string, string>>();
      await env.DB.prepare('UPDATE pages SET menu_label=?, eyebrow=?, title=?, introduction=?, body=?, secondary_body=?, image_url=?, sections=?, external_url=?, position=?, show_in_menu=?, show_on_site=?, menu_group=? WHERE slug=?').bind(p.menu_label, p.eyebrow, p.title, p.introduction, p.body, p.secondary_body || '', p.image_url || '', p.sections || '[]', p.external_url || '', Number(p.position)||0, Number(p.show_in_menu)||0, Number(p.show_on_site)||0, p.menu_group||'', url.pathname.slice(17)).run();
      return json({ ok: true });
    }
    if (url.pathname === '/api/admin/content' && request.method === 'PUT') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const entries = await request.json<Record<string, string>>();
      const seasonalEntries = Object.keys(entries).some(key => key.startsWith('seasonal.'));
      if (seasonalEntries) {
        const mode = entries['seasonal.mode'], enabled = entries['seasonal.christmas.enabled'];
        const startMonth = Number(entries['seasonal.christmas.startMonth']), startDay = Number(entries['seasonal.christmas.startDay']), endMonth = Number(entries['seasonal.christmas.endMonth']), endDay = Number(entries['seasonal.christmas.endDay']);
        if (!['auto','christmas','off'].includes(mode) || !['0','1'].includes(enabled)) return json({ error: 'Réglage saisonnier invalide.' }, 400);
        if (!validAnnualDate(startMonth, startDay) || !validAnnualDate(endMonth, endDay)) return json({ error: 'Les dates saisonnières sont invalides.' }, 400);
      }
      const statements = Object.entries(entries).filter(([key, value]) => (/^(hero|news)\./.test(key) || seasonalContentKeys.has(key)) && typeof value === 'string').map(([key, value]) => env.DB.prepare('INSERT INTO site_content (content_key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(content_key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP').bind(key, value.trim()));
      if (statements.length) await env.DB.batch(statements);
      return json(await content(env));
    }
    if (url.pathname === '/api/admin/media' && request.method === 'POST') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const form = await request.formData(); const file = form.get('file');
      if (!(file instanceof File) || (!file.type.startsWith('image/')&&!file.type.startsWith('video/')) || file.size > 100 * 1024 * 1024) return json({ error: 'Image ou vidéo requise, maximum 100 Mo.' }, 400);
      const extension = file.type.split('/')[1]; const key = `uploads/${crypto.randomUUID()}.${extension}`;
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return json({ url: `/media/${key}` }, 201);
    }
    if (url.pathname === '/api/admin/documents' && request.method === 'GET') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const listed = await env.MEDIA.list({ prefix: 'documents/', limit: 1000 });
      const documents = (await Promise.all(listed.objects.map(async object => {
        const id = object.key.match(/^documents\/([a-f0-9-]{36})\.pdf$/i)?.[1];
        if (!id) return null;
        const metadata = await env.MEDIA.head(object.key);
        return { id, name: safePdfName(metadata?.customMetadata?.name || 'document.pdf'), size: object.size, uploadedAt: metadata?.customMetadata?.uploadedAt || object.uploaded.toISOString(), url: documentUrl(url.origin, id) };
      }))).filter((document): document is { id: string; name: string; size: number; uploadedAt: string; url: string } => Boolean(document)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      return json({ documents });
    }
    if (url.pathname === '/api/admin/documents' && request.method === 'POST') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const form = await request.formData(), file = form.get('pdf');
      if (!(file instanceof File) || !file.size) return json({ error: 'Choisissez un document PDF.' }, 400);
      if (file.size > 20 * 1024 * 1024) return json({ error: 'Le PDF ne peut pas dépasser 20 Mo.' }, 400);
      if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return json({ error: 'Le fichier doit être un PDF.' }, 400);
      const id = crypto.randomUUID(), name = safePdfName(String(form.get('title') || file.name)), uploadedAt = new Date().toISOString();
      await env.MEDIA.put(documentKey(id), file.stream(), { httpMetadata: { contentType: 'application/pdf', contentDisposition: `inline; filename="${name}"` }, customMetadata: { name, uploadedAt } });
      return json({ document: { id, name, size: file.size, uploadedAt, url: documentUrl(url.origin, id) } }, 201);
    }
    const adminDocument = url.pathname.match(/^\/api\/admin\/documents\/([a-f0-9-]{36})$/i);
    if (adminDocument && request.method === 'DELETE') {
      if (!authorized(request, env)) return json({ error: 'Non autorisé' }, 401);
      const key = documentKey(adminDocument[1]);
      if (!await env.MEDIA.head(key)) return json({ error: 'Document introuvable.' }, 404);
      await env.MEDIA.delete(key);
      return json({ deleted: true });
    }
    if (url.pathname.startsWith('/media/')) {
      const key = url.pathname.slice(7), object = await env.MEDIA.get(key);
      if (!object) return new Response('Image introuvable', { status: 404 });
      return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Content-Disposition': object.httpMetadata?.contentDisposition || 'inline', 'Cache-Control': key.startsWith('documents/') ? 'public, max-age=3600' : 'public, max-age=31536000, immutable' } });
    }
    if (request.method === 'GET' && /^\/[a-z0-9-]+$/.test(url.pathname)) {
      const page = await env.DB.prepare('SELECT slug, menu_label, title, introduction, body FROM pages WHERE slug=? AND published=1 AND show_on_site=1').bind(url.pathname.slice(1)).first<{ slug: string; menu_label: string; title: string; introduction: string; body: string }>();
      if (page) {
        const template = await env.ASSETS.fetch(new Request(new URL('/page-template.txt', url), request));
        const description = text(page.introduction || page.body || `Informations sur ${page.menu_label} au Centre Équestre du Grand Rang.`).slice(0, 155);
        const html = (await template.text()).replace('<title>Grand Rang</title>', pageSeo(page.title || page.menu_label, description, url.pathname));
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
      }
    }
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
