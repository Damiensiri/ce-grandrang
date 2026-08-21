document.head.insertAdjacentHTML('beforeend','<style>.page-sections{max-width:1100px;margin:0 auto 90px;padding:0 8vw;display:grid;gap:28px}.content-card{display:grid;grid-template-columns:minmax(230px,.85fr) 1.15fr;background:#fff;box-shadow:0 14px 34px #06376b12;overflow:hidden}.content-card:nth-child(even) .card-image{order:2}.card-image{min-height:240px;background:#dce7f1 center/cover}.card-copy{padding:42px}.card-copy h2{margin:0 0 16px;color:#06376b;font:32px Georgia,serif}.card-copy p{margin:0;line-height:1.7;white-space:pre-line}.card-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.card-button{display:inline-block;padding:12px 17px;background:#07539a;color:#fff!important;font-weight:700}@media(max-width:700px){.page-sections{padding:0 28px;margin-bottom:55px}.content-card{grid-template-columns:1fr}.content-card:nth-child(even) .card-image{order:0}.card-image{min-height:190px}.card-copy{padding:28px}.card-copy h2{font-size:28px}}</style>');
const shared=document.createElement('script');shared.src='/site.js';document.head.append(shared);
const escape=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug=location.pathname.split('/').filter(Boolean).pop();
fetch(`/api/pages/${slug}`).then(r=>r.json()).then(p=>{
  document.title=`${p.menu_label} · Grand Rang`;
  for(const k of ['eyebrow','title','introduction','body'])document.getElementById(k).textContent=p[k]||'';
  if(p.secondary_body&&p.secondary_body.trim()){const secondary=document.createElement('section');secondary.className='page-body';secondary.style.cssText='padding-top:0;font:17px/1.7 Arial,sans-serif;color:#48627e';secondary.textContent=p.secondary_body;document.querySelector('#body').after(secondary)}
  const hero=document.querySelector('.page-hero');if(p.image_url)hero.style.background=`linear-gradient(90deg,#032e5dcc,#032e5d66),url("${p.image_url}") center/cover`;
  let sections=[];try{sections=JSON.parse(p.sections||'[]')}catch{}
  document.querySelector('#sections').innerHTML=sections.map(s=>{
    const buttons=s.buttons||((s.buttonLabel&&s.buttonUrl)?[{label:s.buttonLabel,url:s.buttonUrl}]:[]);
    const actions=buttons.filter(b=>b.label&&b.url).map(b=>`<a class="card-button" href="${escape(b.url)}" target="_blank" rel="noopener">${escape(b.label)}</a>`).join('');
    return `<article class="content-card">${s.image?`<div class="card-image" style="background-image:url('${encodeURI(s.image)}')"></div>`:''}<div class="card-copy"><h2>${escape(s.title)}</h2><p>${escape(s.text)}</p>${actions?`<div class="card-buttons">${actions}</div>`:''}</div></article>`;
  }).join('');
}).catch(()=>location.replace('/'));
