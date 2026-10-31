const ibanLengths={FR:27,MC:27,BE:16,DE:22,ES:24,IT:27,LU:20,NL:18,PT:25,CH:21,GB:22,IE:22,AT:20};
const normalizeBankValue=value=>String(value||'').replace(/\s+/g,'').toUpperCase();
function validIban(value){
  const iban=normalizeBankValue(value);
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)||ibanLengths[iban.slice(0,2)]!==iban.length)return false;
  let remainder=0;
  for(const character of iban.slice(4)+iban.slice(0,4)){
    const digits=/[A-Z]/.test(character)?String(character.charCodeAt(0)-55):character;
    for(const digit of digits)remainder=(remainder*10+Number(digit))%97;
  }
  return remainder===1;
}
const validBic=value=>/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalizeBankValue(value));
const acceptedRibTypes=new Set(['application/pdf','image/jpeg','image/png']);
function errorBox(form){
  let box=form.querySelector('.submission-error');
  if(!box){box=document.createElement('p');box.className='submission-error';box.setAttribute('role','alert');box.setAttribute('aria-live','assertive');box.tabIndex=-1;form.querySelector('.actions')?.before(box)}
  return box;
}
function fieldError(form,name,message){
  const input=form.elements[name];
  errorBox(form).textContent=message;
  if(input){input.setAttribute('aria-invalid','true');input.focus()}
  return false;
}
function validateBankDetails(form){
  if(!form.elements.iban)return true;
  const iban=form.elements.iban,bic=form.elements.bic,rib=form.elements.rib,file=rib?.files?.[0];
  iban.value=normalizeBankValue(iban.value);bic.value=normalizeBankValue(bic.value);
  if(!validIban(iban.value))return fieldError(form,'iban','L’IBAN saisi est invalide. Vérifiez les chiffres indiqués sur votre RIB.');
  if(!validBic(bic.value))return fieldError(form,'bic','Le BIC saisi est invalide. Il doit contenir 8 ou 11 caractères.');
  if(!file)return fieldError(form,'rib','Ajoutez votre RIB au format PDF, JPG ou PNG.');
  if(file.size>8*1024*1024)return fieldError(form,'rib','Le fichier RIB dépasse 8 Mo. Choisissez un fichier plus léger.');
  if(!acceptedRibTypes.has(file.type))return fieldError(form,'rib','Le RIB doit être un fichier PDF, JPG ou PNG.');
  return true;
}
function friendlyError(error){
  const message=error instanceof Error?error.message:'';
  return /failed to fetch|load failed|networkerror|network request failed/i.test(message)
    ? 'La connexion avec le service d’inscription a été interrompue. Vérifiez votre connexion puis réessayez : vos informations sont conservées à l’écran.'
    : message||'La demande n’a pas pu être envoyée. Réessayez dans quelques instants.';
}
document.addEventListener('input',event=>{if(event.target.closest?.('#request')){event.target.removeAttribute('aria-invalid');const box=event.target.closest('form')?.querySelector('.submission-error');if(box)box.textContent=''}},true);
document.addEventListener('submit',async event=>{
  if(event.target.id!=='request')return;
  event.preventDefault();event.stopImmediatePropagation();
  const form=event.target,button=form.querySelector('.submit'),box=errorBox(form);
  box.textContent='';
  if(button.disabled||!validateBankDetails(form))return;
  button.disabled=true;button.textContent='Envoi…';
  try{
    const formData=new FormData(form);
    const payload=Object.fromEntries([...formData.entries()].filter(([,value])=>!(value instanceof File)));
    if(formData.get('rib') instanceof File&&formData.get('rib').size)payload.ribProvided='oui';
    if(payload.formula==='Pack annuel'){
      const response=await fetch('/api/preinscription/pack',{method:'POST',body:formData});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'La création du dossier a échoué. Vérifiez les informations saisies.');
    }else{
      const response=await fetch('/api/preinscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'La demande n’a pas pu être envoyée.');
    }
    document.querySelector('#wizard').innerHTML='<span class="step-label">DEMANDE ENVOYÉE</span><h2>Merci, votre demande a bien été envoyée.</h2><p>Le Centre équestre du Grand Rang vous recontactera prochainement.</p><div class="actions"><a class="submit" href="index.html">Retour au site</a></div>';
  }catch(error){button.disabled=false;button.textContent='Envoyer ma demande';box.textContent=friendlyError(error);box.focus()}
},true);
