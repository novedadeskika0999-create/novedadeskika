
// ============================================================
// sync.js — Firebase Firestore — Sincronización total en tiempo real
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
 
// Campos que NO se sincronizan (son por dispositivo)
const CAMPOS_LOCALES = ['isDarkMode', 'tema', 'darkMode'];
 
let _db = null;
let _auth = null;
let _usuarioActual = null;
let _unsubscribe = null;
let _debounce = null;
let _cargadoDeFirestore = false;
let _pendienteGuardar = false;
let _ultimoGuardadoMs = 0;
 
// ============================================================
// INICIALIZAR — llamado desde init.js
// ============================================================
 
async function verificarSesionGuardada() {
    // Limpiar tokens viejos de Drive
    localStorage.removeItem('driveAccessToken');
 
    // Cargar Firebase SDKs
    await _cargarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await _cargarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
    await _cargarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
 
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    _auth = firebase.auth();
 
    // Manejar resultado de redirect
    _auth.getRedirectResult().then((result) => {
        if (result && result.user) {
            console.log('Login por redirect exitoso:', result.user.email);
        }
    }).catch(() => {});
 
    // Firebase recuerda la sesión automáticamente (localStorage persistente)
    _auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (!CORREOS_AUTORIZADOS.includes(user.email.toLowerCase())) {
                await _auth.signOut();
                mostrarToast('❌ ' + user.email + ' no está autorizado', 'error');
                _mostrarOverlay(true);
                return;
            }
            _usuarioActual = user.email;
            _mostrarOverlay(false);
            const el = document.getElementById('usuarioNombre');
            if (el) el.textContent = '👤 ' + user.email.split('@')[0];
            _escucharCambios();
        } else {
            _usuarioActual = null;
            _cargadoDeFirestore = false;
            _mostrarOverlay(true);
            if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
        }
    });
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
 
function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    // Intentar popup primero, si falla usar redirect
    _auth.signInWithPopup(provider).catch((e) => {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
            _auth.signInWithRedirect(provider);
        } else {
            mostrarToast('Error al entrar: ' + e.message, 'error');
        }
    });
}
 
function cambiarCuentaGoogle() {
    _cargadoDeFirestore = false;
    _auth.signOut();
}
 
function logoutGoogle() {
    if (confirm('¿Cerrar sesión? Tus datos en la nube NO se borrarán.')) {
        _cargadoDeFirestore = false;
        _auth.signOut();
    }
}
 
// ============================================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// ============================================================
 
function _escucharCambios() {
    if (_unsubscribe) _unsubscribe();
    _setSyncStatus('syncing');
 
    _unsubscribe = _db.collection('datos').doc('principal')
        .onSnapshot({ includeMetadataChanges: false }, async (doc) => {
            if (!doc.exists) {
                // Primera vez — subir todo lo que haya en localStorage
                await _subirDatosLocales();
                _cargadoDeFirestore = true;
                _setSyncStatus('ok');
                return;
            }
 
            // Solo ignorar snapshot si acabamos de guardar (menos de 500ms)
            const ahorita = Date.now();
            if (_pendienteGuardar && (ahorita - _ultimoGuardadoMs) < 500) {
                _setSyncStatus('ok');
                return;
            }
            _pendienteGuardar = false;
 
            const d = doc.data();
 
            // Actualizar todas las variables globales
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
 
            // Guardar caché local (excepto campos por dispositivo)
            _guardarCacheLocal(d);
 
            _cargadoDeFirestore = true;
 
            // Actualizar toda la UI
            if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
            if (typeof renderRuleta === 'function') renderRuleta();
            if (typeof renderRuletaCircular === 'function') renderRuletaCircular();
            if (typeof renderRifaCompras === 'function') renderRifaCompras();
            if (typeof renderRuletaCircularCompras === 'function') renderRuletaCircularCompras();
 
            _setSyncStatus('ok');
        }, (error) => {
            console.error('Firestore error:', error);
            _setSyncStatus('error');
        });
}
 
// ============================================================
// GUARDAR EN FIRESTORE
// ============================================================
 
// Llamada desde cualquier lugar que modifique datos
function guardarEnDriveConDebounce() {
    if (!_cargadoDeFirestore) return;
    _pendienteGuardar = true;
    clearTimeout(_debounce);
    _debounce = setTimeout(() => _ejecutarGuardado(), 600);
}
 
function guardarEnDrive() {
    if (!_cargadoDeFirestore) return Promise.resolve();
    _pendienteGuardar = true;
    clearTimeout(_debounce);
    return _ejecutarGuardado();
}
 
// Alias para compatibilidad
function guardarEnFirestore() { return guardarEnDrive(); }
 
async function _ejecutarGuardado() {
    if (!_db || !_usuarioActual || !_cargadoDeFirestore) {
        _pendienteGuardar = false;
        return;
    }
    _ultimoGuardadoMs = Date.now();
    _setSyncStatus('saving');
    try {
        await _db.collection('datos').doc('principal').set(_construirDatos());
        _setSyncStatus('ok');
    } catch(e) {
        console.error('Error guardando en Firestore:', e);
        _setSyncStatus('error');
    } finally {
        // Solo bloquear por 300ms para evitar eco inmediato
        setTimeout(() => { _pendienteGuardar = false; }, 300);
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
 
