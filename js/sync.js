// ============================================================
// sync.js — Sincronización con Google Drive (fuente principal)
// ============================================================

const GOOGLE_CLIENT_ID = '875718815413-vdd9n0bj044nr5jbntla3etre3f6gjfq.apps.googleusercontent.com';
const DRIVE_FILE_NAME = 'novedades_kika_datos.json';

const CORREOS_AUTORIZADOS = [
    'novedadeskika0999@gmail.com',
    'myk1xk@gmail.com',
    'epro9749@gmail.com',
    'mikyy0811@gmail.com',
];

let _driveFileId = null;
let _accessToken = null;
let _syncInterval = null;
let _usuarioActual = null;
let _guardandoEnDrive = false;

// ============================================================
// LOGIN
// ============================================================

function loginGoogle() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
        callback: async (response) => {
            if (response.error) {
                mostrarToast('Error al iniciar sesión', 'error');
                return;
            }
            await _procesarLogin(response.access_token);
        }
    });
    client.requestAccessToken();
}

function cambiarCuentaGoogle() {
    _limpiarSesion(false);
    const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
        prompt: 'select_account',
        callback: async (response) => {
            if (response.error) return;
            await _procesarLogin(response.access_token);
        }
    });
    client.requestAccessToken();
}

async function _procesarLogin(token) {
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    if (!CORREOS_AUTORIZADOS.includes(userInfo.email.toLowerCase())) {
        mostrarToast('❌ ' + userInfo.email + ' no está autorizado', 'error');
        return;
    }

    _accessToken = token;
    _usuarioActual = userInfo.email;
    localStorage.setItem('driveAccessToken', token);
    localStorage.setItem('usuarioActual', userInfo.email);

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('usuarioNombre').textContent = '👤 ' + userInfo.email.split('@')[0];

    mostrarToast('✅ Bienvenido ' + userInfo.email.split('@')[0], 'success');

    // Cargar datos desde Drive (fuente principal)
    await cargarDesdeDrive();
    iniciarSyncAutomatico();
}

function logoutGoogle() {
    if (confirm('¿Cerrar sesión? Tus datos en la nube NO se borrarán.')) {
        _limpiarSesion(false);
        document.getElementById('loginOverlay').style.display = 'flex';
        mostrarToast('Sesión cerrada', 'info');
    }
}

function _limpiarSesion(borrarDatos) {
    if (_accessToken) {
        try { google.accounts.oauth2.revoke(_accessToken, () => {}); } catch(e) {}
    }
    _accessToken = null;
    _usuarioActual = null;
    _driveFileId = null;
    localStorage.removeItem('driveAccessToken');
    localStorage.removeItem('usuarioActual');
    if (_syncInterval) clearInterval(_syncInterval);
    if (borrarDatos) {
        localStorage.removeItem('compras');
        localStorage.removeItem('logistica');
    }
}

// ============================================================
// DRIVE — OBTENER ARCHIVO
// ============================================================

async function _obtenerFileId() {
    if (_driveFileId) return _driveFileId;

    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and trashed=false&fields=files(id)`,
        { headers: { Authorization: `Bearer ${_accessToken}` } }
    ).then(r => r.json());

    if (res.files && res.files.length > 0) {
        _driveFileId = res.files[0].id;
        return _driveFileId;
    }

    // Crear archivo nuevo vacío
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({
        name: DRIVE_FILE_NAME,
        mimeType: 'application/json'
    })], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify({
        compras: [], logistica: [], inversionExtras: 0, timestamp: new Date().toISOString()
    })], { type: 'application/json' }));

    const creado = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        { method: 'POST', headers: { Authorization: `Bearer ${_accessToken}` }, body: form }
    ).then(r => r.json());

    _driveFileId = creado.id;
    return _driveFileId;
}

// ============================================================
// DRIVE — CARGAR DATOS (fuente principal)
// ============================================================

async function cargarDesdeDrive() {
    if (!_accessToken) return;
    _setSyncStatus('syncing');

    try {
        const fileId = await _obtenerFileId();
        const datos = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${_accessToken}` } }
        ).then(r => r.json());

        const comprasDrive = datos.compras || [];
        const logisticaDrive = datos.logistica || [];

        if (comprasDrive.length === 0 && logisticaDrive.length === 0) {
            // Drive vacío — subir datos locales si los hay
            const comprasLocal = JSON.parse(localStorage.getItem('compras') || '[]');
            const logisticaLocal = JSON.parse(localStorage.getItem('logistica') || '[]');
            if (comprasLocal.length > 0 || logisticaLocal.length > 0) {
                compras = comprasLocal;
                logistica = logisticaLocal;
                await guardarEnDrive();
                mostrarToast('☁️ Datos locales subidos a la nube', 'success');
            }
        } else {
            // Usar datos de Drive
            compras = comprasDrive;
            logistica = logisticaDrive;
            if (datos.inversionExtras) inversionExtras = datos.inversionExtras;

            // Actualizar localStorage como caché
            localStorage.setItem('compras', JSON.stringify(compras));
            localStorage.setItem('logistica', JSON.stringify(logistica));
        }

        if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
        _setSyncStatus('ok');

    } catch(e) {
        console.error('Error al cargar desde Drive:', e);
        _setSyncStatus('error');
        // Fallback a localStorage
        const comprasLocal = JSON.parse(localStorage.getItem('compras') || '[]');
        const logisticaLocal = JSON.parse(localStorage.getItem('logistica') || '[]');
        if (comprasLocal.length > 0) {
            compras = comprasLocal;
            logistica = logisticaLocal;
            if (typeof actualizarUICompleta === 'function') actualizarUICompleta();
        }
    }
}

// ============================================================
// DRIVE — GUARDAR DATOS
// ============================================================

let _driveDebounce = null;
function guardarEnDriveConDebounce() {
    clearTimeout(_driveDebounce);
    _driveDebounce = setTimeout(() => guardarEnDrive(), 800);
}

async function guardarEnDrive() {
    if (!_accessToken || _guardandoEnDrive) return;
    _guardandoEnDrive = true;
    _setSyncStatus('saving');

    try {
        const fileId = await _obtenerFileId();
        const datos = {
            compras,
            logistica,
            inversionExtras: inversionExtras || 0,
            timestamp: new Date().toISOString(),
            ultimaEdicion: _usuarioActual
        };

        await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${_accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            }
        );

        localStorage.setItem('ultimoGuardado', datos.timestamp);
        _setSyncStatus('ok');

    } catch(e) {
        console.error('Error al guardar en Drive:', e);
        _setSyncStatus('error');
    } finally {
        _guardandoEnDrive = false;
    }
}

// ============================================================
// SYNC AUTOMÁTICO — polling agresivo cada 3 segundos
// ============================================================

let _ultimaModDrive = null;

function iniciarSyncAutomatico() {
    if (_syncInterval) clearInterval(_syncInterval);
    _syncInterval = setInterval(async () => {
        if (!_accessToken || _guardandoEnDrive) return;
        try {
            const fileId = await _obtenerFileId();
            const meta = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
                { headers: { Authorization: `Bearer ${_accessToken}` } }
            ).then(r => r.json());

            const modTime = meta.modifiedTime;

            // Solo actualizar si cambió desde la última vez que revisamos
            if (_ultimaModDrive && modTime !== _ultimaModDrive) {
                _ultimaModDrive = modTime;
                const tsDrive = new Date(modTime).getTime();
                const tsLocal = new Date(localStorage.getItem('ultimoGuardado') || 0).getTime();
                if (tsDrive > tsLocal + 1000) {
                    await cargarDesdeDrive();
                    mostrarToast('🔄 Actualizado desde otro dispositivo', 'info', 2000);
                }
            } else if (!_ultimaModDrive) {
                _ultimaModDrive = modTime;
            }
        } catch(e) { /* silencioso */ }
    }, 2000);
}

// ============================================================
// VERIFICAR SESIÓN AL CARGAR
// ============================================================

async function verificarSesionGuardada() {
    const token = localStorage.getItem('driveAccessToken');
    const usuario = localStorage.getItem('usuarioActual');

    if (token && usuario) {
        try {
            const test = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (test.ok) {
                _accessToken = token;
                _usuarioActual = usuario;
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('usuarioNombre').textContent = '👤 ' + usuario.split('@')[0];
                await cargarDesdeDrive();
                iniciarSyncAutomatico();
                return true;
            }
        } catch(e) {}
    }

    document.getElementById('loginOverlay').style.display = 'flex';
    return false;
}

// ============================================================
// UI — indicador de estado
// ============================================================

function _setSyncStatus(estado) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const estados = {
        ok:     '<i class="fas fa-cloud"></i> Sincronizado',
        saving: '<i class="fas fa-cloud-upload-alt"></i> Guardando...',
        syncing:'<i class="fas fa-sync fa-spin"></i> Sincronizando...',
        error:  '<i class="fas fa-exclamation-triangle"></i> Error de sync'
    };
    el.innerHTML = estados[estado] || estados.ok;
    el.style.background = estado === 'error' ? 'rgba(200,50,50,0.8)' : 'rgba(0,0,0,0.6)';
}
