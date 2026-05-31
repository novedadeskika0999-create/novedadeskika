// ============================================================
// sync.js — Firebase Firestore (tiempo real, sin pérdida datos)
// ============================================================
 
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbhpjJ6gkK4CTc7c9C83alJHPSzTFzQ08",
    authDomain: "novedadeskika-9601a.firebaseapp.com",
    projectId: "novedadeskika-9601a",
    storageBucket: "novedadeskika-9601a.firebasestorage.app",
    messagingSenderId: "373093885197",
    appId: "1:373093885197:web:2301e32b8093316832fc44"
};
 
const CORREOS_AUTORIZADOS = [
    'novedadeskika0999@gmail.com',
    'myk1xk@gmail.com',
    'epro9749@gmail.com',
    'mikyy0811@gmail.com',
];
 
let _db = null;
let _auth = null;
let _usuarioActual = null;
let _unsubscribe = null;
let _debounceGuardar = null;
let _pendienteGuardar = false;
let _cargadoDeFirestore = false; // TRUE solo después de leer Firestore exitosamente
 
// ============================================================
// INICIALIZAR
// ============================================================
 
async function verificarSesionGuardada() {
    // Mostrar login mientras carga
    _mostrarLogin(true);
 
    // Limpiar tokens viejos de Drive
    localStorage.removeItem('driveAccessToken');
 
    // Cargar Firebase
    await _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
    await _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
 
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    _auth = firebase.auth();
 
    // Firebase maneja la sesión persistente automáticamente
    _auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (!CORREOS_AUTORIZADOS.includes(user.email.toLowerCase())) {
                await _auth.signOut();
                mostrarToast('❌ ' + user.email + ' no está autorizado', 'error');
                _mostrarLogin(true);
                return;
            }
            _usuarioActual = user.email;
            _mostrarLogin(false);
            document.getElementById('usuarioNombre').textContent = '👤 ' + user.email.split('@')[0];
            _escucharDatos();
        } else {
            _usuarioActual = null;
            _cargadoDeFirestore = false;
            _mostrarLogin(true);
            if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
        }
    });
}
 
function _loadScript(src) {
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
    _auth.signInWithPopup(provider).catch(e => mostrarToast('Error: ' + e.message, 'error'));
}
 
function cambiarCuentaGoogle() {
    _auth.signOut();
}
 
function logoutGoogle() {
    if (confirm('¿Cerrar sesión? Tus datos NO se borrarán.')) {
        _cargadoDeFirestore = false;
        _auth.signOut();
    }
}
 
// ============================================================
// ESCUCHAR DATOS EN TIEMPO REAL
// ============================================================
 
function _escucharDatos() {
    if (_unsubscribe) _unsubscribe();
    _setSyncStatus('syncing');
 
    _unsubscribe = _db.collection('datos').doc('principal')
        .onSnapshot({ includeMetadataChanges: false }, (doc) => {
            if (!doc.exists) {
                // Firestore vacío — subir datos locales
                const cl = JSON.parse(localStorage.getItem('compras') || '[]');
                const ll = JSON.parse(localStorage.getItem('logistica') || '[]');
                if (cl.length > 0 || ll.length > 0) {
                    compras = cl; logistica = ll;
                    _guardarEnFirestoreAhora();
                    mostrarToast('☁️ Datos locales subidos', 'success');
                }
                _cargadoDeFirestore = true;
                _setSyncStatus('ok');
                return;
            }
 
            // NO ignorar actualizaciones aunque estemos guardando
            // Firestore garantiza consistencia — siempre usar el último estado
            if (!_pendienteGuardar) {
                const datos = doc.data();
                compras = datos.compras || [];
                logistica = datos.logistica || [];
                if (datos.inversionExtras !== undefined) inversionExtras = datos.inversionExtras;
 
                localStorage.setItem('compras', JSON.stringify(compras));
                localStorage.setItem('logistica', JSON.stringify(logistica));
 
                _cargadoDeFirestore = true;
                if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
            }
 
            _setSyncStatus('ok');
        }, (error) => {
            console.error('Firestore error:', error);
            _setSyncStatus('error');
        });
}
 
// ============================================================
// GUARDAR EN FIRESTORE
// ============================================================
 
// Llamada desde db.js después de cada cambio local
function guardarEnDriveConDebounce() {
    if (!_cargadoDeFirestore) return; // Nunca guardar antes de cargar
    _pendienteGuardar = true;
    clearTimeout(_debounceGuardar);
    _debounceGuardar = setTimeout(() => _guardarEnFirestoreAhora(), 600);
}
 
function guardarEnDrive() {
    if (!_cargadoDeFirestore) return Promise.resolve();
    return _guardarEnFirestoreAhora();
}
 
async function guardarEnFirestore() {
    return guardarEnDrive();
}
 
async function _guardarEnFirestoreAhora() {
    if (!_db || !_usuarioActual) return;
    _setSyncStatus('saving');
    try {
        await _db.collection('datos').doc('principal').set({
            compras,
            logistica,
            inversionExtras: inversionExtras || 0,
            ultimaEdicion: _usuarioActual,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        _setSyncStatus('ok');
    } catch(e) {
        console.error('Error guardando:', e);
        _setSyncStatus('error');
    } finally {
        _pendienteGuardar = false;
    }
}
 
// ============================================================
// UI
// ============================================================
 
function _mostrarLogin(mostrar) {
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
 
