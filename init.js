// ============================================================
// init.js — Inicialización de IndexedDB y window.onload
// ============================================================

        // --- Inicialización ---
        window.onload = () => {
            // Aplicar tema guardado
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i> <span id="txtModoClaro">' + idiomas[idiomaActual].txtModoClaro + '</span>';
            }
            // Aplicar tema de colores
            cambiarTema(temaActual);

            // Cargar datos
            cambiarPestana('logistica');
            const last = localStorage.getItem('lastProductoCompra');
            if (last) {
                const sel = document.getElementById('productoCompra');
                if ([...sel.options].some(o => o.value === last)) {
                    sel.value = last;
                    ultimoProductoSeleccionado = last;
                    actualizarEspecificacionesCompra();
                }
            }
            document.getElementById('nombreProductoLogistica').focus();

            // --- Abrir IndexedDB AQUÍ, cuando el DOM ya está listo ---
            const request = indexedDB.open('NovedadesKikaDB', 4);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                if (!db.objectStoreNames.contains('logistica')) {
                    const store = db.createObjectStore('logistica', { keyPath: 'nombre' });
                    store.createIndex('categoria', 'categoria', { unique: false });
                    store.createIndex('tamano', 'tamano', { unique: false });
                }
                if (!db.objectStoreNames.contains('compras')) {
                    const store = db.createObjectStore('compras', { autoIncrement: true });
                    store.createIndex('comprador', 'comprador', { unique: false });
                    store.createIndex('producto', 'producto', { unique: false });
                    store.createIndex('fecha', 'fecha', { unique: false });
                }
                if (!db.objectStoreNames.contains('configuracion')) {
                    db.createObjectStore('configuracion');
                }
                if (!db.objectStoreNames.contains('backup')) {
                    db.createObjectStore('backup');
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                cargarDatosDesdeDB();
                iniciarBackupAuto();
            };

            request.onerror = (event) => {
                console.error("Error al abrir IndexedDB:", event.target.error);
                cargarDatosLocalStorage();
            };

            // Service Worker desactivado — causaba problemas de caché

            // Escuchar el evento beforeinstallprompt para PWA
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                document.getElementById('install-pwa-btn').style.display = 'block';
            });

            // Cargar la lista de compradoras para el select de descarga masiva
            actualizarListaCompradorasParaDescargaMasiva();

            // Cargar plantillas de factura
            cargarPlantillasFactura();
            cargarVistaPreviaPlantillas();

            // Cargar manual de usuario
            cargarManualUsuario();

            // Cargar secuencia de factura
            document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
            generarEjemploSecuencia();
            cargarEjemplosSecuencia();

            // Cargar colores de ruleta
            cargarColoresRuleta();

            // Iniciar backup automático si está activado
            if (backupAutoActivo) {
                document.getElementById('backupAuto').checked = true;
                document.getElementById('backupInterval').value = backupIntervalMinutos;
                iniciarBackupAuto();
            }

            // Verificar sesión de Google Drive
            if (typeof verificarSesionGuardada === 'function') {
                verificarSesionGuardada();
            }
        };

        // --- Funciones de Toast ---
