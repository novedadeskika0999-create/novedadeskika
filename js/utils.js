// ============================================================
// utils.js — Autocompletar, teclado, escapeHtml, backup/carga,
//             cargar logo, guardar/cargar JSON, borrarTodo
// ============================================================

        function actualizarNombresCompradores() {
            nombresCompradores = [...new Set(compras.map(c => c.comprador))];
            actualizarListaCompradorasParaDescargaMasiva();
        }

        function autocompletarComprador(input) {
            const valor = input.value.toLowerCase();
            const sugerencias = document.getElementById('sugerencias-comprador');
            sugerencias.innerHTML = '';

            if (valor.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            const coincidencias = nombresCompradores.filter(nombre =>
                nombre.toLowerCase().includes(valor)
            );

            if (coincidencias.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            coincidencias.forEach((nombre, index) => {
                const div = document.createElement('div');
                div.textContent = nombre;
                div.onclick = () => {
                    input.value = nombre;
                    sugerencias.style.display = 'none';
                    selectedCompradorIndex = -1;
                };
                if (index === selectedCompradorIndex) {
                    div.classList.add('selected');
                }
                sugerencias.appendChild(div);
            });

            sugerencias.style.display = 'block';
        }

        function manejarAutocompletarComprador(event) {
            const input = event.target;
            const sugerencias = document.getElementById('sugerencias-comprador');
            const divs = sugerencias.querySelectorAll('div');

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex + 1) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex - 1 + divs.length) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedCompradorIndex >= 0 && divs.length > 0) {
                    input.value = divs[selectedCompradorIndex].textContent;
                    sugerencias.style.display = 'none';
                    selectedCompradorIndex = -1;
                    document.getElementById('productoCompra').focus();
                }
            } else if (event.key === 'Escape') {
                sugerencias.style.display = 'none';
                selectedCompradorIndex = -1;
            } else {
                // Para otros teclas, reiniciar el índice de selección
                selectedCompradorIndex = -1;
                setTimeout(() => autocompletarComprador(input), 0);
            }
        }

        function actualizarSeleccionAutocompletar(container, index) {
            const divs = container.querySelectorAll('div');
            divs.forEach((div, i) => {
                if (i === index) {
                    div.classList.add('selected');
                    div.scrollIntoView({ block: 'nearest' });
                } else {
                    div.classList.remove('selected');
                }
            });
        }

        function autocompletarCompradoraCuenta(input) {
            const valor = input.value.toLowerCase();
            const sugerencias = document.getElementById('sugerencias-cuenta');
            sugerencias.innerHTML = '';

            if (valor.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            const coincidencias = nombresCompradores.filter(nombre =>
                nombre.toLowerCase().includes(valor)
            );

            if (coincidencias.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            coincidencias.forEach(nombre => {
                const div = document.createElement('div');
                div.textContent = nombre;
                div.onclick = () => {
                    input.value = nombre;
                    sugerencias.style.display = 'none';
                };
                sugerencias.appendChild(div);
            });

            sugerencias.style.display = 'block';
        }

        function manejarAutocompletarCompradoraCuenta(event) {
            const input = event.target;
            const sugerencias = document.getElementById('sugerencias-cuenta');
            const divs = sugerencias.querySelectorAll('div');

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex + 1) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex - 1 + divs.length) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedCompradorIndex >= 0 && divs.length > 0) {
                    input.value = divs[selectedCompradorIndex].textContent;
                    sugerencias.style.display = 'none';
                    selectedCompradorIndex = -1;
                    buscarCuenta();
                }
            } else if (event.key === 'Escape') {
                sugerencias.style.display = 'none';
                selectedCompradorIndex = -1;
            }
        }

        function cerrarSugerenciasCuenta() {
            setTimeout(() => {
                document.getElementById('sugerencias-cuenta').style.display = 'none';
                selectedCompradorIndex = -1;
            }, 200);
        }

        function autocompletarParticipante(input) {
            const valor = input.value.toLowerCase();
            const sugerencias = document.getElementById('sugerencias-participante');
            sugerencias.innerHTML = '';

            if (valor.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            const coincidencias = participantes.filter(nombre =>
                nombre.toLowerCase().includes(valor) && nombre !== input.value
            );

            if (coincidencias.length === 0) {
                sugerencias.style.display = 'none';
                return;
            }

            coincidencias.forEach((nombre, index) => {
                const div = document.createElement('div');
                div.textContent = nombre;
                div.onclick = () => {
                    input.value = nombre;
                    sugerencias.style.display = 'none';
                    selectedCompradorIndex = -1;
                };
                if (index === selectedCompradorIndex) {
                    div.classList.add('selected');
                }
                sugerencias.appendChild(div);
            });

            sugerencias.style.display = 'block';
        }

        function manejarAutocompletarParticipante(event) {
            const input = event.target;
            const sugerencias = document.getElementById('sugerencias-participante');
            const divs = sugerencias.querySelectorAll('div');

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex + 1) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (divs.length > 0) {
                    selectedCompradorIndex = (selectedCompradorIndex - 1 + divs.length) % divs.length;
                    actualizarSeleccionAutocompletar(sugerencias, selectedCompradorIndex);
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (selectedCompradorIndex >= 0 && divs.length > 0) {
                    input.value = divs[selectedCompradorIndex].textContent;
                    sugerencias.style.display = 'none';
                    selectedCompradorIndex = -1;
                } else if (input.value.trim() !== '') {
                    agregarParticipante();
                }
            } else if (event.key === 'Escape') {
                sugerencias.style.display = 'none';
                selectedCompradorIndex = -1;
            }
        }

        function actualizarListaCompradorasParaDescargaMasiva() {
            const select = document.getElementById('compradorasSeleccionadas');
            select.innerHTML = '';
            nombresCompradores.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                select.appendChild(option);
            });
        }

        function seleccionarTodasCuentas() {
            const select = document.getElementById('compradorasSeleccionadas');
            for (let i = 0; i < select.options.length; i++) {
                select.options[i].selected = true;
            }
        }

        function deseleccionarTodasCuentas() {
            const select = document.getElementById('compradorasSeleccionadas');
            for (let i = 0; i < select.options.length; i++) {
                select.options[i].selected = false;
            }
        }

        function descargarCuentasSeleccionadas() {
            const select = document.getElementById('compradorasSeleccionadas');
            const seleccionadas = Array.from(select.selectedOptions).map(option => option.value);

            if (seleccionadas.length === 0) {
                mostrarToast('Seleccione al menos una compradora.', 'error');
                return;
            }

            seleccionadas.forEach(nombre => {
                descargarCuenta(nombre);
            });
        }

        // --- Funciones de Logística ---

        function cargarLogo() {
            const file = document.getElementById('logoInput').files[0];
            if (!file) return mostrarToast(idiomas[idiomaActual].txtSeleccioneArchivoImagen, 'error');

            // Validar que sea una imagen
            if (!file.type.match('image.*')) {
                mostrarToast('Por favor seleccione un archivo de imagen (JPG, PNG, etc.).', 'error');
                return;
            }

            // Validar tamaño (máximo 2MB)
            if (file.size > 2 * 1024 * 1024) {
                mostrarToast('La imagen es demasiado grande. Máximo 2MB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                logoHeader = e.target.result;
                document.getElementById('headerLogo').src = logoHeader;
                document.getElementById('favicon').href = logoHeader;
                guardarDatosConDebounce();
                mostrarToast(idiomas[idiomaActual].txtLogoCargado, 'success');
            };
            reader.readAsDataURL(file);
        }

        // --- Funciones de Carga y Guardado ---
        function triggerCarga() {
            document.getElementById('inputCarga').click();
        }

        function cargarInformacion(e) {
            const f = e.target.files[0];
            if (!f) return;

            // Aceptar JSON y Excel
            if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
                importarDesdeExcel(f);
                return;
            }
            if (f.type !== 'application/json' && !f.name.endsWith('.json')) {
                mostrarToast('Por favor seleccione un archivo JSON o Excel (.xlsx).', 'error');
                return;
            }

            const r = new FileReader();
            r.onload = ev => {
                try {
                    const d = JSON.parse(ev.target.result);
                    if (d.logistica && d.compras) {
                        if (d.logistica) {
                            const existingMap = new Map();
                            logistica.forEach(p => existingMap.set(p.nombre, p));
                            d.logistica.forEach(p => {
                                if (!existingMap.has(p.nombre)) {
                                    logistica.push(p);
                                }
                            });
                        }
                        if (d.compras) {
                            compras.push(...d.compras);
                        }
                        if (d.inversionExtras !== undefined) inversionExtras = d.inversionExtras;
                        if (d.resumenMarcado !== undefined) resumenMarcado = d.resumenMarcado;
                        if (d.resumenManualOverrides !== undefined) resumenManualOverrides = d.resumenManualOverrides;
                        if (d.manualMarkCount !== undefined) manualMarkCount = d.manualMarkCount;
                        if (d.cuentasGeneradas !== undefined) cuentasGeneradas = d.cuentasGeneradas;
                        if (d.logoHeader !== undefined) {
                            logoHeader = d.logoHeader;
                            document.getElementById('headerLogo').src = logoHeader;
                            document.getElementById('favicon').href = logoHeader;
                        }
                        if (d.idioma !== undefined) cambiarIdioma(d.idioma);
                        if (d.participantes !== undefined) participantes = d.participantes;
                        if (d.rifaCompras !== undefined) rifaCompras = d.rifaCompras;
                        if (d.tema !== undefined) cambiarTema(d.tema);
                        if (d.backupAutoActivo !== undefined) backupAutoActivo = d.backupAutoActivo;
                        if (d.backupIntervalMinutos !== undefined) backupIntervalMinutos = d.backupIntervalMinutos;
                        if (d.selectedTemplate !== undefined) selectedTemplate = d.selectedTemplate;
                        if (d.secuenciaFactura !== undefined) secuenciaFactura = d.secuenciaFactura;
                        if (d.numeroFacturaActual !== undefined) numeroFacturaActual = d.numeroFacturaActual;
                        if (d.ruletaColorCompartidas !== undefined) ruletaColorCompartidas = d.ruletaColorCompartidas;
                        if (d.ruletaColorCompras !== undefined) ruletaColorCompras = d.ruletaColorCompras;

                        productosMostrados = 50;
                        comprasMostradas = 50;

                        guardarDatosConDebounce();
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

                        mostrarToast(idiomas[idiomaActual].txtDatosCargados, 'success');
                    } else {
                        mostrarToast(idiomas[idiomaActual].txtEstructuraArchivoInvalida, 'error');
                    }
                } catch(err) {
                    mostrarToast(`${idiomas[idiomaActual].txtErrorCargarArchivo} ${err}`, 'error');
                }
            };
            r.readAsText(f);
        }


        // --- Importar desde Excel ---
        function importarDesdeExcel(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    let importados = 0;

                    wb.SheetNames.forEach(sheetName => {
                        const ws = wb.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                        if (rows.length === 0) return;

                        const keys = Object.keys(rows[0]).map(k => k.toLowerCase());

                        if (keys.includes('comprador') && keys.includes('producto')) {
                            // Hoja de compras — usar exactamente los campos que exporta la app
                            rows.forEach(row => {
                                const nueva = {
                                    comprador: row['Comprador'] || '',
                                    producto: row['Producto'] || '',
                                    especificacion: (row['Especificación'] || row['Especificacion'] || '') === '—' ? '' : (row['Especificación'] || row['Especificacion'] || ''),
                                    tamano: row['Tamaño'] || row['Tamano'] || '',
                                    precio: parseFloat(row['Precio'] || 0),
                                    cantidad: parseInt(row['Cantidad'] || 1),
                                    precioTotal: parseFloat(row['Total'] || 0),
                                    marcado: row['Marcado'] === 'Sí' || row['Marcado'] === true,
                                    esRegalo: row['Regalo'] === 'Sí' || row['Regalo'] === true,
                                    notas: (row['Notas'] || '') === '—' ? '' : (row['Notas'] || ''),
                                    fecha: row['Fecha'] ? new Date(row['Fecha']).toISOString() : new Date().toISOString()
                                };
                                if (nueva.comprador && nueva.producto) {
                                    compras.push(nueva);
                                    importados++;
                                }
                            });
                        } else if (keys.includes('nombre') && keys.includes('precio unitario')) {
                            // Hoja de logística — usar exactamente los campos que exporta la app
                            rows.forEach(row => {
                                const especRaw = row['Especificaciones'] || '';
                                const nuevo = {
                                    nombre: row['Nombre'] || '',
                                    precioUnitario: parseFloat(row['Precio Unitario'] || 0),
                                    precioCosto: parseFloat(row['Precio Costo'] || 0),
                                    cantidad: parseInt(row['Cantidad'] || 0),
                                    tamano: row['Tamaño'] || row['Tamano'] || '',
                                    categoria: row['Categoría'] || row['Categoria'] || '',
                                    ganancia: parseFloat(row['Ganancia'] || 0),
                                    stockMinimo: parseInt(row['Stock Mínimo'] || row['Stock Minimo'] || 0),
                                    especificaciones: especRaw ? especRaw.split(',').map(s => s.trim()).filter(Boolean) : []
                                };
                                if (nuevo.nombre) {
                                    const existe = logistica.find(p => p.nombre === nuevo.nombre);
                                    if (!existe) {
                                        logistica.push(nuevo);
                                        importados++;
                                    }
                                }
                            });
                        }
                    });

                    if (importados > 0) {
                        guardarDatosConDebounce();
                        actualizarTablaLogistica();
                        actualizarListaProductos();
                        actualizarTablaCompradores();
                        actualizarVentasTotales();
                        actualizarResumenCompradoras();
                        actualizarTablaCuentas();
                        actualizarDashboard();
                        mostrarToast('✅ Importados ' + importados + ' registros desde Excel', 'success');
                    } else {
                        mostrarToast('No se encontraron datos válidos en el Excel', 'warning');
                    }
                } catch(err) {
                    mostrarToast('Error al leer Excel: ' + err, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }
        function guardarInformacion() {
            const data = {
                logistica,
                compras,
                inversionExtras,
                resumenMarcado,
                resumenManualOverrides,
                manualMarkCount,
                cuentasGeneradas,
                logoHeader,
                idioma: idiomaActual,
                participantes,
                rifaCompras,
                tema: temaActual,
                backupAutoActivo,
                backupIntervalMinutos,
                selectedTemplate,
                secuenciaFactura,
                numeroFacturaActual,
                ruletaColorCompartidas,
                ruletaColorCompras
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'novedades_kika_backup_' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            guardarDatosConDebounce();
            mostrarToast(idiomas[idiomaActual].txtArchivoGenerado, 'success');
        }

        // --- Funciones de Guardado con Debounce ---
        function guardarDatosConDebounce() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                guardarDatos();
                // Sincronizar con Drive inmediatamente después de guardar local
                if (typeof guardarEnDriveConDebounce === 'function' && typeof _accessToken !== 'undefined' && _accessToken) {
                    guardarEnDriveConDebounce();
                }
            }, 500); // Reducido a 500ms para respuesta más rápida
        }

        // --- Funciones de Teclado ---
        function manejarTecladoLogistica(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const ae = document.activeElement;
                if (ae.id === 'especificacionesProductoLogistica' || ae.id === 'btnAgregarProducto') agregarProductoLogistica();
                else moverSiguienteCampo(ae);
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                if (event.key === 'ArrowRight') moverSiguienteCampo(document.activeElement);
                else moverCampoAnterior(document.activeElement);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const ae = document.activeElement;
                if (ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA') {
                    manejarFlechasEnSelect(event, ae);
                } else {
                    const fels = Array.from(document.querySelectorAll('#formLogistica input, #formLogistica select, #formLogistica button'));
                    const ci = fels.indexOf(ae);
                    if (event.key === 'ArrowDown' && ci < fels.length - 1) {
                        fels[ci + 1].focus();
                    } else if (event.key === 'ArrowUp' && ci > 0) {
                        fels[ci - 1].focus();
                    }
                }
            }
        }

        function moverSiguienteCampo(el) {
            const els = Array.from(el.form.elements).filter(e => ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.tagName));
            const i = els.indexOf(el);
            if (i < els.length - 1) els[i + 1].focus();
        }

        function moverCampoAnterior(el) {
            const els = Array.from(el.form.elements).filter(e => ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.tagName));
            const i = els.indexOf(el);
            if (i > 0) els[i - 1].focus();
        }

        function manejarFlechasEnSelect(event, sel) {
            const opts = sel.options;
            let idx = sel.selectedIndex;
            if (event.key === 'ArrowDown') idx = (idx + 1) % opts.length;
            else if (event.key === 'ArrowUp') idx = (idx - 1 + opts.length) % opts.length;
            sel.selectedIndex = idx;
        }

        function manejarTeclaBusqueda(event, inputId, fn) {
            if (event.key === 'Enter') {
                event.preventDefault();
                window[fn]();
            }
        }

        // --- Funciones de Borrado ---
        function confirmarBorrarTodo() {
            document.getElementById('confirmTitle').textContent = idiomas[idiomaActual].txtConfirmarBorrarTodo;
            document.getElementById('confirmMessage').textContent = idiomas[idiomaActual].txtConfirmarBorrarTodo;
            document.getElementById('confirmYes').onclick = borrarTodo;
            document.getElementById('confirmModal').classList.add('active');
        }

        function closeConfirmModal() {
            document.getElementById('confirmModal').classList.remove('active');
            document.getElementById('confirmYes').onclick = null;
        }

        function borrarTodo() {
            closeConfirmModal();

            // Preservar personalizaciones del usuario
            const logoTemp = logoHeader;
            const secuenciaTemp = secuenciaFactura;
            const numeroFacturaTemp = numeroFacturaActual;
            const temaTemp = temaActual;
            const darkModeTemp = isDarkMode;
            const idiomaTemp = idiomaActual;
            const selectedTemplateTemp = selectedTemplate;
            const ruletaColorCompartidasTemp = ruletaColorCompartidas;
            const ruletaColorComprasTemp = ruletaColorCompras;

            if (db) {
                const tx = db.transaction(['logistica', 'compras', 'configuracion', 'backup'], 'readwrite');
                tx.onerror = (e) => {
                    console.error("Error al borrar en IndexedDB:", e.target.error);
                    localStorage.clear();
                    if (logoTemp) localStorage.setItem('logoHeader', logoTemp);
                    if (secuenciaTemp) localStorage.setItem('secuenciaFactura', secuenciaTemp);
                    if (numeroFacturaTemp) localStorage.setItem('numeroFacturaActual', numeroFacturaTemp);
                    localStorage.setItem('tema', temaTemp);
                    localStorage.setItem('darkMode', darkModeTemp);
                    localStorage.setItem('idioma', idiomaTemp);
                    localStorage.setItem('selectedTemplate', selectedTemplateTemp);
                    localStorage.setItem('ruletaColorCompartidas', ruletaColorCompartidasTemp);
                    localStorage.setItem('ruletaColorCompras', ruletaColorComprasTemp);
                };

                tx.objectStore('logistica').clear();
                tx.objectStore('compras').clear();
                tx.objectStore('configuracion').clear();
                tx.objectStore('backup').clear();

                tx.oncomplete = () => {
                    localStorage.clear();
                    if (logoTemp) localStorage.setItem('logoHeader', logoTemp);
                    if (secuenciaTemp) localStorage.setItem('secuenciaFactura', secuenciaTemp);
                    if (numeroFacturaTemp) localStorage.setItem('numeroFacturaActual', numeroFacturaTemp);
                    localStorage.setItem('tema', temaTemp);
                    localStorage.setItem('darkMode', darkModeTemp);
                    localStorage.setItem('idioma', idiomaTemp);
                    localStorage.setItem('selectedTemplate', selectedTemplateTemp);
                    localStorage.setItem('ruletaColorCompartidas', ruletaColorCompartidasTemp);
                    localStorage.setItem('ruletaColorCompras', ruletaColorComprasTemp);

                    // Reiniciar variables
                    logistica = [];
                    compras = [];
                    inversionExtras = 0;
                    cuentasGeneradas = [];
                    participantes = [];
                    rifaCompras = [];
                    resumenMarcado = {};
                    resumenManualOverrides = {};
                    manualMarkCount = {};
                    productosMostrados = 50;
                    comprasMostradas = 50;

                    logoHeader = logoTemp;
                    secuenciaFactura = secuenciaTemp;
                    numeroFacturaActual = numeroFacturaTemp;
                    document.getElementById('headerLogo').src = logoHeader;
                    document.getElementById('favicon').href = logoHeader;

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

                    document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
                    generarEjemploSecuencia();
                    cargarEjemplosSecuencia();
                    cargarColoresRuleta();

                    mostrarToast(idiomas[idiomaActual].txtDatosBorrados, 'success');
                };
            } else {
                localStorage.clear();
                if (logoTemp) localStorage.setItem('logoHeader', logoTemp);
                if (secuenciaTemp) localStorage.setItem('secuenciaFactura', secuenciaTemp);
                if (numeroFacturaTemp) localStorage.setItem('numeroFacturaActual', numeroFacturaTemp);
                localStorage.setItem('tema', temaTemp);
                localStorage.setItem('darkMode', darkModeTemp);
                localStorage.setItem('idioma', idiomaTemp);
                localStorage.setItem('selectedTemplate', selectedTemplateTemp);
                localStorage.setItem('ruletaColorCompartidas', ruletaColorCompartidasTemp);
                localStorage.setItem('ruletaColorCompras', ruletaColorComprasTemp);

                // Reiniciar variables
                logistica = [];
                compras = [];
                inversionExtras = 0;
                cuentasGeneradas = [];
                participantes = [];
                rifaCompras = [];
                resumenMarcado = {};
                resumenManualOverrides = {};
                manualMarkCount = {};
                productosMostrados = 50;
                comprasMostradas = 50;

                logoHeader = logoTemp;
                secuenciaFactura = secuenciaTemp;
                numeroFacturaActual = numeroFacturaTemp;
                document.getElementById('headerLogo').src = logoHeader;
                document.getElementById('favicon').href = logoHeader;

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

                document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
                generarEjemploSecuencia();
                cargarEjemplosSecuencia();
                cargarColoresRuleta();

                mostrarToast(idiomas[idiomaActual].txtDatosBorrados, 'success');
            }
        }

        // --- Función de Escape de HTML ---
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\n/g, "<br>")
                .replace(/\r/g, "");
        }

        // --- Guardar al cerrar la pestaña ---
        window.addEventListener('beforeunload', () => {
            guardarDatos();
        });

        // --- Atajo de teclado Escape ---
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                // Cerrar modales
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
                // Cerrar menú móvil
                document.querySelector('nav ul').classList.remove('active');
                // Cerrar autocompletado
                document.querySelectorAll('.autocomplete-items').forEach(container => {
                    container.style.display = 'none';
                });
                selectedCompradorIndex = -1;
            }
        });

        // --- Botón de instalación PWA ---
        document.getElementById('install-pwa-btn').addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('Usuario aceptó la instalación');
                        document.getElementById('install-pwa-btn').style.display = 'none';
                    }
                    deferredPrompt = null;
                });
            } else {
                mostrarToast('La app ya está instalada o no es compatible con PWA.', 'info');
            }
        });

        // --- Inicializar gráficos ---
        function initCharts() {
            // Inicializar gráficos del dashboard
            actualizarGraficoVentasPorProductoDashboard();
            actualizarGraficoVentasPorDia();
            actualizarGraficoTopProductos();
            actualizarGraficoTopCompradores();
            
            // Inicializar gráfico de ventas por producto en resumen
            actualizarGraficoVentasPorProducto();
        }

        // --- Cargar datos iniciales ---
        setTimeout(() => {
            initCharts();
        }, 1000);