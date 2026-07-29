const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyy4E3bKfZrNAy8KU4liwpkRvzpX3H7JvXaqDnArNGjr2a-3WZhWIfvtSJyNUP6djuN/exec';
const TOKEN = 'k5o1u0m3wEuUsulc49zD3dr1fxhlSITr';

// La librería de confeti usa un Web Worker por defecto; la CSP del sitio no
// permite workers desde blob:, así que se crea una instancia propia sin worker.
const fireConfetti = (typeof confetti === 'function' && confetti.create)
  ? confetti.create(null, { resize: true, useWorker: false })
  : null;

const LADAS = {
  'México':          '+52',
  'Argentina':       '+54',
  'Colombia':        '+57',
  'España':          '+34',
  'Estados Unidos':  '+1',
  'Kenia':           '+254',
  'Chile':           '+56',
  'Perú':            '+51',
  'Brasil':          '+55',
};

/* ── Formulario de registro ── */
(function () {
  const formGeneral = document.getElementById('regFormGeneral');
  if (!formGeneral) return;

  const gNombre             = document.getElementById('gNombre');
  const gCorreo             = document.getElementById('gCorreo');
  const gCelular            = document.getElementById('gCelular');
  const gPais               = document.getElementById('gPais');
  const gUniversidad        = document.getElementById('gUniversidad');
  const gPuesto             = document.getElementById('gPuesto');
  const gGafete             = document.getElementById('gGafete');
  const gAlergiaDetalleWrap = document.getElementById('gAlergiaDetalleWrap');
  const gAlergiaDetalle     = document.getElementById('gAlergiaDetalle');
  const gFacturacion        = document.getElementById('gFacturacion');
  const gSubmit             = document.getElementById('gSubmit');
  const gBtnText            = gSubmit.querySelector('.reg-btn-text');
  const gBtnLoading         = gSubmit.querySelector('.reg-btn-loading');
  const gMsg                = document.getElementById('gMsg');

  gCelular.addEventListener('input', () => {
    gCelular.value = gCelular.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    gCelular.classList.remove('error');
    hideGMsg();
  });

  function stripLada(valor) {
    for (const lada of Object.values(LADAS)) {
      if (valor.startsWith(lada)) return valor.slice(lada.length);
    }
    return valor;
  }

  gPais.addEventListener('change', () => {
    const lada = LADAS[gPais.value];
    if (!lada) return;
    gCelular.value = lada + stripLada(gCelular.value.trim());
    gCelular.focus();
  });

  gCorreo.addEventListener('input', () => {
    gCorreo.classList.remove('error');
    hideGMsg();
  });

  formGeneral.querySelectorAll('input[name="alergia"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const show = radio.value === 'Sí' && radio.checked;
      gAlergiaDetalleWrap.hidden  = !show;
      gAlergiaDetalle.required    = show;
      gAlergiaDetalle.disabled    = !show;
      if (!show) gAlergiaDetalle.value = '';
    });
  });

  function showGMsg(text, type) {
    gMsg.textContent = (type === 'success' ? '✓ ' : '✗ ') + text;
    gMsg.className   = `reg-msg ${type === 'success' ? 'success' : 'error-msg'}`;
    gMsg.removeAttribute('hidden');
  }

  function hideGMsg() {
    gMsg.setAttribute('hidden', '');
    gMsg.className = 'reg-msg';
  }

  function validateGeneral() {
    let ok = true;
    [gNombre, gCorreo, gCelular, gPais, gUniversidad, gPuesto, gGafete, gAlergiaDetalle].forEach(el => el.classList.remove('error'));

    [gNombre, gCelular, gPuesto, gGafete].forEach(el => {
      if (!el.value.trim()) { el.classList.add('error'); ok = false; }
    });

    const digitosCelular = stripLada(gCelular.value.trim()).replace(/\D/g, '');
    const maxDigitos = LADAS[gPais.value] ? 12 : 15;
    if (gCelular.value.trim() && (digitosCelular.length < 8 || digitosCelular.length > maxDigitos)) {
      gCelular.classList.add('error'); ok = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gCorreo.value.trim())) {
      gCorreo.classList.add('error'); ok = false;
    }
    if (!gPais.value)        { gPais.classList.add('error');        ok = false; }
    if (!gUniversidad.value) { gUniversidad.classList.add('error'); ok = false; }
    if (!formGeneral.querySelector('input[name="alergia"]:checked')) ok = false;
    if (!gAlergiaDetalleWrap.hidden && !gAlergiaDetalle.value.trim()) {
      gAlergiaDetalle.classList.add('error'); ok = false;
    }

    if (!ok) showGMsg('Por favor completa todos los campos requeridos.', 'error');
    return ok;
  }

  function localKeyG(campo, valor) { return `reg-g::${campo}::${valor.toLowerCase()}`; }
  function localRegistradoG(campo, valor) { return localStorage.getItem(localKeyG(campo, valor)) === '1'; }
  function marcarRegistradoG(correo, celular) {
    localStorage.setItem(localKeyG('correo',  correo),  '1');
    localStorage.setItem(localKeyG('celular', celular), '1');
  }

  async function servidorDuplicadoG(correo, celular) {
    try {
      const url = `${WEBHOOK_URL}?tipo=registro-general&correo=${encodeURIComponent(correo)}&celular=${encodeURIComponent(celular)}`;
      const res  = await fetch(url);
      return await res.json();
    } catch {
      return { correo: false, celular: false };
    }
  }

  formGeneral.addEventListener('submit', async e => {
    e.preventDefault();
    hideGMsg();
    if (!validateGeneral()) return;

    if (!navigator.onLine) {
      showGMsg('No tienes conexión a internet. Verifica tu red e intenta de nuevo.', 'error');
      return;
    }

    const correo  = gCorreo.value.trim();
    const celular = gCelular.value.trim();

    if (localRegistradoG('correo', correo)) {
      gCorreo.classList.add('error');
      showGMsg('Este correo ya tiene un registro previo.', 'error');
      return;
    }
    if (localRegistradoG('celular', celular)) {
      gCelular.classList.add('error');
      showGMsg('Este número ya tiene un registro previo.', 'error');
      return;
    }

    gSubmit.disabled   = true;
    gBtnText.hidden    = true;
    gBtnLoading.hidden = false;

    const dup = await servidorDuplicadoG(correo, celular);
    if (dup.correo) {
      gCorreo.classList.add('error');
      showGMsg('Este correo ya tiene un registro previo.', 'error');
      gSubmit.disabled = false; gBtnText.hidden = false; gBtnLoading.hidden = true;
      return;
    }
    if (dup.celular) {
      gCelular.classList.add('error');
      showGMsg('Este número ya tiene un registro previo.', 'error');
      gSubmit.disabled = false; gBtnText.hidden = false; gBtnLoading.hidden = true;
      return;
    }

    const alergiaRadio = formGeneral.querySelector('input[name="alergia"]:checked');
    const payload = {
      token:       TOKEN,
      tipo:        'registro-general',
      nombre:      gNombre.value.trim(),
      correo,
      celular,
      pais:        gPais.value,
      universidad: gUniversidad.value,
      puesto:      gPuesto.value.trim(),
      gafete:      gGafete.value.trim(),
      alergia:     alergiaRadio.value === 'Sí'
                     ? `Sí - ${gAlergiaDetalle.value.trim()}`
                     : 'No',
      facturacion: gFacturacion.value.trim() || 'N/A',
      fecha:       new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    };

    fetch(WEBHOOK_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    }).catch(() => { /* sin conexión */ });

    gSubmit.disabled   = false;
    gBtnText.hidden    = false;
    gBtnLoading.hidden = true;

    marcarRegistradoG(correo, celular);
    showGMsg('¡Registro exitoso! Nos pondremos en contacto contigo pronto.', 'success');
    if (fireConfetti) {
      fireConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    formGeneral.reset();
    gAlergiaDetalleWrap.hidden = true;
    gAlergiaDetalle.required   = false;
    setTimeout(hideGMsg, 4000);
  });
})();
