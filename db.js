// ============================================================
// db.js — IndexedDB, localStorage, backup automático
// ============================================================
 
        function guardarEnDB() {
            if (!db) {
                console.warn("IndexedDB no disponible, guardando en localStorage");
                guardarDatosLocalStorage();
                return;
            }
 
            // IMPORTANTE: usamos transacciones separadas para evitar que la transacción
            // se cierre automáticamente antes de que los clear().onsuccess terminen de agregar registros.
 
            // --- Transacción 1: logística y compras ---
            try {
                const tx1 = db.transaction(['logistica', 'compras'], 'readwrite');
                tx1.onerror = (e) => console.error("Error guardando datos:", e.target.error);
 
                const ls = tx1.objectStore('logistica');
                const lsClear = ls.clear();
                lsClear.onsuccess = () => {
                    logistica.forEach(p => {
                        try { ls.add(p); } catch(e) { console.error("Error al guardar producto:", e); }
                    });
                };
 
                const cs = tx1.objectStore('compras');
                const csClear = cs.clear();
                csClear.onsuccess = () => {
                    compras.forEach(c => {
                        try {
                            if (!c.fecha) c.fecha = new Date().toISOString();
                            cs.add(c);
                        } catch(e) { console.error("Error al guardar compra:", e); }
                    });
                };
 
                tx1.oncomplete = () => {
                    // --- Transacción 2: configuración (solo después de que tx1 termine) ---
                    try {
                        const tx2 = db.transaction(['configuracion'], 'readwrite');
                        tx2.onerror = (e) => console.error("Error guardando configuración:", e.target.error);
 
                        const cfg = tx2.objectStore('configuracion');
                        cfg.put(inversionExtras, 'inversionExtras');
                        cfg.put(resumenMarcado, 'resumenMarcado');
                        cfg.put(resumenManualOverrides, 'resumenManualOverrides');
                        cfg.put(manualMarkCount, 'manualMarkCount');
                        cfg.put(cuentasGeneradas, 'cuentasGeneradas');
                        cfg.put(logoHeader, 'logoHeader');
                        cfg.put(idiomaActual, 'idioma');
                        cfg.put(participantes, 'participantes');
                        cfg.put(rifaCompras, 'rifaCompras');
                        cfg.put(temaActual, 'tema');
                        cfg.put(backupAutoActivo, 'backupAutoActivo');
                        cfg.put(backupIntervalMinutos, 'backupIntervalMinutos');
                        cfg.put(selectedTemplate, 'selectedTemplate');
                        cfg.put(secuenciaFactura, 'secuenciaFactura');
                        cfg.put(numeroFacturaActual, 'numeroFacturaActual');
                        cfg.put(ruletaColorCompartidas, 'ruletaColorCompartidas');
                        cfg.put(ruletaColorCompras, 'ruletaColorCompras');
 
                        tx2.oncomplete = () => console.log("Datos guardados en IndexedDB correctamente");
                    } catch(e) {
                        console.error("Error en transacción de configuración:", e);
                    }
                };
            } catch(e) {
                console.error("Error en guardarEnDB:", e);
                guardarDatosLocalStorage();
            }
        }
 
        // --- Función global de actualización de UI (llamable desde sync.js) ---
        function actualizarUICompleta() {
            // Sanear precioTotal en todas las compras
            compras.forEach(c => {
                if (typeof c.precioTotal !== 'number' || isNaN(c.precioTotal)) {
                    c.precioTotal = (parseFloat(c.precio) || 0) * (parseInt(c.cantidad) || 1);
                }
            });
            _cargandoDatos = false;
            actualizarTablaLogistica();
            actualizarListaProductos();
            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarRifaCompras();
            if (typeof renderRifaCompras === 'function') renderRifaCompras();
            if (typeof renderRuleta === 'function') renderRuleta();
            if (typeof renderRuletaCircular === 'function') renderRuletaCircular();
            if (typeof renderRuletaCircularCompras === 'function') renderRuletaCircularCompras();
            actualizarTablaCuentas();
            actualizarDashboard();
        }
 
        function cargarDatosDesdeDB() {
            if (!db) {
                cargarDatosLocalStorage();
                return;
            }
 
            const tx = db.transaction(['logistica', 'compras', 'configuracion'], 'readonly');
            tx.onerror = (e) => {
                console.error("Error en transacción de carga:", e.target.error);
                cargarDatosLocalStorage();
            };
 
            let logisticaCargada = false;
            let comprasCargadas = false;
 
            function _actualizarUILocalInner() {
                if (!logisticaCargada || !comprasCargadas) return;
                actualizarUICompleta();
            }
 
            tx.objectStore('logistica').getAll().onsuccess = (e) => {
                logistica = e.target.result || [];
                logisticaCargada = true;
                _actualizarUILocalInner();
            };
 
            tx.objectStore('compras').getAll().onsuccess = (e) => {
                compras = e.target.result || [];
                compras.forEach(c => {
                    if (!c.fecha) c.fecha = new Date().toISOString();
                });
                comprasCargadas = true;
                _actualizarUILocalInner();
            };
 
            const cfg = tx.objectStore('configuracion');
            cfg.get('inversionExtras').onsuccess = (e) => {
                inversionExtras = e.target.result || 0;
                document.getElementById('gastosExtra').textContent = '$' + inversionExtras.toFixed(2);
            };
            cfg.get('resumenMarcado').onsuccess = (e) => { resumenMarcado = e.target.result || {}; };
            cfg.get('resumenManualOverrides').onsuccess = (e) => { resumenManualOverrides = e.target.result || {}; };
            cfg.get('manualMarkCount').onsuccess = (e) => { manualMarkCount = e.target.result || {}; };
            cfg.get('cuentasGeneradas').onsuccess = (e) => { cuentasGeneradas = e.target.result || []; };
            cfg.get('logoHeader').onsuccess = (e) => {
                logoHeader = e.target.result || '';
                document.getElementById('headerLogo').src = logoHeader;
                document.getElementById('favicon').href = logoHeader;
            };
            cfg.get('idioma').onsuccess = (e) => { cambiarIdioma(e.target.result || 'es', true); };
            cfg.get('participantes').onsuccess = (e) => { participantes = e.target.result || []; renderRuleta(); renderRuletaCircular(); };
            cfg.get('rifaCompras').onsuccess = (e) => { rifaCompras = e.target.result || []; renderRifaCompras(); renderRuletaCircularCompras(); };
            cfg.get('tema').onsuccess = (e) => { cambiarTema(e.target.result || 'default', true); };
            cfg.get('backupAutoActivo').onsuccess = (e) => { backupAutoActivo = e.target.result || false; };
            cfg.get('backupIntervalMinutos').onsuccess = (e) => { backupIntervalMinutos = parseInt(e.target.result) || 5; };
            cfg.get('selectedTemplate').onsuccess = (e) => { selectedTemplate = e.target.result || 'plantilla1'; };
            cfg.get('secuenciaFactura').onsuccess = (e) => { secuenciaFactura = e.target.result || 'FACT-'; };
            cfg.get('numeroFacturaActual').onsuccess = (e) => { numeroFacturaActual = parseInt(e.target.result) || 1; };
            cfg.get('ruletaColorCompartidas').onsuccess = (e) => { ruletaColorCompartidas = e.target.result || '#2563b0'; };
            cfg.get('ruletaColorCompras').onsuccess = (e) => { ruletaColorCompras = e.target.result || '#059669'; };
        }
 
        function guardarDatos() {
            if (db) guardarEnDB();
            guardarDatosLocalStorage();
        }
 
        function guardarDatosLocalStorage() {
            localStorage.setItem('compras', JSON.stringify(compras));
            localStorage.setItem('logistica', JSON.stringify(logistica));
            localStorage.setItem('inversionExtras', inversionExtras);
            localStorage.setItem('resumenMarcado', JSON.stringify(resumenMarcado));
            localStorage.setItem('resumenManualOverrides', JSON.stringify(resumenManualOverrides));
            localStorage.setItem('manualMarkCount', JSON.stringify(manualMarkCount));
            localStorage.setItem('cuentasGeneradas', JSON.stringify(cuentasGeneradas));
            localStorage.setItem('logoHeader', logoHeader);
            localStorage.setItem('idioma', idiomaActual);
            localStorage.setItem('participantes', JSON.stringify(participantes));
            localStorage.setItem('rifaCompras', JSON.stringify(rifaCompras));
            localStorage.setItem('tema', temaActual);
            localStorage.setItem('darkMode', isDarkMode);
            localStorage.setItem('backupAutoActivo', backupAutoActivo);
            localStorage.setItem('backupIntervalMinutos', backupIntervalMinutos);
            localStorage.setItem('selectedTemplate', selectedTemplate);
            localStorage.setItem('secuenciaFactura', secuenciaFactura);
            localStorage.setItem('numeroFacturaActual', numeroFacturaActual);
            localStorage.setItem('ruletaColorCompartidas', ruletaColorCompartidas);
            localStorage.setItem('ruletaColorCompras', ruletaColorCompras);
        }
 
        function cargarDatosLocalStorage() {
            compras = JSON.parse(localStorage.getItem('compras')) || [];
            const logisticaLS = JSON.parse(localStorage.getItem('logistica')) || [];
            const productosMap = new Map();
            [...logisticaLS].forEach(p => {
                if (p.nombre && !productosMap.has(p.nombre)) {
                    productosMap.set(p.nombre, p);
                }
            });
            logistica = Array.from(productosMap.values());
            inversionExtras = parseFloat(localStorage.getItem('inversionExtras')) || 0;
            cuentasGeneradas = JSON.parse(localStorage.getItem('cuentasGeneradas')) || [];
            resumenMarcado = JSON.parse(localStorage.getItem('resumenMarcado')) || {};
            resumenManualOverrides = JSON.parse(localStorage.getItem('resumenManualOverrides')) || {};
            manualMarkCount = JSON.parse(localStorage.getItem('manualMarkCount')) || {};
            logoHeader = localStorage.getItem('logoHeader') || '';
            idiomaActual = localStorage.getItem('idioma') || 'es';
            participantes = JSON.parse(localStorage.getItem('participantes')) || [];
            rifaCompras = JSON.parse(localStorage.getItem('rifaCompras')) || [];
            temaActual = localStorage.getItem('tema') || 'default';
            isDarkMode = localStorage.getItem('darkMode') === 'true';
            backupAutoActivo = localStorage.getItem('backupAutoActivo') === 'true';
            backupIntervalMinutos = parseInt(localStorage.getItem('backupIntervalMinutos')) || 5;
            selectedTemplate = localStorage.getItem('selectedTemplate') || 'plantilla1';
            secuenciaFactura = localStorage.getItem('secuenciaFactura') || 'FACT-';
            numeroFacturaActual = parseInt(localStorage.getItem('numeroFacturaActual')) || 1;
            ruletaColorCompartidas = localStorage.getItem('ruletaColorCompartidas') || '#2563b0';
            ruletaColorCompras = localStorage.getItem('ruletaColorCompras') || '#059669';
 
            document.getElementById('headerLogo').src = logoHeader;
            document.getElementById('favicon').href = logoHeader;
 
            cambiarIdioma(idiomaActual, true);
            cambiarTema(temaActual, true);
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i> <span id="txtModoClaro">' + idiomas[idiomaActual].txtModoClaro + '</span>';
            }
 
            actualizarTablaLogistica();
            actualizarListaProductos();
            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarRifaCompras();
            renderRifaCompras();
            renderRuleta();
            renderRuletaCircular();
            renderRuletaCircularCompras();
            actualizarTablaCuentas();
            actualizarDashboard();
            cargarPlantillasFactura();
            cargarVistaPreviaPlantillas();
            cargarManualUsuario();
 
            document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
            generarEjemploSecuencia();
            cargarEjemplosSecuencia();
            cargarColoresRuleta();
 
            if (backupAutoActivo) {
                document.getElementById('backupAuto').checked = true;
                document.getElementById('backupInterval').value = backupIntervalMinutos;
                iniciarBackupAuto();
            }
        }
 
        // --- Funciones de Backup Automático ---
        function toggleBackupAuto() {
            backupAutoActivo = document.getElementById('backupAuto').checked;
            backupIntervalMinutos = parseInt(document.getElementById('backupInterval').value) || 5;
            localStorage.setItem('backupAutoActivo', backupAutoActivo);
            localStorage.setItem('backupIntervalMinutos', backupIntervalMinutos);
 
            if (backupAutoActivo) {
                iniciarBackupAuto();
                mostrarToast('Backup automático activado cada ' + backupIntervalMinutos + ' minutos.', 'success');
            } else {
                clearInterval(backupInterval);
                backupInterval = null;
                mostrarToast('Backup automático desactivado.', 'info');
            }
            guardarDatos();
        }
 
        function iniciarBackupAuto() {
            if (backupInterval) {
                clearInterval(backupInterval);
            }
            if (backupAutoActivo) {
                backupInterval = setInterval(realizarBackupManual, backupIntervalMinutos * 60000);
            }
        }
 
        function realizarBackupManual() {
            if (!db) {
                mostrarToast('IndexedDB no disponible para backup.', 'error');
                return;
            }
 
            const tx = db.transaction(['logistica', 'compras', 'configuracion'], 'readonly');
            tx.onerror = (e) => {
                console.error("Error al realizar backup:", e.target.error);
                mostrarToast('Error al realizar backup automático.', 'error');
            };
 
            const datos = {
                logistica: [],
                compras: [],
                configuracion: {}
            };
 
            tx.objectStore('logistica').getAll().onsuccess = (e) => {
                datos.logistica = e.target.result || [];
            };
 
            tx.objectStore('compras').getAll().onsuccess = (e) => {
                datos.compras = e.target.result || [];
            };
 
            const cfg = tx.objectStore('configuracion');
            const configKeys = ['inversionExtras', 'resumenMarcado', 'resumenManualOverrides', 'manualMarkCount', 'cuentasGeneradas', 'logoHeader', 'idioma', 'participantes', 'rifaCompras', 'tema', 'backupAutoActivo', 'backupIntervalMinutos', 'selectedTemplate', 'secuenciaFactura', 'numeroFacturaActual', 'ruletaColorCompartidas', 'ruletaColorCompras'];
            let configLoaded = 0;
 
            configKeys.forEach(key => {
                cfg.get(key).onsuccess = (e) => {
                    datos.configuracion[key] = e.target.result;
                    configLoaded++;
                    if (configLoaded === configKeys.length) {
                        guardarBackupEnDB(datos);
                    }
                };
            });
        }
 
        function guardarBackupEnDB(datos) {
            if (!db) {
                mostrarToast('IndexedDB no disponible para guardar backup.', 'error');
                return;
            }
 
            const tx = db.transaction(['backup'], 'readwrite');
            tx.onerror = (e) => {
                console.error("Error al guardar backup:", e.target.error);
                mostrarToast('Error al guardar backup.', 'error');
            };
 
            const backupStore = tx.objectStore('backup');
            const timestamp = new Date().toISOString();
            backupStore.put({ datos, timestamp }, timestamp);
 
            tx.oncomplete = () => {
                mostrarToast('Backup realizado correctamente a las ' + new Date().toLocaleTimeString(), 'success');
            };
        }
 
        function restaurarBackup() {
            document.getElementById('backupInput').click();
        }
 
        function restaurarBackupDesdeArchivo(event) {
            const file = event.target.files[0];
            if (!file) return;
 
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const datos = JSON.parse(e.target.result);
                    if (datos.logistica && datos.compras && datos.configuracion) {
                        if (confirm('¿Está seguro de restaurar este backup? Se perderán los datos actuales.')) {
                            logistica = datos.logistica || [];
                            compras = datos.compras || [];
                            
                            // Restaurar configuración
                            inversionExtras = datos.configuracion.inversionExtras || 0;
                            resumenMarcado = datos.configuracion.resumenMarcado || {};
                            resumenManualOverrides = datos.configuracion.resumenManualOverrides || {};
                            manualMarkCount = datos.configuracion.manualMarkCount || {};
                            cuentasGeneradas = datos.configuracion.cuentasGeneradas || [];
                            logoHeader = datos.configuracion.logoHeader || '';
                            idiomaActual = datos.configuracion.idioma || 'es';
                            participantes = datos.configuracion.participantes || [];
                            rifaCompras = datos.configuracion.rifaCompras || [];
                            temaActual = datos.configuracion.tema || 'default';
                            backupAutoActivo = datos.configuracion.backupAutoActivo || false;
                            backupIntervalMinutos = datos.configuracion.backupIntervalMinutos || 5;
                            selectedTemplate = datos.configuracion.selectedTemplate || 'plantilla1';
                            secuenciaFactura = datos.configuracion.secuenciaFactura || 'FACT-';
                            numeroFacturaActual = datos.configuracion.numeroFacturaActual || 1;
                            ruletaColorCompartidas = datos.configuracion.ruletaColorCompartidas || '#2563b0';
                            ruletaColorCompras = datos.configuracion.ruletaColorCompras || '#059669';
 
                            document.getElementById('headerLogo').src = logoHeader;
                            document.getElementById('favicon').href = logoHeader;
 
                            cambiarIdioma(idiomaActual, true);
                            cambiarTema(temaActual, true);
 
                            guardarDatos();
                            
                            // Actualizar todas las vistas
                            actualizarTablaLogistica();
                            actualizarListaProductos();
                            actualizarTablaCompradores();
                            actualizarVentasTotales();
                            actualizarResumenCompradoras();
                            actualizarTablaCuentas();
                            actualizarRifaCompras();
                            renderRifaCompras();
                            renderRuleta();
                            renderRuletaCircular();
                            renderRuletaCircularCompras();
                            actualizarDashboard();
                            cargarPlantillasFactura();
                            cargarVistaPreviaPlantillas();
 
                            document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
                            generarEjemploSecuencia();
                            cargarEjemplosSecuencia();
                            cargarColoresRuleta();
 
                            if (backupAutoActivo) {
                                document.getElementById('backupAuto').checked = true;
                                document.getElementById('backupInterval').value = backupIntervalMinutos;
                                iniciarBackupAuto();
                            }
 
                            mostrarToast('Backup restaurado correctamente.', 'success');
                        }
                    } else {
                        mostrarToast('El archivo de backup no tiene el formato correcto.', 'error');
                    }
                } catch (err) {
                    mostrarToast('Error al leer el archivo de backup: ' + err, 'error');
                }
            };
            reader.readAsText(file);
        }
 
        // --- Funciones de Pestañas ---
 
