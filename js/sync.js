
// ============================================================
// sync.js — Firebase Firestore — Sincronización total en tiempo real
// VERSIÓN CORREGIDA: Fix de snapshots bloqueados y sync bidireccional
// ============================================================
 
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
    'mikyy0811@gmail.com',
];
 
let _db = null;
let _usuarioActual = null;
let _unsubscribe = null;
let _debounce = null;
let _cargadoDeFirestore = false;
 
// FIX: Usamos un timestamp en lugar de un flag booleano.
// Ignoramos snapshots SOLO si llegaron dentro de 800ms después de que nosotros guardamos.
let _ultimoGuardadoMs = 0;
const ECHO_WINDOW_MS = 800;
 
// Variable necesaria para db.js (actualizarUICompleta la revisa)
let _cargandoDatos = false;
 
// ============================================================
// INICIALIZAR
// ============================================================
 
async function verificarSesionGuardada() {
    localStorage.removeItem('driveAccessToken');
 
    await _cargarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await _cargarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
 
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
 
    // Habilitar persistencia offline para que funcione sin internet
    _db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistencia offline: múltiples pestañas abiertas');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistencia offline no disponible en este navegador');
        }
    });
 
    const sesionGuardada = localStorage.getItem('nk_sesion');
    if (sesionGuardada && CORREOS_AUTORIZADOS.includes(sesionGuardada)) {
        _usuarioActual = sesionGuardada;
        _mostrarOverlay(false);
        const el = document.getElementById('usuarioNombre');
        if (el) el.textContent = '👤 ' + sesionGuardada.split('@')[0];
        _escucharCambios();
    } else {
        _mostrarOverlay(true);
    }
}
 
function _cargarScript(src) {
    return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = resolve;
        document.head.appendChild(s);
    });
}
 
// ============================================================
// LOGIN / LOGOUT
// ============================================================
 
const PINES_ACCESO = {
    '1111': 'novedadeskika0999@gmail.com',
    '2222': 'myk1xk@gmail.com',
    '3333': 'epro9749@gmail.com',
    '4444': 'mikyy0811@gmail.com',
};
 
function loginGoogle() {
    const pinEl = document.getElementById('loginPin');
    const pin = pinEl ? pinEl.value.trim() : '';
    if (PINES_ACCESO[pin]) {
        _usuarioActual = PINES_ACCESO[pin];
        localStorage.setItem('nk_sesion', _usuarioActual);
        _mostrarOverlay(false);
        const el = document.getElementById('usuarioNombre');
        if (el) el.textContent = '👤 ' + _usuarioActual.split('@')[0];
        _escucharCambios();
        mostrarToast('✅ Bienvenido ' + _usuarioActual.split('@')[0], 'success');
    } else {
        mostrarToast('❌ PIN incorrecto', 'error');
        if (pinEl) { pinEl.value = ''; pinEl.focus(); }
    }
}
 
function cambiarCuentaGoogle() {
    logoutGoogle();
}
 
function logoutGoogle() {
    if (confirm('¿Cerrar sesión? Tus datos NO se borrarán.')) {
        _cargadoDeFirestore = false;
        _cargandoDatos = false;
        _usuarioActual = null;
        localStorage.removeItem('nk_sesion');
        if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
        _mostrarOverlay(true);
        mostrarToast('Sesión cerrada', 'info');
    }
}
 
// ============================================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL — FIX PRINCIPAL
// ============================================================
 
function _escucharCambios() {
    if (_unsubscribe) _unsubscribe();
    _setSyncStatus('syncing');
 
    _unsubscribe = _db.collection('datos').doc('principal')
        .onSnapshot({ includeMetadataChanges: false }, async (doc) => {
 
            // FIX: Solo ignorar el snapshot si acabamos de guardar nosotros (eco propio)
            // Si ha pasado más de ECHO_WINDOW_MS, SIEMPRE procesar el snapshot
            const ahora = Date.now();
            const esEchoPropio = (ahora - _ultimoGuardadoMs) < ECHO_WINDOW_MS;
 
            if (!doc.exists) {
                // Primera vez — subir datos locales
                await _subirDatosLocales();
                _cargadoDeFirestore = true;
                _setSyncStatus('ok');
                return;
            }
 
            // Si es eco inmediato de nuestro propio guardado, ignorar
            if (esEchoPropio) {
                _setSyncStatus('ok');
                return;
            }
 
            // SIEMPRE aplicar datos de Firestore — vienen de otro dispositivo o usuario
            const d = doc.data();
 
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
 
            _guardarCacheLocal(d);
            _cargadoDeFirestore = true;
 
            // Actualizar toda la UI con los datos nuevos
            if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
            if (typeof renderRuleta === 'function') renderRuleta();
            if (typeof renderRuletaCircular === 'function') renderRuletaCircular();
            if (typeof renderRifaCompras === 'function') renderRifaCompras();
            if (typeof renderRuletaCircularCompras === 'function') renderRuletaCircularCompras();
 
            _setSyncStatus('ok');
 
        }, (error) => {
            console.error('Firestore error:', error);
            _setSyncStatus('error');
            // Si hay error de red, intentar reconectar en 5s
            setTimeout(() => {
                if (_usuarioActual) _escucharCambios();
            }, 5000);
        });
}
 
// ============================================================
// GUARDAR EN FIRESTORE
// ============================================================
 
function guardarEnDriveConDebounce() {
    if (!_cargadoDeFirestore) return;
    clearTimeout(_debounce);
    _debounce = setTimeout(() => _ejecutarGuardado(), 600);
}
 
function guardarEnDrive() {
    if (!_cargadoDeFirestore) return Promise.resolve();
    clearTimeout(_debounce);
    return _ejecutarGuardado();
}
 
function guardarEnFirestore() { return guardarEnDrive(); }
 
async function _ejecutarGuardado() {
    if (!_db || !_usuarioActual || !_cargadoDeFirestore) return;
 
    _setSyncStatus('saving');
    _ultimoGuardadoMs = Date.now(); // Registrar momento exacto del guardado
 
    try {
        await _db.collection('datos').doc('principal').set(_construirDatos());
        _setSyncStatus('ok');
    } catch(e) {
        console.error('Error guardando en Firestore:', e);
        _setSyncStatus('error');
        mostrarToast('⚠️ Error al sincronizar. Reintentando...', 'warning');
        // Reintentar en 3 segundos
        setTimeout(() => _ejecutarGuardado(), 3000);
    }
}
 
function _construirDatos() {
    return {
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
        ultimaEdicion:       _usuarioActual,
        timestamp:           firebase.firestore.FieldValue.serverTimestamp()
    };
}
 
async function _subirDatosLocales() {
    const cl = JSON.parse(localStorage.getItem('compras') || '[]');
    const ll = JSON.parse(localStorage.getItem('logistica') || '[]');
    if (cl.length > 0 || ll.length > 0) {
        compras   = cl;
        logistica = ll;
        resumenMarcado         = JSON.parse(localStorage.getItem('resumenMarcado') || '{}');
        resumenManualOverrides = JSON.parse(localStorage.getItem('resumenManualOverrides') || '{}');
        cuentasGeneradas       = JSON.parse(localStorage.getItem('cuentasGeneradas') || '[]');
        participantes          = JSON.parse(localStorage.getItem('participantes') || '[]');
        rifaCompras            = JSON.parse(localStorage.getItem('rifaCompras') || '[]');
        inversionExtras        = parseFloat(localStorage.getItem('inversionExtras') || '0');
        logoHeader             = localStorage.getItem('logoHeader') || '';
        await _ejecutarGuardado();
        mostrarToast('☁️ Datos locales subidos a la nube', 'success');
        if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
    }
}
 
function _guardarCacheLocal(d) {
    localStorage.setItem('compras',                JSON.stringify(d.compras || []));
    localStorage.setItem('logistica',              JSON.stringify(d.logistica || []));
    localStorage.setItem('participantes',          JSON.stringify(d.participantes || []));
    localStorage.setItem('rifaCompras',            JSON.stringify(d.rifaCompras || []));
    localStorage.setItem('resumenMarcado',         JSON.stringify(d.resumenMarcado || {}));
    localStorage.setItem('resumenManualOverrides', JSON.stringify(d.resumenManualOverrides || {}));
    localStorage.setItem('cuentasGeneradas',       JSON.stringify(d.cuentasGeneradas || []));
    localStorage.setItem('inversionExtras',        d.inversionExtras || 0);
    localStorage.setItem('selectedTemplate',       d.selectedTemplate || 'plantilla1');
    localStorage.setItem('logoHeader',             d.logoHeader || '');
}
 
// ============================================================
// UI
// ============================================================
 
function _mostrarOverlay(mostrar) {
    const el = document.getElementById('loginOverlay');
    if (el) el.style.display = mostrar ? 'flex' : 'none';
}
 
function _setSyncStatus(estado) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const map = {
        ok:      '<i class="fas fa-cloud"></i> Sincronizado',
        saving:  '<i class="fas fa-cloud-upload-alt"></i> Guardando...',
        syncing: '<i class="fas fa-sync fa-spin"></i> Conectando...',
        error:   '<i class="fas fa-exclamation-triangle"></i> Sin conexión'
    };
    el.innerHTML = map[estado] || map.ok;
    el.style.background = estado === 'error' ? 'rgba(200,50,50,0.8)' : 'rgba(0,0,0,0.6)';
}
 
