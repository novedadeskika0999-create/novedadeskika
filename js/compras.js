// ============================================================
// compras.js — Compras, regalos, filtrado, exportación
// ============================================================

        function actualizarEspecificacionesCompra() {
            const prod = document.getElementById('productoCompra').value;
            lastSelectedProduct = prod;
            const specSel = document.getElementById('especificacionCompra');
            
            specSel.innerHTML = '<option value="" id="txtNingunaEspecificacion">(ninguna)</option>';

            const p = logistica.find(x => x.nombre === prod);
            if (p && p.especificaciones && p.especificaciones.length > 0) {
                p.especificaciones.forEach(e => {
                    const o = document.createElement('option');
                    o.value = e;
                    o.textContent = escapeHtml(e);
                    specSel.appendChild(o);
                });
            }
            // La casilla de especificaciones SIEMPRE se muestra
        }

        function saveSelectedProducto() {
            localStorage.setItem('lastProductoCompra', document.getElementById('productoCompra').value);
        }

        function manejarTecladoCompras(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const ae = document.activeElement;
                if (ae.id === 'cantidadCompra') {
                    // Verificar que la cantidad no esté vacía
                    const cantidad = parseInt(ae.value);
                    if (isNaN(cantidad) || cantidad <= 0) {
                        mostrarToast(idiomas[idiomaActual].txtCantidadRequerida, 'error');
                        return;
                    }
                    agregarCompra();
                } else if (ae.id === 'btnAgregarCompra') {
                    agregarCompra();
                } else if (ae.id === 'btnAgregarRegalo') {
                    agregarRegalo();
                } else if (ae.id === 'comprador') {
                    // Si hay sugerencias, seleccionar la primera con Enter
                    const sugerencias = document.getElementById('sugerencias-comprador');
                    if (sugerencias.style.display === 'block' && sugerencias.children.length > 0) {
                        ae.value = sugerencias.children[0].textContent;
                        sugerencias.style.display = 'none';
                        selectedCompradorIndex = -1;
                        document.getElementById('productoCompra').focus();
                    } else {
                        document.getElementById('productoCompra').focus();
                    }
                } else if (ae.id === 'productoCompra') {
                    // Si hay un producto seleccionado, pasar a especificaciones
                    if (ae.value) {
                        document.getElementById('especificacionCompra').focus();
                    }
                } else if (ae.id === 'especificacionCompra') {
                    document.getElementById('cantidadCompra').focus();
                } else if (ae.id === 'notasCompra') {
                    agregarCompra();
                } else {
                    moverSiguienteCampo(ae);
                }
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                if (event.key === 'ArrowRight') moverSiguienteCampo(document.activeElement);
                else moverCampoAnterior(document.activeElement);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const ae = document.activeElement;
                if (ae.tagName === 'SELECT') {
                    manejarFlechasEnSelect(event, ae);
                } else if (ae.id === 'comprador') {
                    // Manejar navegación en autocompletar
                    manejarAutocompletarComprador(event);
                } else {
                    const fels = Array.from(document.querySelectorAll('#formCompras input, #formCompras select, #formCompras button, #formCompras textarea'));
                    const ci = fels.indexOf(ae);
                    if (event.key === 'ArrowDown' && ci < fels.length - 1) {
                        fels[ci + 1].focus();
                    } else if (event.key === 'ArrowUp' && ci > 0) {
                        fels[ci - 1].focus();
                    }
                }
            }
        }

        function manejarTecladoSelect(event, select) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                manejarFlechasEnSelect(event, select);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                // Guardar el valor seleccionado
                lastSelectedProduct = select.id === 'productoCompra' ? select.value : lastSelectedProduct;
                // Pasar al siguiente campo
                if (select.id === 'productoCompra') {
                    document.getElementById('especificacionCompra').focus();
                } else if (select.id === 'especificacionCompra') {
                    document.getElementById('cantidadCompra').focus();
                }
            }
        }

        function manejarTecladoCantidad(event) {
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                document.getElementById('notasCompra').focus();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                document.getElementById('especificacionCompra').focus();
            }
        }

        function manejarTecladoNotas(event) {
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                document.getElementById('btnAgregarCompra').focus();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                document.getElementById('cantidadCompra').focus();
            }
        }

        function agregarCompra() {
            const comprador = escapeHtml(document.getElementById('comprador').value.trim());
            const producto = document.getElementById('productoCompra').value;
            const especificacion = document.getElementById('especificacionCompra').value;
            const cantidad = parseInt(document.getElementById('cantidadCompra').value);
            const notas = escapeHtml(document.getElementById('notasCompra').value);

            if (!comprador) {
                mostrarToast(idiomas[idiomaActual].txtIngreseNombreComprador, 'error');
                return;
            }
            if (!producto) {
                mostrarToast(idiomas[idiomaActual].txtIngreseProducto, 'error');
                return;
            }
            if (isNaN(cantidad) || cantidad <= 0) {
                mostrarToast(idiomas[idiomaActual].txtCantidadRequerida, 'error');
                return;
            }

            const p = logistica.find(x => x.nombre === producto);
            if (!p) {
                mostrarToast('Producto no encontrado.', 'error');
                return;
            }

            const vendidos = compras.filter(c => c.producto === producto).reduce((a, c) => a + c.cantidad, 0);
            if (cantidad > (p.cantidad - vendidos)) {
                mostrarToast(idiomas[idiomaActual].txtStockInsuficiente, 'error');
                return;
            }

            compras.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                comprador,
                producto,
                especificacion: escapeHtml(especificacion || ''),
                tamano: p.tamano,
                precio: p.precioUnitario,
                cantidad,
                precioTotal: p.precioUnitario * cantidad,
                marcado: false,
                esRegalo: false,
                notas,
                fecha: new Date().toISOString()
            });

            guardarDatosConDebounce();
            document.getElementById('comprador').value = '';
            document.getElementById('cantidadCompra').value = '';
            document.getElementById('notasCompra').value = '';
            document.getElementById('productoCompra').value = producto;
            actualizarEspecificacionesCompra();
            if (especificacion) document.getElementById('especificacionCompra').value = especificacion;
            document.getElementById('comprador').focus();

            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
            actualizarHDMIDisplay();
            actualizarNombresCompradores();
            actualizarRifaCompras();
            renderRifaCompras();
            actualizarDashboard();

            mostrarToast('Compra agregada correctamente.', 'success');
        }

        function agregarRegalo() {
            const comprador = escapeHtml(document.getElementById('comprador').value.trim());
            if (!comprador) {
                mostrarToast(idiomas[idiomaActual].txtIngreseNombreComprador, 'error');
                return;
            }

            compras.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                comprador,
                producto: "REGALO",
                especificacion: "Empaque sin costo",
                tamano: "mediano",
                precio: 0,
                cantidad: 1,
                precioTotal: 0,
                marcado: false,
                esRegalo: true,
                notas: "",
                fecha: new Date().toISOString()
            });

            guardarDatosConDebounce();
            document.getElementById('comprador').value = '';
            document.getElementById('comprador').focus();

            actualizarTablaCompradores();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
            actualizarHDMIDisplay();
            actualizarDashboard();

            mostrarToast('Regalo agregado correctamente.', 'success');
        }

        function editarCompra(i) {
            editCompraIndex = i;
            actualizarTablaCompradores();
            document.getElementById(`editComprador${i}`).focus();
        }

        function guardarEdicionCompra(i) {
            const comprador = escapeHtml(document.getElementById(`editComprador${i}`).value.trim());
            const cantidad = parseInt(document.getElementById(`editCantidadCompra${i}`).value);

            if (!comprador || isNaN(cantidad) || cantidad <= 0) {
                mostrarToast(idiomas[idiomaActual].txtCompleteCampos, 'error');
                return;
            }

            const producto = compras[i].producto;
            const p = logistica.find(x => x.nombre === producto);
            if (p) {
                const vendidos = compras.filter(c => c.producto === producto && c !== compras[i]).reduce((a, c) => a + c.cantidad, 0);
                if (cantidad > (p.cantidad - vendidos)) {
                    mostrarToast(idiomas[idiomaActual].txtStockInsuficiente, 'error');
                    return;
                }

                compras[i].cantidad = cantidad;
                compras[i].precioTotal = compras[i].precio * cantidad;
            } else {
                compras[i].cantidad = cantidad;
                compras[i].precioTotal = compras[i].precio * cantidad;
            }

            compras[i].comprador = comprador;
            editCompraIndex = -1;
            guardarDatosConDebounce();
            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
            actualizarDashboard();
            mostrarToast('Compra actualizada correctamente.', 'success');
        }

        function cancelarEdicionCompra() {
            editCompraIndex = -1;
            actualizarTablaCompradores();
        }

        function actualizarTablaCompradores() {
            const tbody = document.getElementById('tbodyCompradores');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (!compras || compras.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="10" style="text-align:center; color:var(--text-muted); padding:32px;">No hay compras registradas aún.</td>`;
                tbody.appendChild(row);
                actualizarNombresCompradores();
                return;
            }

            compras.forEach((c, i) => {
                // Sanear datos por si vienen corruptos de IndexedDB
                const precio = parseFloat(c.precio) || 0;
                const cantidad = parseInt(c.cantidad) || 1;
                const precioTotal = parseFloat(c.precioTotal) || precio * cantidad;

                const row = document.createElement('tr');
                if (i === editCompraIndex) {
                    row.innerHTML = `
                        <td></td>
                        <td><input class="inline-input" type="text" id="editComprador${i}" value="${escapeHtml(c.comprador)}"></td>
                        <td>${escapeHtml(c.producto)}</td>
                        <td class="especificacion">${escapeHtml(c.especificacion || '—')}</td>
                        <td>${escapeHtml(c.tamano || '—')}</td>
                        <td>$${precio.toFixed(2)}</td>
                        <td><input class="inline-input" type="number" id="editCantidadCompra${i}" value="${cantidad}" min="1" style="width:70px;"></td>
                        <td>$${precioTotal.toFixed(2)}</td>
                        <td>${escapeHtml(c.notas || '—')}</td>
                        <td>
                            <button onclick="guardarEdicionCompra(${i})" class="btn-primary btn-sm"><i class="fas fa-save"></i> ${idiomas[idiomaActual].txtGuardar}</button>
                            <button onclick="cancelarEdicionCompra()" class="btn-secondary btn-sm"><i class="fas fa-times"></i> ${idiomas[idiomaActual].txtCancelar}</button>
                        </td>`;
                } else {
                    row.innerHTML = `
                        <td><input type="checkbox" onchange="toggleMarca(this,${i})" ${c.marcado ? 'checked' : ''}></td>
                        <td>${escapeHtml(c.comprador)}</td>
                        <td>${escapeHtml(c.producto)}</td>
                        <td class="especificacion">${escapeHtml(c.especificacion || '—')}</td>
                        <td><span class="badge badge-blue">${escapeHtml(c.tamano || '—')}</span></td>
                        <td>$${precio.toFixed(2)}</td>
                        <td>
                            <input type="number" value="${cantidad}" onchange="editarCantidadCompra(${i}, this.value)"
                                style="width:70px; text-align:center; padding:6px 8px; border:1px solid var(--border-strong); border-radius:var(--radius-sm); background:var(--surface); color:var(--text-primary);">
                        </td>
                        <td>$${precioTotal.toFixed(2)}</td>
                        <td>${escapeHtml(c.notas || '—')}</td>
                        <td>
                            <button onclick="editarCompra(${i})" class="btn-secondary btn-sm"><i class="fas fa-edit"></i> ${idiomas[idiomaActual].txtEditar}</button>
                            <button onclick="eliminarCompra(${i})" class="btn-danger btn-sm"><i class="fas fa-trash"></i> ${idiomas[idiomaActual].txtEliminar}</button>
                        </td>`;
                    if (c.marcado) row.classList.add('marcado');
                    if (c.esRegalo) row.classList.add('regalo');
                }
                tbody.appendChild(row);
            });

            actualizarNombresCompradores();
        }

        function toggleMarca(chk, index) {
            const compra = compras[index];
            compra.marcado = chk.checked;
            chk.parentElement.parentElement.classList.toggle('marcado', chk.checked);
            const comprador = compra.comprador;
            const todas = compras.filter(c => c.comprador === comprador);

            if (todas.every(c => c.marcado)) {
                resumenMarcado[comprador] = true;
                resumenManualOverrides[comprador] = true;
            } else if (todas.some(c => !c.marcado)) {
                resumenMarcado[comprador] = false;
                resumenManualOverrides[comprador] = false;
            }

            guardarDatosConDebounce();
            actualizarResumenCompradoras();
            actualizarContadores();
            actualizarTablaCuentas();
        }

        function editarCantidadCompra(i, val) {
            const n = parseInt(val);
            if (!isNaN(n) && n > 0) {
                const producto = compras[i].producto;
                const p = logistica.find(x => x.nombre === producto);
                
                if (p) {
                    const vendidos = compras.filter(c => c.producto === producto && c !== compras[i]).reduce((a, c) => a + c.cantidad, 0);
                    if (n > (p.cantidad - vendidos)) {
                        mostrarToast(idiomas[idiomaActual].txtStockInsuficiente, 'error');
                        // Revertir el cambio
                        document.querySelector(`#tablaCompradores tbody tr:nth-child(${i + 1}) input[type="number"]`).value = compras[i].cantidad;
                        return;
                    }
                }

                compras[i].cantidad = n;
                compras[i].precioTotal = compras[i].precio * n;
                guardarDatosConDebounce();
                actualizarTablaCompradores();
                actualizarVentasTotales();
                actualizarResumenCompradoras();
                actualizarTablaCuentas();
                actualizarDashboard();
            }
        }

        function eliminarCompra(i) {
            if (compras[i].esRegalo && !confirm(idiomas[idiomaActual].txtConfirmarEliminarRegalo)) return;

            compras.splice(i, 1);
            guardarDatosConDebounce();
            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
            actualizarRifaCompras();
            renderRifaCompras();
            actualizarDashboard();
            mostrarToast('Compra eliminada correctamente.', 'success');
        }

        function actualizarVentasTotales() {
            let s = 0;
            compras.forEach(c => {
                const pt = parseFloat(c.precioTotal);
                if (!isNaN(pt)) s += pt;
            });
            const el = document.getElementById('totalVentasEmpresa');
            if (el) el.textContent = `$${s.toFixed(2)}`;
        }

        function filtrarCompradores() {
            const q = document.getElementById('buscador').value.toLowerCase();
            const tbody = document.getElementById('tbodyCompradores');
            tbody.innerHTML = '';
            let sumI = 0;

            const filtradas = compras.filter(c => c.comprador.toLowerCase().includes(q));
            const tamanos = filtradas.map(c => c.tamano);
            const cantTotal = filtradas.reduce((a, c) => a + c.cantidad, 0);
            document.getElementById('tamanoBolsaComprador').value = determinarTamanoBolsa(tamanos, cantTotal);

            compras.forEach((c, i) => {
                if (!c.comprador.toLowerCase().includes(q)) return;
                const precio = parseFloat(c.precio) || 0;
                const cantidad = parseInt(c.cantidad) || 1;
                const precioTotal = parseFloat(c.precioTotal) || precio * cantidad;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" onchange="toggleMarca(this,${i})" ${c.marcado ? 'checked' : ''}></td>
                    <td>${escapeHtml(c.comprador)}</td>
                    <td>${escapeHtml(c.producto)}</td>
                    <td class="especificacion">${escapeHtml(c.especificacion || '—')}</td>
                    <td><span class="badge badge-blue">${escapeHtml(c.tamano)}</span></td>
                    <td>$${precio.toFixed(2)}</td>
                    <td>
                        <input type="number" value="${cantidad}" onchange="editarCantidadCompra(${i}, this.value)"
                            style="width:70px; text-align:center; padding:6px 8px; border:1px solid var(--border-strong); border-radius:var(--radius-sm); background:var(--surface); color:var(--text-primary);">
                    </td>
                    <td>$${precioTotal.toFixed(2)}</td>
                    <td>${escapeHtml(c.notas || '—')}</td>
                    <td>
                        <button onclick="editarCompra(${i})" class="btn-secondary btn-sm"><i class="fas fa-edit"></i> ${idiomas[idiomaActual].txtEditar}</button>
                        <button onclick="eliminarCompra(${i})" class="btn-danger btn-sm"><i class="fas fa-trash"></i> ${idiomas[idiomaActual].txtEliminar}</button>
                    </td>`;
                if (c.marcado) row.classList.add('marcado');
                if (c.esRegalo) row.classList.add('regalo');
                tbody.appendChild(row);
                sumI += precioTotal;
            });

            document.getElementById('sumaIndividual').textContent = `$${sumI.toFixed(2)}`;
        }

        function buscarProductoCompras() {
            const q = document.getElementById('buscadorProductoCompras').value.trim().toLowerCase();
            const res = document.getElementById('resultadoBusquedaProductoCompras');
            res.style.display = 'none';
            res.innerHTML = '';

            if (!q) return mostrarToast('Ingrese un producto para buscar.', 'error');

            const comps = compras.filter(c => c.producto.toLowerCase() === q);
            if (!comps.length) {
                res.textContent = idiomas[idiomaActual].txtNoComprasProducto;
                res.style.display = 'block';
                return;
            }

            const totalVend = comps.reduce((a, c) => a + c.cantidad, 0);
            const prod = logistica.find(p => p.nombre.toLowerCase() === q);
            const invent = prod ? prod.cantidad : 0;
            const sobr = prod ? prod.cantidad - totalVend : 0;
            const valorSob = prod ? ((prod.precioUnitario * prod.cantidad) - comps.reduce((a, c) => a + c.precioTotal, 0)).toFixed(2) : '0';
            const buyers = [...new Set(comps.map(c => c.comprador))].join(', ');

            res.innerHTML = `
                <strong>${escapeHtml(idiomas[idiomaActual].txtComprasPara)} "${escapeHtml(q)}"</strong><br><br>
                <strong>${escapeHtml(idiomas[idiomaActual].txtCompradores)}:</strong> ${escapeHtml(buyers)}<br>
                <strong>${escapeHtml(idiomas[idiomaActual].txtTotalVendidos)}:</strong> ${totalVend}<br>
                <strong>${escapeHtml(idiomas[idiomaActual].txtInventarioOriginal)}:</strong> ${invent}<br>
                <strong>${escapeHtml(idiomas[idiomaActual].txtSobrante)}:</strong> ${sobr}<br>
                <strong>${escapeHtml(idiomas[idiomaActual].txtValorSobranteLabel)}:</strong> $${valorSob}`;
            res.style.display = 'block';
        }

        function exportarComprasAExcel() {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(compras.map(c => ({
                Comprador: c.comprador,
                Producto: c.producto,
                Especificación: c.especificacion || '—',
                Tamaño: c.tamano,
                Precio: c.precio,
                Cantidad: c.cantidad,
                Total: c.precioTotal,
                Marcado: c.marcado ? 'Sí' : 'No',
                Regalo: c.esRegalo ? 'Sí' : 'No',
                Notas: c.notas || '—',
                Fecha: new Date(c.fecha).toLocaleDateString()
            })));
            XLSX.utils.book_append_sheet(wb, ws, "Compras");
            XLSX.writeFile(wb, "Compras_Novedades_Kika.xlsx");
            mostrarToast('Compras exportadas a Excel correctamente.', 'success');
        }

        // --- Funciones de Resumen de Compradoras ---
