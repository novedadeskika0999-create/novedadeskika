
// sync.js — Firebase Firestore sincronización en tiempo real con PIN
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbhpjJ6gkK4CTc7c9C83alJHPSzTFzQ08",
    authDomain: "novedadeskika-9601a.firebaseapp.com",
    projectId: "novedadeskika-9601a",
    storageBucket: "novedadeskika-9601a.firebasestorage.app",
    messagingSenderId: "373093885197",
    appId: "1:373093855197:web:2301e32b8093316832fc44"
};
 
const CORREOS_AUTORIZADOS = [
    'novedadeskika0999@gmail.com',
    'myk1xk@gmail.com',
    'epro9749@gmail.com',
    'mikyy0811@gmail.com'
];
 
const PINES_ACCESO = {
    '1111': 'novedadeskika0999@gmail.com',
    '2222': 'myk1xk@gmail.com',
    '3333': 'epro9749@gmail.com',
    '4444': 'mikyy0811@gmail.com'
};
 
let _db = null;
let _usuarioActual = null;
let _unsubscribe = null;
let _cargadoDeFirestore = false;
let _miUltimoGuardado = null;
let _debounceTimer = null;
// FLAG CRÍTICO: bloquea cualquier guardado mientras se procesa un snapshot
let _aplicandoSnapshot = false;
 
// ============================================================
// INICIALIZAR
// ============================================================
async function verificarSesionGuardada() {
    localStorage.removeItem('driveAccessToken');
    await _script('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await _script('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
 
    const sesion = localStorage.getItem('nk_sesion');
    if (sesion && CORREOS_AUTORIZADOS.includes(sesion)) {
        _usuarioActual = sesion;
        _mostrarOverlay(false);
        const el = document.getElementById('usuarioNombre');
        if (el) el.textContent = '👤 ' + sesion.split('@')[0];
        _escuchar();
    } else {
        _mostrarOverlay(true);
    }
}
 
function _script(src) {
    return new Promise(r => {
        if (document.querySelector(`script[src="${src}"]`)) { r(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = r; s.onerror = r;
        document.head.appendChild(s);
    });
}
 
// ============================================================
// LOGIN / LOGOUT
// ============================================================
function loginGoogle() {
    const pinEl = document.getElementById('loginPin');
    const pin = pinEl ? pinEl.value.trim() : '';
    if (PINES_ACCESO[pin]) {
        _usuarioActual = PINES_ACCESO[pin];
        localStorage.setItem('nk_sesion', _usuarioActual);
        _mostrarOverlay(false);
        const el = document.getElementById('usuarioNombre');
        if (el) el.textContent = '👤 ' + _usuarioActual.split('@')[0];
        _escuchar();
        mostrarToast('✅ Bienvenido ' + _usuarioActual.split('@')[0], 'success');
    } else {
        mostrarToast('❌ PIN incorrecto', 'error');
        if (pinEl) { pinEl.value = ''; pinEl.focus(); }
    }
}
 
function cambiarCuentaGoogle() { logoutGoogle(); }
 
function logoutGoogle() {
    if (!confirm('¿Cerrar sesión? Tus datos NO se borrarán.')) return;
    _cargadoDeFirestore = false;
    _usuarioActual = null;
    localStorage.removeItem('nk_sesion');
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    _mostrarOverlay(true);
    mostrarToast('Sesión cerrada', 'info');
}
 
// ============================================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// ============================================================
function _escuchar() {
    if (_unsubscribe) _unsubscribe();
    _setSyncStatus('syncing');
 
    _unsubscribe = _db.collection('datos').doc('principal')
        .onSnapshot({ includeMetadataChanges: false }, doc => {
            if (!doc.exists) {
                _subirLocales();
                return;
            }
            const d = doc.data();
 
            // Si este snapshot es el eco de MI propio guardado, ignorarlo completamente
            if (d.editadoPor && d.editadoPor === _miUltimoGuardado) {
                _setSyncStatus('ok');
                return;
            }
 
            // Es cambio de OTRO dispositivo — aplicar sin disparar guardados
            _aplicarSnapshot(d);
        }, err => {
            console.error('Firestore error:', err);
            _setSyncStatus('error');
        });
}
 
function _aplicarSnapshot(d) {
    // BLOQUEAR cualquier guardado mientras aplicamos el snapshot
    _aplicandoSnapshot = true;
 
    try {
        compras                = d.compras || [];
        logistica              = d.logistica || [];
        participantes          = d.participantes || [];
        rifaCompras            = d.rifaCompras || [];
        resumenMarcado         = d.resumenMarcado || {};
        resumenManualOverrides = d.resumenManualOverrides || {};
        manualMarkCount        = d.manualMarkCount || {};
        cuentasGeneradas       = d.cuentasGeneradas || [];
        inversionExtras        = d.inversionExtras || 0;
        selectedTemplate       = d.selectedTemplate || 'plantilla1';
        secuenciaFactura       = d.secuenciaFactura || 'FACT-';
        numeroFacturaActual    = d.numeroFacturaActual || 1;
 
        if (d.logoHeader) {
            logoHeader = d.logoHeader;
            const img = document.getElementById('headerLogo');
            const fav = document.getElementById('favicon');
            if (img) img.src = logoHeader;
            if (fav) fav.href = logoHeader;
        }
 
        // Caché local (no dispara Firebase)
        localStorage.setItem('compras',                JSON.stringify(compras));
        localStorage.setItem('logistica',              JSON.stringify(logistica));
        localStorage.setItem('participantes',          JSON.stringify(participantes));
        localStorage.setItem('rifaCompras',            JSON.stringify(rifaCompras));
        localStorage.setItem('resumenMarcado',         JSON.stringify(resumenMarcado));
        localStorage.setItem('resumenManualOverrides', JSON.stringify(resumenManualOverrides));
        localStorage.setItem('cuentasGeneradas',       JSON.stringify(cuentasGeneradas));
        localStorage.setItem('inversionExtras',        inversionExtras);
        localStorage.setItem('selectedTemplate',       selectedTemplate);
        localStorage.setItem('logoHeader',             logoHeader || '');
 
        _cargadoDeFirestore = true;
 
        // Actualizar UI — el flag _aplicandoSnapshot bloquea cualquier guardar
        if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
        if (typeof renderRuleta === 'function') renderRuleta();
        if (typeof renderRuletaCircular === 'function') renderRuletaCircular();
        if (typeof renderRifaCompras === 'function') renderRifaCompras();
        if (typeof renderRuletaCircularCompras === 'function') renderRuletaCircularCompras();
 
    } finally {
        // SIEMPRE desbloquear al terminar
        _aplicandoSnapshot = false;
        _setSyncStatus('ok');
    }
}
 
// ============================================================
// GUARDAR EN FIRESTORE
// ============================================================
function guardarEnDriveConDebounce() {
    // NO guardar si estamos procesando un snapshot — esto rompe el loop
    if (_aplicandoSnapshot) return;
    if (!_cargadoDeFirestore) return;
 
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => _guardar(), 400);
}
 
function guardarEnDrive() {
    if (_aplicandoSnapshot) return Promise.resolve();
    if (!_cargadoDeFirestore) return Promise.resolve();
    return _guardar();
}
 
function guardarEnFirestore() { return guardarEnDrive(); }
 
async function _guardar() {
    if (!_db || !_usuarioActual || !_cargadoDeFirestore) return;
    if (_aplicandoSnapshot) return;
 
    const id = _usuarioActual + '_' + Date.now();
    _miUltimoGuardado = id;
    _setSyncStatus('saving');
 
    try {
        await _db.collection('datos').doc('principal').set({
            compras,
            logistica,
            participantes,
            rifaCompras,
            resumenMarcado,
            resumenManualOverrides,
            manualMarkCount,
            cuentasGeneradas,
            inversionExtras:     inversionExtras || 0,
            selectedTemplate:    selectedTemplate || 'plantilla1',
            secuenciaFactura:    secuenciaFactura || 'FACT-',
            numeroFacturaActual: numeroFacturaActual || 1,
            logoHeader:          logoHeader || '',
            editadoPor:          id,
            timestamp:           firebase.firestore.FieldValue.serverTimestamp()
        });
        _setSyncStatus('ok');
    } catch(e) {
        console.error('Error guardando:', e);
        _setSyncStatus('error');
        _miUltimoGuardado = null;
    }
}
 
async function _subirLocales() {
    compras   = JSON.parse(localStorage.getItem('compras') || '[]');
    logistica = JSON.parse(localStorage.getItem('logistica') || '[]');
    resumenMarcado         = JSON.parse(localStorage.getItem('resumenMarcado') || '{}');
    resumenManualOverrides = JSON.parse(localStorage.getItem('resumenManualOverrides') || '{}');
    cuentasGeneradas       = JSON.parse(localStorage.getItem('cuentasGeneradas') || '[]');
    participantes          = JSON.parse(localStorage.getItem('participantes') || '[]');
    rifaCompras            = JSON.parse(localStorage.getItem('rifaCompras') || '[]');
    inversionExtras        = parseFloat(localStorage.getItem('inversionExtras') || '0');
    logoHeader             = localStorage.getItem('logoHeader') || '';
    _cargadoDeFirestore = true;
    await _guardar();
    if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
}
 
// ============================================================
// UI
// ============================================================
function _mostrarOverlay(v) {
    const el = document.getElementById('loginOverlay');
    if (el) el.style.display = v ? 'flex' : 'none';
}
 
function _setSyncStatus(e) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const m = {
        ok:      '<i class="fas fa-cloud"></i> Sincronizado',
        saving:  '<i class="fas fa-cloud-upload-alt"></i> Guardando...',
        syncing: '<i class="fas fa-sync fa-spin"></i> Conectando...',
        error:   '<i class="fas fa-exclamation-triangle"></i> Sin conexión'
    };
    el.innerHTML = m[e] || m.ok;
    el.style.background = e === 'error' ? 'rgba(200,50,50,0.8)' : 'rgba(0,0,0,0.6)';
}
