const root = document.querySelector('#wizard');

const state = { catalog: null, slot: null, formula: null, startDate: null, payment: null, debitDay: 5 };
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
const dateLabel = value => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const addMonths = (value, months) => { const date = new Date(`${value}T12:00:00`); date.setMonth(date.getMonth() + months); return date.toISOString().slice(0, 10); };

function price(key, fallback) {
  const value = Number(state.catalog?.pricing?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function availableDates() {
  return (state.slot?.sessionDates || []).filter(date => date >= new Date().toISOString().slice(0, 10));
}

function selectedStartDate() {
  return state.startDate || availableDates()[0] || null;
}

function annualSummary() {
  const dates = availableDates().filter(date => date >= selectedStartDate());
  const duration = state.slot.duration;
  const normal = price(`annual_${duration}_normal`, duration === 45 ? 20 : 22);
  const final = price(`annual_${duration}_final`, normal);
  return { dates, normal, final, total: dates.length * final };
}

function formulaTotal() {
  if (state.formula === 'annual') return annualSummary().total;
  const duration = state.slot.duration;
  if (state.formula === 'card') return price(`card_${duration}`, duration === 45 ? 220 : 240);
  return price(`unit_${duration}`, duration === 45 ? 23 : 26);
}

function splitPayments(total, count) {
  const roundedAmount = Math.ceil((total / count) / 5) * 5;
  return Array.from({ length: count }, (_, index) => index === count - 1 ? total - roundedAmount * (count - 1) : roundedAmount);
}

function dueDate(startDate, offset, debitDay) {
  const start = new Date(`${startDate}T12:00:00`);
  const due = new Date(start.getFullYear(), start.getMonth() + offset, debitDay, 12);
  if (offset === 0 && due < start) return startDate;
  return due.toISOString().slice(0, 10);
}

function paymentSchedule() {
  const total = formulaTotal();
  const debitDay = Number(state.debitDay) || 5;
  if (state.payment === 'cash') return [{ label: 'À la souscription', date: state.startDate, amount: total }];
  if (state.formula === 'annual') {
    const annual = annualSummary();
    const [year, month] = String(state.catalog.settings.finalPaymentMonth || '').split('-').map(Number);
    const start = new Date(`${state.startDate}T12:00:00`);
    const months = (year - start.getFullYear()) * 12 + month - (start.getMonth() + 1) + 1;
    const count = Math.max(1, months);
    const standard = Math.ceil(annual.dates.length * annual.normal / count);
    const last = annual.total - standard * (count - 1);
    return Array.from({ length: count }, (_, index) => {
      const date = dueDate(state.startDate, index, debitDay);
      const isLast = index === count - 1;
      return { label: isLast ? 'Dernière échéance · remise et ajustement' : date === state.startDate && debitDay !== new Date(`${state.startDate}T12:00:00`).getDate() ? 'À la souscription' : `Mensualité ${index + 1}`, date, amount: isLast ? last : standard };
    });
  }
  const count = state.payment === 'sepa-2' ? 2 : 3;
  return splitPayments(total, count).map((amount, index) => ({ label: index === 0 ? 'À la souscription' : `Échéance ${index + 1}`, date: dueDate(state.startDate, index, debitDay), amount }));
}

function scheduleHtml(schedule) {
  return `<div class="payment-schedule"><p class="schedule-title">Votre échéancier</p><div class="schedule-list">${schedule.map(item => `<div><span>${escapeHtml(item.label)}<small>${escapeHtml(dateLabel(item.date))}</small></span><b>${money(item.amount)}</b></div>`).join('')}</div><div class="schedule-total"><span>Total</span><b>${money(schedule.reduce((sum, item) => sum + item.amount, 0))}</b></div></div>`;
}

function renderSlotChoice() {
  root.innerHTML = `<p class="step-label">Étape 1 · Cours adulte</p><h2>Choisissez votre créneau</h2><p>Les dates affichées correspondent au planning de ce groupe.</p><div class="answers">${state.catalog.slots.map(slot => `<button class="answer" data-slot="${escapeHtml(slot.id)}"><strong>${escapeHtml(slot.day)} · ${escapeHtml(slot.start)} · ${slot.duration} min</strong><span>${escapeHtml(slot.level)} · ${slot.sessionDates.length} séances prévues</span></button>`).join('')}</div>`;
  root.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => {
    state.slot = state.catalog.slots.find(slot => slot.id === button.dataset.slot);
    state.formula = null; state.startDate = availableDates()[0] || null; state.payment = null;
    renderFormulaChoice();
  }));
}

function renderFormulaChoice() {
  const duration = state.slot.duration;
  const annual = annualSummary();
  const card = price(`card_${duration}`, duration === 45 ? 220 : 240);
  const unit = price(`unit_${duration}`, duration === 45 ? 23 : 26);
  root.innerHTML = `<button class="text-button" data-back>← Modifier le créneau</button><p class="step-label">Étape 2 · Formule</p><h2>Quelle formule souhaitez-vous ?</h2><p><strong>${escapeHtml(state.slot.day)} · ${escapeHtml(state.slot.start)}</strong> · ${duration} min · ${escapeHtml(state.slot.level)}</p><div class="answers formula-answers"><button class="answer" data-formula="annual"><strong>Pack annuel</strong><span>${annual.dates.length} séances à partir du ${annual.dates[0] ? escapeHtml(dateLabel(annual.dates[0])) : 'planning complet'} · dès ${money(annual.final)} la séance</span></button><button class="answer" data-formula="card"><strong>Carte de 10 séances</strong><span>${money(card)} · valable 5 mois</span></button><button class="answer" data-formula="unit"><strong>À l’unité</strong><span>${money(unit)} la séance</span></button></div>`;
  root.querySelector('[data-back]').addEventListener('click', renderSlotChoice);
  root.querySelectorAll('[data-formula]').forEach(button => button.addEventListener('click', () => {
    state.formula = button.dataset.formula;
    state.payment = null;
    renderDateChoice();
  }));
}

function renderDateChoice() {
  const dates = availableDates();
  if (!dates.length) {
    root.innerHTML = `<button class="text-button" data-back>← Modifier la formule</button><h2>Ce créneau n’a plus de date disponible</h2><p>Choisissez un autre créneau ou contactez le centre.</p>`;
    root.querySelector('[data-back]').addEventListener('click', renderFormulaChoice);
    return;
  }
  const formulaName = state.formula === 'annual' ? 'Pack annuel' : state.formula === 'card' ? 'Carte de 10 séances' : 'Séance à l’unité';
  root.innerHTML = `<button class="text-button" data-back>← Modifier la formule</button><p class="step-label">Étape 3 · Première séance</p><h2>Choisissez votre première date</h2><p>${formulaName} · seules les dates de votre créneau sont proposées.</p><label class="field-label" for="adult-start-date">Première séance souhaitée</label><select class="adult-date-select" id="adult-start-date">${dates.map(date => `<option value="${date}" ${date === selectedStartDate() ? 'selected' : ''}>${escapeHtml(dateLabel(date))}</option>`).join('')}</select><div id="adult-price-preview" class="pricing-preview"></div><button class="primary-button" id="next-payment">Continuer</button>`;
  const select = root.querySelector('#adult-start-date');
  const preview = root.querySelector('#adult-price-preview');
  const refresh = () => {
    state.startDate = select.value;
    if (state.formula === 'annual') {
      const summary = annualSummary();
      preview.innerHTML = `<strong>${summary.dates.length} séances restantes</strong><span>Tarif habituel : ${money(summary.normal)} / séance</span><span>Tarif Pack : ${money(summary.final)} / séance</span><b>Total : ${money(summary.total)}</b>`;
    } else if (state.formula === 'card') {
      preview.innerHTML = `<strong>Carte de 10 séances</strong><span>Valable jusqu’au ${escapeHtml(dateLabel(addMonths(state.startDate, 5)))}</span><b>Total : ${money(formulaTotal())}</b>`;
    } else {
      preview.innerHTML = `<strong>Séance à l’unité</strong><span>${escapeHtml(dateLabel(state.startDate))}</span><b>Total : ${money(formulaTotal())}</b>`;
    }
  };
  select.addEventListener('change', refresh); refresh();
  root.querySelector('[data-back]').addEventListener('click', renderFormulaChoice);
  root.querySelector('#next-payment').addEventListener('click', renderPaymentChoice);
}

function renderPaymentChoice() {
  const total = formulaTotal();
  const title = state.formula === 'annual' ? 'Pack annuel' : state.formula === 'card' ? 'Carte de 10 séances' : 'Séance à l’unité';
  const options = state.formula === 'annual'
    ? [{ id: 'cash', title: 'Paiement comptant', description: `Règlement de ${money(total)}.` }, { id: 'monthly', title: 'Paiement mensuel par prélèvement SEPA', description: `Montant total : ${money(total)}.` }]
    : state.formula === 'card'
      ? [{ id: 'cash', title: 'Paiement comptant', description: `Règlement de ${money(total)}.` }, { id: 'sepa-2', title: 'Prélèvement SEPA en 2 fois', description: splitPayments(total, 2).map(money).join(' puis ') }, { id: 'sepa-3', title: 'Prélèvement SEPA en 3 fois', description: splitPayments(total, 3).map(money).join(' puis ') }]
      : [{ id: 'cash', title: 'Paiement comptant', description: `Règlement de ${money(total)}.` }];
  root.innerHTML = `<button class="text-button" data-back>← Modifier la première date</button><p class="step-label">Étape 4 · Paiement</p><h2>Choisissez le règlement</h2><p>${title} · première séance le ${escapeHtml(dateLabel(state.startDate))}</p><div class="answers">${options.map(option => `<button class="answer ${state.payment === option.id ? 'selected' : ''}" data-payment="${option.id}"><strong>${option.title}</strong><span>${option.description}</span></button>`).join('')}</div><div id="payment-summary" class="pricing-preview"></div><button class="primary-button" id="continue-details" disabled>Continuer</button>`;
  const next = root.querySelector('#continue-details');
  const summary = root.querySelector('#payment-summary');
  const choose = payment => {
    state.payment = payment;
    root.querySelectorAll('[data-payment]').forEach(button => button.classList.toggle('selected', button.dataset.payment === payment));
    const sepa = payment === 'monthly' || payment.startsWith('sepa-');
    summary.innerHTML = sepa ? `<strong>Total : ${money(total)}</strong><span>Choisissez votre jour de prélèvement.</span><label class="field-label payment-day-label" for="adult-debit-day">Jour de prélèvement souhaité<select class="adult-date-select" id="adult-debit-day">${Array.from({ length: 12 }, (_, index) => index + 1).map(day => `<option value="${day}" ${day === state.debitDay ? 'selected' : ''}>Le ${day} du mois</option>`).join('')}</select></label><div id="adult-schedule">${scheduleHtml(paymentSchedule())}</div><span>Les coordonnées bancaires et le RIB seront demandés à l’étape suivante.</span>` : `<strong>Total : ${money(total)}</strong><span>Votre demande sera transmise au centre pour finalisation.</span>`;
    const debitSelect = summary.querySelector('#adult-debit-day');
    if (debitSelect) debitSelect.addEventListener('change', () => { state.debitDay = Number(debitSelect.value); summary.querySelector('#adult-schedule').innerHTML = scheduleHtml(paymentSchedule()); });
    next.disabled = false;
  };
  root.querySelectorAll('[data-payment]').forEach(button => button.addEventListener('click', () => choose(button.dataset.payment)));
  root.querySelector('[data-back]').addEventListener('click', renderDateChoice);
  next.addEventListener('click', renderContactForm);
}

function renderContactForm() {
  const sepa = state.payment === 'monthly' || state.payment.startsWith('sepa-');
  root.innerHTML = `<button class="text-button" data-back>← Modifier le paiement</button><p class="step-label">Étape 5 · Vos coordonnées</p><h2>Finalisez votre demande</h2><p>Les champs marqués d’un astérisque sont obligatoires.</p><form id="adult-request" class="request-form" novalidate><div class="form-grid"><label>Nom du représentant légal *<input name="legalName" autocomplete="name" required></label><label>Nom et prénom du cavalier *<input name="riderName" autocomplete="name" required></label><label>Date de naissance du cavalier *<input name="birth" type="date" required></label><label>Téléphone *<input name="phone" autocomplete="tel" inputmode="tel" required></label><label class="form-wide">Adresse *<input name="address" autocomplete="street-address" required></label><label class="form-wide">E-mail *<input name="email" type="email" autocomplete="email" required></label></div>${sepa ? `<fieldset class="bank-details"><legend>Coordonnées bancaires pour le prélèvement SEPA</legend><p>Ces données sont chiffrées et utilisées uniquement pour finaliser votre mandat.</p><div class="form-grid"><label>Titulaire du compte *<input name="accountHolder" required></label><label>Nom de la banque *<input name="bankName" required></label><input name="debitDay" type="hidden" value="${state.debitDay}"><label>BIC *<input name="bic" autocapitalize="characters" required></label><label class="form-wide">IBAN *<input name="iban" autocapitalize="characters" required></label><label class="form-wide">RIB (PDF, JPG ou PNG · 8 Mo max) *<input name="rib" type="file" accept="application/pdf,image/jpeg,image/png" required></label></div></fieldset>` : ''}<label class="form-wide">Informations complémentaires (facultatif)<textarea name="note" rows="4"></textarea></label><label class="consent"><input type="checkbox" name="consent" required> J’accepte que le centre utilise mes coordonnées pour répondre à cette demande de pré-inscription.</label><p class="form-error" id="adult-form-error" role="alert"></p><button class="primary-button" type="submit">Envoyer ma demande</button></form>`;
  root.querySelector('[data-back]').addEventListener('click', renderPaymentChoice);
  root.querySelector('#adult-request').addEventListener('submit', submitRequest);
}

async function submitRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = root.querySelector('#adult-form-error');
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Envoi…'; error.textContent = '';
  try {
    const data = new FormData(form);
    data.append('slotId', state.slot.id);
    data.append('startDate', state.startDate);
    data.append('formula', state.formula);
    data.append('paymentPlan', state.payment);
    const response = await fetch('/api/preinscription-adultes', { method: 'POST', body: data });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'La demande n’a pas pu être enregistrée.');
    root.innerHTML = `<p class="step-label">DEMANDE ENVOYÉE</p><h2>Merci, votre demande a bien été envoyée.</h2><p>Le Centre équestre du Grand Rang vous recontactera prochainement pour finaliser votre dossier.</p><div class="actions"><a class="primary-button" href="index.html">Retour au site</a></div>`;
  } catch (reason) {
    error.textContent = reason instanceof Error ? reason.message : 'Envoi impossible. Réessayez dans quelques instants.';
    button.disabled = false; button.textContent = 'Envoyer ma demande';
  }
}

async function start() {
  try {
    const response = await fetch('/api/preinscription-adultes/catalog', { cache: 'no-store' });
    const catalog = await response.json();
    if (!response.ok || !Array.isArray(catalog.slots) || !catalog.slots.length) throw new Error(catalog.error || 'Aucun cours adulte actif.');
    state.catalog = catalog;
    renderSlotChoice();
  } catch (error) {
    root.innerHTML = `<h2>Cours adultes indisponibles</h2><p>${escapeHtml(error instanceof Error ? error.message : 'Réessayez dans quelques instants.')}</p>`;
  }
}

start();
