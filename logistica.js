// ============================================================
// logistica.js — CRUD de productos en logística
// ============================================================

        function validarProducto(nombre, precioUnitario, precioCosto, cantidad, tamano) {
            if (!nombre || nombre.trim() === '') {
                mostrarToast(idiomas[idiomaActual].txtCompleteCampos, 'error');
                return false;
            }
            if (isNaN(precioUnitario) || precioUnitario <= 0) {
                mostrarToast(idiomas[idiomaActual].txtPrecioUnitarioInvalido || 'El precio unitario debe ser un número positivo.', 'error');
                return false;
            }
            if (isNaN(precioCosto) || precioCosto < 0) {
                mostrarToast(idiomas[idiomaActual].txtPrecioCostoNegativo || 'El precio de costo no puede ser negativo.', 'error');
                return false;
            }
            if (isNaN(cantidad) || cantidad <= 0) {
                mostrarToast(idiomas[idiomaActual].txtCantidadInvalida || 'La cantidad debe ser un número positivo.', 'error');
                return false;
            }
            if (!tamano) {
                mostrarToast(idiomas[idiomaActual].txtTamanoRequerido || 'Seleccione un tamaño.', 'error');
                return false;
            }
            if (logistica.some(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.nombre !== nombre)) {
                mostrarToast(idiomas[idiomaActual].txtNombreProductoEnUso, 'error');
                return false;
            }
            // Advertir si la ganancia sería negativa (pero no bloquear)
            const ganancia = (precioUnitario * cantidad) - precioCosto;
            if (ganancia < 0) {
                return confirm(idiomas[idiomaActual].txtGananciaNegativaAdvertencia || `⚠️ La ganancia calculada es negativa ($${ganancia.toFixed(2)}). Esto significa que el costo supera los ingresos.\n¿Desea continuar de todas formas?`);
            }
            return true;
        }

        function agregarProductoLogistica() {
            const nombre = escapeHtml(document.getElementById('nombreProductoLogistica').value.trim());
            const precioUnitario = parseFloat(document.getElementById('precioUnitario').value);
            const precioCosto = parseFloat(document.getElementById('precioCosto').value);
            const cantidad = parseInt(document.getElementById('cantidadProducto').value);
            const tamano = document.getElementById('tamanoProducto').value;
            const especRaw = document.getElementById('especificacionesProductoLogistica').value;
            const especificaciones = especRaw.split(',').map(s => escapeHtml(s.trim())).filter(s => s);
            const categoria = document.getElementById('categoriaProducto').value || 'Sin categoría';
            const stockMinimo = parseInt(document.getElementById('stockMinimo').value) || 0;

            if (!validarProducto(nombre, precioUnitario, precioCosto, cantidad, tamano)) return;

            logistica.push({
                nombre,
                precioUnitario,
                precioCosto,
                cantidad,
                tamano,
                ganancia: (precioUnitario * cantidad) - precioCosto,
                especificaciones,
                categoria,
                stockMinimo
            });

            guardarDatosConDebounce();
            document.getElementById('formLogistica').reset();
            document.getElementById('nombreProductoLogistica').focus();
            actualizarTablaLogistica();
            actualizarListaProductos();
            mostrarToast('Producto agregado correctamente.', 'success');
        }

        function actualizarTablaLogistica() {
            const tbody = document.getElementById('tbodyLogistica');
            if (!tbody) return;
            tbody.innerHTML = '';

            logistica.forEach((p, i) => {
                const row = document.createElement('tr');
                if (i === editIndex) {
                    row.innerHTML = `
                        <td><input class="inline-input" type="text" id="editNombre${i}" value="${escapeHtml(p.nombre)}"></td>
                        <td><input class="inline-input" type="number" id="editPrecioUnitario${i}" value="${p.precioUnitario}" step="0.01" min="0"></td>
                        <td><input class="inline-input" type="number" id="editPrecioCosto${i}" value="${p.precioCosto}" step="0.01" min="0"></td>
                        <td><input class="inline-input" type="number" id="editCantidad${i}" value="${p.cantidad}" min="1"></td>
                        <td>
                            <input type="number" value="${p.cantidad}" onblur="actualizarCantidadLogistica(${logistica.indexOf(p)}, this.value)"
                                style="width:70px; text-align:center; padding:6px 8px; border:1px solid var(--border-strong); border-radius:var(--radius-sm); background:var(--surface); color:var(--text-primary);">
                        </td>
                        <td>
                            <select class="inline-input" id="editTamano${i}">
                                <option value="pequeño" ${p.tamano==='pequeño'?'selected':''}>${idiomas[idiomaActual].txtTamanoPequeno}</option>
                                <option value="mediano" ${p.tamano==='mediano'?'selected':''}>${idiomas[idiomaActual].txtTamanoMediano}</option>
                                <option value="grande" ${p.tamano==='grande'?'selected':''}>${idiomas[idiomaActual].txtTamanoGrande}</option>
                            </select>
                        </td>
                        <td>
                            <select class="inline-input" id="editCategoria${i}">
                                <option value="Ropa" ${p.categoria==='Ropa'?'selected':''}>Ropa</option>
                                <option value="Electrónicos" ${p.categoria==='Electrónicos'?'selected':''}>Electrónicos</option>
                                <option value="Alimentos" ${p.categoria==='Alimentos'?'selected':''}>Alimentos</option>
                                <option value="Otros" ${p.categoria==='Otros'?'selected':''}>Otros</option>
                                <option value="Sin categoría" ${p.categoria==='Sin categoría'?'selected':''}>Sin categoría</option>
                            </select>
                        </td>
                        <td>$${((p.precioUnitario * p.cantidad) - p.precioCosto).toFixed(2)}</td>
                        <td><input class="inline-input" type="text" id="editEspecificaciones${i}" value="${p.especificaciones.join(', ')}"></td>
                        <td>
                            <button onclick="guardarEdicionProducto(${logistica.indexOf(p)})" class="btn-primary btn-sm"><i class="fas fa-save"></i> ${idiomas[idiomaActual].txtGuardar}</button>
                            <button onclick="cancelarEdicionProducto()" class="btn-secondary btn-sm"><i class="fas fa-times"></i> ${idiomas[idiomaActual].txtCancelar}</button>
                        </td>`;
                } else {
                    const vendidos = compras.filter(c => c.producto === p.nombre).reduce((a, c) => a + c.cantidad, 0);
                    const stock = p.cantidad - vendidos;
                    const stockBajo = stock <= p.stockMinimo;

                    row.innerHTML = `
                        <td>${escapeHtml(p.nombre)}</td>
                        <td>$${p.precioUnitario.toFixed(2)}</td>
                        <td>$${p.precioCosto.toFixed(2)}</td>
                        <td>${p.cantidad}</td>
                        <td style="color: ${stockBajo ? 'var(--danger)' : 'inherit'}; font-weight: ${stockBajo ? 'bold' : 'normal'};">${stock}</td>
                        <td><span class="badge badge-blue">${escapeHtml(p.tamano)}</span></td>
                        <td><span class="badge badge-blue">${escapeHtml(p.categoria)}</span></td>
                        <td style="color: ${p.ganancia < 0 ? 'var(--danger)' : 'inherit'}; font-weight: ${p.ganancia < 0 ? 'bold' : 'normal'};">${p.ganancia < 0 ? '⚠️ ' : ''}$${p.ganancia.toFixed(2)}</td>
                        <td>${p.especificaciones.length > 0 ? escapeHtml(p.especificaciones.join(', ')) : '—'}</td>
                        <td>
                            <button onclick="editarProductoLogistica(${logistica.indexOf(p)})" class="btn-secondary btn-sm"><i class="fas fa-edit"></i> ${idiomas[idiomaActual].txtEditar}</button>
                            <button onclick="eliminarProductoLogistica(${logistica.indexOf(p)})" class="btn-danger btn-sm"><i class="fas fa-trash"></i> ${idiomas[idiomaActual].txtEliminar}</button>
                        </td>`;
                }
                tbody.appendChild(row);
            });

            actualizarTotalesLogistica();
        }

        function actualizarCantidadLogistica(i, val) {
            const c = parseInt(val);
            if (!isNaN(c) && c > 0) {
                const oldCantidad = logistica[i].cantidad;
                const vendidos = compras.filter(c => c.producto === logistica[i].nombre).reduce((a, c) => a + c.cantidad, 0);
                
                if (c < vendidos) {
                    mostrarToast(`No puede establecer la cantidad a ${c} porque ya se han vendido ${vendidos} unidades.`, 'error');
                    // Revertir el cambio
                    document.querySelector(`#tablaLogistica tbody tr:nth-child(${i + 1}) input[type="number"]`).value = oldCantidad;
                    return;
                }

                logistica[i].cantidad = c;
                logistica[i].ganancia = (logistica[i].precioUnitario * c) - logistica[i].precioCosto;
                guardarDatosConDebounce();
                actualizarTablaLogistica();
                actualizarVentasTotales();
                actualizarResumenCompradoras();
            }
        }

        function editarProductoLogistica(i) {
            editIndex = i;
            actualizarTablaLogistica();
            document.getElementById(`editNombre${i}`).focus();
        }

        function cancelarEdicionProducto() {
            editIndex = -1;
            actualizarTablaLogistica();
        }

        function guardarEdicionProducto(i) {
            const oldName = logistica[i].nombre;
            const nombre = escapeHtml(document.getElementById(`editNombre${i}`).value.trim());
            const precioUnitario = parseFloat(document.getElementById(`editPrecioUnitario${i}`).value);
            const precioCosto = parseFloat(document.getElementById(`editPrecioCosto${i}`).value);
            const cantidad = parseInt(document.getElementById(`editCantidad${i}`).value);
            const tamano = document.getElementById(`editTamano${i}`).value;
            const categoria = document.getElementById(`editCategoria${i}`).value;
            const especRaw = document.getElementById(`editEspecificaciones${i}`).value;
            const especificaciones = especRaw.split(',').map(s => escapeHtml(s.trim())).filter(s => s);

            if (!validarProducto(nombre, precioUnitario, precioCosto, cantidad, tamano)) return;

            if (nombre !== oldName && logistica.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
                mostrarToast(idiomas[idiomaActual].txtNombreProductoEnUso, 'error');
                return;
            }

            // Verificar stock antes de actualizar
            const vendidos = compras.filter(c => c.producto === oldName).reduce((a, c) => a + c.cantidad, 0);
            if (cantidad < vendidos) {
                mostrarToast(`No puede establecer la cantidad a ${cantidad} porque ya se han vendido ${vendidos} unidades.`, 'error');
                return;
            }

            logistica[i] = {
                nombre,
                precioUnitario,
                precioCosto,
                cantidad,
                tamano,
                ganancia: (precioUnitario * cantidad) - precioCosto,
                especificaciones,
                categoria,
                stockMinimo: logistica[i].stockMinimo || 0
            };

            // Actualizar compras asociadas
            compras.forEach(c => {
                if (c.producto === oldName) {
                    c.producto = nombre;
                    c.precio = precioUnitario;
                    c.tamano = tamano;
                    c.precioTotal = precioUnitario * c.cantidad;
                }
            });

            editIndex = -1;
            guardarDatosConDebounce();
            actualizarTablaLogistica();
            actualizarListaProductos();
            actualizarTablaCompradores();
            actualizarVentasTotales();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
            actualizarHDMIDisplay();
            actualizarDashboard();
            mostrarToast('Producto actualizado correctamente.', 'success');
        }

        function eliminarProductoLogistica(i) {
            const nombre = logistica[i].nombre;
            const vendidos = compras.filter(c => c.producto === nombre).length;

            if (vendidos > 0) {
                mostrarToast(`No puede eliminar el producto "${nombre}" porque tiene ${vendidos} compras asociadas.`, 'error');
                return;
            }

            if (!confirm(idiomas[idiomaActual].txtConfirmarEliminarProducto)) return;

            logistica.splice(i, 1);
            guardarDatosConDebounce();
            actualizarTablaLogistica();
            actualizarListaProductos();
            actualizarRifaCompras();
            renderRifaCompras();
            mostrarToast('Producto eliminado correctamente.', 'success');
        }

        function actualizarTotalesLogistica() {
            let gan = 0, invCost = 0, prodCount = 0, totalTheo = 0;
            let stockBajoCount = 0;

            logistica.forEach(p => {
                gan += p.ganancia;
                invCost += p.precioCosto;
                prodCount += p.cantidad;
                totalTheo += p.precioUnitario * p.cantidad;

                const vendidos = compras.filter(c => c.producto === p.nombre).reduce((a, c) => a + c.cantidad, 0);
                const stock = p.cantidad - vendidos;
                if (stock <= p.stockMinimo) {
                    stockBajoCount++;
                }
            });

            const net = gan - inversionExtras;
            let ventas = 0;
            compras.forEach(c => {
                const pt = parseFloat(c.precioTotal);
                if (!isNaN(pt)) ventas += pt;
            });
            const sobr = totalTheo - ventas;

            const elGan = document.getElementById('totalGanancias');
            const elInv = document.getElementById('totalInversion');
            const elGas = document.getElementById('gastosExtra');
            const elPro = document.getElementById('totalProductos');
            const elSob = document.getElementById('valorSobrante');
            const elStk = document.getElementById('stockBajo');
            if (elGan) elGan.textContent = `$${isNaN(net) ? '0.00' : net.toFixed(2)}`;
            if (elInv) elInv.textContent = `$${isNaN(invCost) ? '0.00' : (invCost + inversionExtras).toFixed(2)}`;
            if (elGas) elGas.textContent = `$${isNaN(inversionExtras) ? '0.00' : inversionExtras.toFixed(2)}`;
            if (elPro) elPro.textContent = prodCount;
            if (elSob) elSob.textContent = `$${isNaN(sobr) ? '0.00' : sobr.toFixed(2)}`;
            if (elStk) elStk.textContent = stockBajoCount;
        }

        function actualizarListaProductos() {
            const sel = document.getElementById('productoCompra');
            sel.innerHTML = '<option value="">' + idiomas[idiomaActual].txtSeleccioneProducto + '</option>';

            logistica.forEach(p => {
                const vendidos = compras.filter(c => c.producto === p.nombre).reduce((a, c) => a + c.cantidad, 0);
                if (p.cantidad - vendidos > 0) {
                    const o = document.createElement('option');
                    o.value = p.nombre;
                    o.textContent = escapeHtml(p.nombre);
                    sel.appendChild(o);
                }
            });

            // Restaurar el último producto seleccionado si sigue disponible
            if (lastSelectedProduct) {
                const op = Array.from(sel.options).find(o => o.value === lastSelectedProduct);
                if (op) {
                    sel.value = lastSelectedProduct;
                    actualizarEspecificacionesCompra();
                } else {
                    lastSelectedProduct = null;
                }
            }
            actualizarNombresCompradores();
        }

        function buscarProductoAvanzado() {
            const busqueda = document.getElementById('buscadorProducto').value.toLowerCase();
            const minPrecio = parseFloat(document.getElementById('minPrecioBusqueda').value) || 0;
            const maxPrecio = parseFloat(document.getElementById('maxPrecioBusqueda').value) || Infinity;
            const tamanoSeleccionado = document.getElementById('filtroTamanoBusqueda').value;
            const categoriaSeleccionada = document.getElementById('filtroCategoriaBusqueda').value;

            const resultados = logistica.filter(p => {
                const coincideNombre = p.nombre.toLowerCase().includes(busqueda);
                const coincidePrecio = p.precioUnitario >= minPrecio && p.precioUnitario <= maxPrecio;
                const coincideTamano = !tamanoSeleccionado || p.tamano === tamanoSeleccionado;
                const coincideCategoria = !categoriaSeleccionada || p.categoria === categoriaSeleccionada;
                return coincideNombre && coincidePrecio && coincideTamano && coincideCategoria;
            });

            const tbody = document.getElementById('tbodyLogistica');
            tbody.innerHTML = '';

            resultados.forEach((p, i) => {
                const row = document.createElement('tr');
                const vendidos = compras.filter(c => c.producto === p.nombre).reduce((a, c) => a + c.cantidad, 0);
                const stock = p.cantidad - vendidos;
                const stockBajo = stock <= p.stockMinimo;

                row.innerHTML = `
                    <td>${escapeHtml(p.nombre)}</td>
                    <td>$${p.precioUnitario.toFixed(2)}</td>
                    <td>$${p.precioCosto.toFixed(2)}</td>
                    <td>${p.cantidad}</td>
                    <td style="color: ${stockBajo ? 'var(--danger)' : 'inherit'}; font-weight: ${stockBajo ? 'bold' : 'normal'};">${stock}</td>
                    <td><span class="badge badge-blue">${escapeHtml(p.tamano)}</span></td>
                    <td><span class="badge badge-blue">${escapeHtml(p.categoria)}</span></td>
                    <td style="color: ${p.ganancia < 0 ? 'var(--danger)' : 'inherit'}; font-weight: ${p.ganancia < 0 ? 'bold' : 'normal'};">${p.ganancia < 0 ? '⚠️ ' : ''}$${p.ganancia.toFixed(2)}</td>
                    <td>${p.especificaciones.length > 0 ? escapeHtml(p.especificaciones.join(', ')) : '—'}</td>
                    <td>
                        <button onclick="editarProductoLogistica(${logistica.indexOf(p)})" class="btn-secondary btn-sm"><i class="fas fa-edit"></i> ${idiomas[idiomaActual].txtEditar}</button>
                        <button onclick="eliminarProductoLogistica(${logistica.indexOf(p)})" class="btn-danger btn-sm"><i class="fas fa-trash"></i> ${idiomas[idiomaActual].txtEliminar}</button>
                    </td>`;
                tbody.appendChild(row);
            });
        }

        function buscarProducto() {
            const q = document.getElementById('buscadorProducto').value.trim().toLowerCase();
            const res = document.getElementById('resultadoBusquedaProducto');
            if (!q) { res.style.display = 'none'; return; }

            const found = logistica.filter(p => p.nombre.toLowerCase().includes(q));
            if (!found.length) {
                res.innerHTML = `<p>${idiomas[idiomaActual].txtNoComprasProducto}</p>`;
                res.style.display = 'block';
                return;
            }

            res.innerHTML = found.map(p => {
                const vendidos = compras.filter(c => c.producto === p.nombre).reduce((a, c) => a + c.cantidad, 0);
                const stock = p.cantidad - vendidos;
                return `<p><strong>${escapeHtml(p.nombre)}</strong> — $${p.precioUnitario.toFixed(2)} — Stock: ${stock} — Categoría: ${p.categoria}</p>`;
            }).join('');
            res.style.display = 'block';
        }

        function exportarProductosAExcel() {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(logistica.map(p => ({
                Nombre: p.nombre,
                "Precio Unitario": p.precioUnitario,
                "Precio Costo": p.precioCosto,
                Cantidad: p.cantidad,
                Tamaño: p.tamano,
                Categoría: p.categoria,
                Ganancia: p.ganancia,
                "Stock Mínimo": p.stockMinimo,
                Especificaciones: p.especificaciones.join(', ')
            })));
            XLSX.utils.book_append_sheet(wb, ws, "Productos");
            XLSX.writeFile(wb, "Productos_Novedades_Kika.xlsx");
            mostrarToast('Productos exportados a Excel correctamente.', 'success');
        }

        // --- Funciones de Compras ---
