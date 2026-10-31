(()=>{
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/preinscription-details.css?v=20260924';document.head.append(stylesheet);
 const labels={pass_sport:"Pass'Sport",msa:'Bon MSA',caf:'Bon CAF'};
 function install(){
  for(const form of document.querySelectorAll('#request,#adult-request')){
   if(form.dataset.detailsInstalled)return;form.dataset.detailsInstalled='1';
   const address=form.elements.address;if(!address)continue;
   const postal=document.createElement('label');postal.textContent='Code postal *';postal.innerHTML+='<input name="postalCode" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="postal-code">';
   const city=document.createElement('label');city.textContent='Ville *';city.innerHTML+='<input name="city" required maxlength="100" autocomplete="address-level2">';
   address.closest('label').after(postal,city);
   const version=document.createElement('input');version.type='hidden';version.name='addressVersion';version.value='2';form.append(version);
   if(form.id==='request'&&form.elements.formula?.value!=='Pack annuel')continue;
   const section=document.createElement('fieldset');section.className='bank-details aid-details';
   section.innerHTML='<legend>Aides financières (facultatif)</legend><p>Vous pouvez déclarer plusieurs aides. Le centre renseignera leur montant après vérification.</p>'+Object.entries(labels).map(([type,label])=>'<div class="aid-choice"><label><input type="checkbox" name="aid_'+type+'"> '+label+'</label><div data-fields="'+type+'" hidden>'+(type==='pass_sport'?'<label>Numéro Pass’Sport<input name="aid_pass_sport_number" maxlength="100" disabled></label>':'<label>Justificatif '+label+' (PDF, JPG ou PNG · 8 Mo max)<input name="aid_'+type+'_file" type="file" accept="application/pdf,image/jpeg,image/png" disabled></label><button class="previous" type="button" data-photo="'+type+'">Prendre le bon en photo</button><input type="file" accept="image/*" capture="environment" data-camera="'+type+'" hidden><p data-file-status="'+type+'" role="status"></p>')+'</div></div>').join('')+'<p class="notice">Les aides financières indiquées sont prises en compte à titre provisoire et restent soumises à vérification et acceptation par le Centre équestre du Grand Rang. Le montant définitif et l’échéancier pourront être ajustés lors de la validation de votre inscription.</p>';
   form.querySelector('.form-grid').after(section);
   for(const type of Object.keys(labels)){
    const toggle=form.elements['aid_'+type],fields=section.querySelector('[data-fields="'+type+'"]'),input=form.elements[type==='pass_sport'?'aid_pass_sport_number':'aid_'+type+'_file'];
    toggle.onchange=()=>{fields.hidden=!toggle.checked;input.disabled=!toggle.checked;input.required=toggle.checked};
    if(type==='pass_sport')continue;
    const camera=section.querySelector('[data-camera="'+type+'"]'),status=section.querySelector('[data-file-status="'+type+'"]');
    section.querySelector('[data-photo="'+type+'"]').onclick=()=>camera.click();
    input.onchange=()=>{input.setCustomValidity(input.files[0]?.size>8*1024*1024?'Le document dépasse 8 Mo.':'');status.textContent=input.files[0]?.name||''};
    camera.onchange=async()=>{
     const file=camera.files[0];if(!file)return;const url=URL.createObjectURL(file);
     try{
      const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url});
      const scale=Math.min(1,2000/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
      canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw Error();
      const transfer=new DataTransfer();transfer.items.add(new File([blob],type+'-photo.jpg',{type:'image/jpeg'}));input.files=transfer.files;input.dispatchEvent(new Event('change'));status.textContent='Photo prête. Elle sera enregistrée au format PDF.';
     }catch{status.textContent='Photo illisible. Importez un PDF, JPG ou PNG.'}finally{URL.revokeObjectURL(url)}
    };
   }
  }
 }
 new MutationObserver(install).observe(document.querySelector('#wizard'),{childList:true,subtree:true});install();
})();
