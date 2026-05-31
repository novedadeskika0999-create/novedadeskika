// ============================================================
// sync.js — Sincronización con Firebase Firestore (tiempo real)
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
 
// Estado global
let _db = null;
let _auth = null;
let _usuarioActual = null;
let _unsubscribe = null;
let _guardando = false;
let _driveDebounce = null;
 
// ============================================================
// INICIALIZAR FIREBASE
// ============================================================
 
async function inicializarFirebase() {
    // Mostrar login inmediatamente mientras carga Firebase
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'flex';
 
    // Cargar Firebase SDK dinámicamente
    await Promise.all([
        _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'),
        _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'),
        _loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'),
    ]);
 
    // Limpiar sesión vieja de Drive si existe
    localStorage.removeItem('driveAccessToken');
 
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    _db = firebase.firestore();
    _auth = firebase.auth();
 
    // Escuchar cambios de sesión
    _auth.onAuthStateChanged(async (user) => {
        if (user && CORREOS_AUTORIZADOS.includes(user.email.toLowerCase())) {
            _usuarioActual = user.email;
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('usuarioNombre').textContent = '👤 ' + user.email.split('@')[0];
            // Escuchar datos en tiempo real
            _escucharDatos();
        } else if (user) {
            // Correo no autorizado
            await _auth.signOut();
            mostrarToast('❌ ' + user.email + ' no está autorizado', 'error');
            document.getElementById('loginOverlay').style.display = 'flex';
        } else {
            _usuarioActual = null;
            document.getElementById('loginOverlay').style.display = 'flex';
            if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
        }
    });
}
 
function _loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
 
// ============================================================
// LOGIN / LOGOUT
// ============================================================
 
function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    _auth.signInWithPopup(provider).catch(e => {
        mostrarToast('Error al iniciar sesión: ' + e.message, 'error');
    });
}
 
function cambiarCuentaGoogle() {
    _auth.signOut().then(() => {
        setTimeout(() => loginGoogle(), 500);
    });
}
 
function logoutGoogle() {
    if (confirm('¿Cerrar sesión? Tus datos NO se borrarán.')) {
        _auth.signOut().then(() => {
            mostrarToast('Sesión cerrada', 'info');
        });
    }
}
 
// ============================================================
// ESCUCHAR DATOS EN TIEMPO REAL (Firestore)
// ============================================================
 
function _escucharDatos() {
    if (_unsubscribe) _unsubscribe();
 
    _setSyncStatus('syncing');
 
    _unsubscribe = _db.collection('datos').doc('principal')
        .onSnapshot((doc) => {
            if (!doc.exists) {
                // Primera vez — subir datos locales si los hay
                const comprasLocal = JSON.parse(localStorage.getItem('compras') || '[]');
                const logisticaLocal = JSON.parse(localStorage.getItem('logistica') || '[]');
                if (comprasLocal.length > 0 || logisticaLocal.length > 0) {
                    _subirDatos(comprasLocal, logisticaLocal);
                    mostrarToast('☁️ Datos locales subidos a la nube', 'success');
                }
                _setSyncStatus('ok');
                return;
            }
 
            const datos = doc.data();
            const comprasFirestore = datos.compras || [];
            const logisticaFirestore = datos.logistica || [];
 
            // Solo actualizar si los datos cambiaron y no fui yo quien los guardó
            if (!_guardando) {
                compras = comprasFirestore;
                logistica = logisticaFirestore;
                if (datos.inversionExtras !== undefined) inversionExtras = datos.inversionExtras;
 
                // Actualizar caché local
                localStorage.setItem('compras', JSON.stringify(compras));
                localStorage.setItem('logistica', JSON.stringify(logistica));
 
                // Actualizar UI
                if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
            }
 
            _setSyncStatus('ok');
        }, (error) => {
            console.error('Error Firestore:', error);
            _setSyncStatus('error');
            // Fallback a localStorage
            compras = JSON.parse(localStorage.getItem('compras') || '[]');
            logistica = JSON.parse(localStorage.getItem('logistica') || '[]');
            if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
        });
}
 
// ============================================================
// GUARDAR DATOS EN FIRESTORE
// ============================================================
 
async function _subirDatos(comprasData, logisticaData) {
    if (!_db || !_usuarioActual) return;
    _guardando = true;
    _setSyncStatus('saving');
 
    try {
        await _db.collection('datos').doc('principal').set({
            compras: comprasData,
            logistica: logisticaData,
            inversionExtras: inversionExtras || 0,
            ultimaEdicion: _usuarioActual,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        _setSyncStatus('ok');
    } catch(e) {
        console.error('Error al guardar:', e);
        _setSyncStatus('error');
    } finally {
        // Pequeño delay antes de reactivar el listener
        setTimeout(() => { _guardando = false; }, 1000);
    }
}
 
function guardarEnDrive() {
    return guardarEnFirestore();
}
 
function guardarEnDriveConDebounce() {
    clearTimeout(_driveDebounce);
    _driveDebounce = setTimeout(() => guardarEnFirestore(), 800);
}
 
async function guardarEnFirestore() {
    await _subirDatos(compras, logistica);
}
 
// ============================================================
// VERIFICAR SESIÓN AL CARGAR
// ============================================================
 
async function verificarSesionGuardada() {
    await inicializarFirebase();
    // Firebase maneja la sesión automáticamente con onAuthStateChanged
    // Si hay sesión activa, se dispara automáticamente
}
 
// ============================================================
// UI
// ============================================================
 
function _setSyncStatus(estado) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const estados = {
        ok:      '<i class="fas fa-cloud"></i> Sincronizado',
        saving:  '<i class="fas fa-cloud-upload-alt"></i> Guardando...',
        syncing: '<i class="fas fa-sync fa-spin"></i> Sincronizando...',
        error:   '<i class="fas fa-exclamation-triangle"></i> Sin conexión'
    };
    el.innerHTML = estados[estado] || estados.ok;
    el.style.background = estado === 'error' ? 'rgba(200,50,50,0.8)' : 'rgba(0,0,0,0.6)';
}
