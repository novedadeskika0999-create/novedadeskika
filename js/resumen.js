// ============================================================
// resumen.js — Resumen de compradoras, por producto, dashboard, gráficos
// ============================================================

        function actualizarResumenCompradoras() {
            const resumen = {};
            compras.forEach(c => {
                if (!resumen[c.comprador]) {
                    resumen[c.comprador] = { cantidad: 0, dinero: 0, tamanos: [] };
                }
                resumen[c.comprador].cantidad += c.cantidad;
                resumen[c.comprador].dinero += c.precioTotal;
                resumen[c.comprador].tamanos.push(c.tamano);
            });

            const tbody = document.getElementById('tbodyResumenCompradoras');
            tbody.innerHTML = '';
            let maxDin = 0;

            for (let k in resumen) {
                if (resumen[k].dinero > maxDin) maxDin = resumen[k].dinero;
            }

            for (let k in resumen) {
                const tr = document.createElement('tr');
                if (resumenMarcado[k]) tr.classList.add('resumen-seleccionado');

                const tdChk = document.createElement('td');
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = resumenMarcado[k] || false;
                chk.onchange = () => toggleMarcadoResumen(k, chk.checked);
                tdChk.appendChild(chk);

                const tdNom = document.createElement('td');
                tdNom.textContent = escapeHtml(k);

                const tdDin = document.createElement('td');
                tdDin.textContent = `$${resumen[k].dinero.toFixed(2)}`;

                const tdCant = document.createElement('td');
                tdCant.textContent = resumen[k].cantidad;

                const tdTam = document.createElement('td');
                tdTam.textContent = determinarTamanoBolsa(resumen[k].tamanos, resumen[k].cantidad);

                const tdMej = document.createElement('td');
                if (resumen[k].dinero === maxDin && maxDin > 0) {
                    tdMej.innerHTML = "<span class='mejor'>⭐</span>";
                }

                const tdDesc = document.createElement('td');
                tdDesc.innerHTML = cuentasGeneradas.includes(k)
                    ? `<span class="badge badge-green">${escapeHtml(idiomas[idiomaActual].txtSi)}</span>`
                    : `<span class="badge badge-red">${escapeHtml(idiomas[idiomaActual].txtNo)}</span>`;

                const tdAcciones = document.createElement('td');
                tdAcciones.innerHTML = `
                    <button onclick="descargarCuenta('${escapeHtml(k)}')" class="btn-primary btn-sm">
                        <i class="fas fa-file-pdf"></i> ${idiomas[idiomaActual].txtDescargar}
                    </button>
                `;

                tr.append(tdChk, tdNom, tdDin, tdCant, tdTam, tdMej, tdDesc, tdAcciones);
                tbody.appendChild(tr);
            }

            guardarDatosConDebounce();
            actualizarContadores();
            actualizarTablaCuentas();
        }

        function determinarTamanoBolsa(tamanos, cantidadTotal) {
            if (tamanos.includes('grande') || cantidadTotal > 10) return idiomas[idiomaActual].txtTamanoGrande;
            if (tamanos.includes('mediano') || cantidadTotal > 5) return idiomas[idiomaActual].txtTamanoMediano;
            return idiomas[idiomaActual].txtTamanoPequeno;
        }

        function filtrarResumenCompradoras() {
            const q = document.getElementById('buscadorResumen').value.toLowerCase();
            const soloNoMarcados = document.getElementById('mostrarSoloNoMarcados').checked;
            document.querySelectorAll('#tablaResumenCompradoras tbody tr').forEach(row => {
                const nombre = row.cells[1].textContent.toLowerCase();
                const marcado = row.classList.contains('resumen-seleccionado');
                row.style.display = (nombre.includes(q) && (!soloNoMarcados || !marcado)) ? '' : 'none';
            });
        }

        function toggleMarcadoResumen(k, estado) {
            compras.forEach(c => {
                if (c.comprador === k) c.marcado = estado;
            });
            resumenManualOverrides[k] = estado;
            resumenMarcado[k] = estado;
            guardarDatosConDebounce();
            actualizarTablaCompradores();
            actualizarResumenCompradoras();
            actualizarTablaCuentas();
        }

        function actualizarContadores() {
            const compradores = [...new Set(compras.map(c => c.comprador))];
            const marcados = compradores.filter(c => resumenMarcado[c]).length;
            const noMarcados = compradores.length - marcados;
            document.getElementById('contadorMarcados').textContent = marcados;
            document.getElementById('contadorNoMarcados').textContent = noMarcados;
            document.getElementById('contadorFaltantes').textContent = noMarcados;
        }

        function exportarResumenCompradorasAExcel() {
            const resumen = {};
            compras.forEach(c => {
                if (!resumen[c.comprador]) {
                    resumen[c.comprador] = {
                        totalDinero: 0,
                        totalProductos: 0,
                        productos: []
                    };
                }
                resumen[c.comprador].totalDinero += c.precioTotal;
                resumen[c.comprador].totalProductos += c.cantidad;
                resumen[c.comprador].productos.push(`${c.producto} (${c.cantidad})`);
            });

            const datosExcel = Object.entries(resumen).map(([comprador, datos]) => ({
                Compradora: comprador,
                "Total en Dinero": datos.totalDinero,
                "Total Productos": datos.totalProductos,
                Productos: datos.productos.join(', ')
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datosExcel);
            XLSX.utils.book_append_sheet(wb, ws, "Resumen Compradoras");
            XLSX.writeFile(wb, "Resumen_Compradoras.xlsx");
            mostrarToast('Resumen de compradoras exportado a Excel correctamente.', 'success');
        }

        // --- Funciones de Resumen por Producto ---
        function actualizarResumenPorProducto() {
            const resumen = {};
            compras.forEach(c => {
                if (!resumen[c.producto]) {
                    resumen[c.producto] = {
                        cantidad: 0,
                        total: 0,
                        compradores: new Set(),
                        categoria: 'Sin categoría'
                    };
                }
                resumen[c.producto].cantidad += c.cantidad;
                resumen[c.producto].total += c.precioTotal;
                resumen[c.producto].compradores.add(c.comprador);
                // Obtener categoría del producto
                const producto = logistica.find(p => p.nombre === c.producto);
                if (producto) {
                    resumen[c.producto].categoria = producto.categoria;
                }
            });

            const tbody = document.getElementById('tbodyResumenProducto');
            tbody.innerHTML = '';

            for (const [producto, datos] of Object.entries(resumen)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(producto)}</td>
                    <td>${escapeHtml(datos.categoria)}</td>
                    <td>${datos.cantidad}</td>
                    <td>$${datos.total.toFixed(2)}</td>
                    <td>${[...datos.compradores].join(', ')}</td>
                `;
                tbody.appendChild(row);
            }

            actualizarGraficoVentasPorProducto();
        }

        function exportarResumenProductoAExcel() {
            const resumen = {};
            compras.forEach(c => {
                if (!resumen[c.producto]) {
                    resumen[c.producto] = {
                        cantidad: 0,
                        total: 0,
                        compradores: new Set()
                    };
                }
                resumen[c.producto].cantidad += c.cantidad;
                resumen[c.producto].total += c.precioTotal;
                resumen[c.producto].compradores.add(c.comprador);
            });

            const datosExcel = Object.entries(resumen).map(([producto, datos]) => ({
                Producto: producto,
                "Cantidad Vendida": datos.cantidad,
                Total: datos.total,
                Compradores: [...datos.compradores].join(', ')
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datosExcel);
            XLSX.utils.book_append_sheet(wb, ws, "Resumen por Producto");
            XLSX.writeFile(wb, "Resumen_Por_Producto.xlsx");
            mostrarToast('Resumen por producto exportado a Excel correctamente.', 'success');
        }

        // --- Funciones de Gráfico ---
        function actualizarGraficoVentasPorProducto() {
            const ctx = document.getElementById('graficoVentasPorProducto').getContext('2d');

            const ventasPorProducto = {};
            compras.forEach(c => {
                if (!ventasPorProducto[c.producto]) {
                    ventasPorProducto[c.producto] = 0;
                }
                ventasPorProducto[c.producto] += c.cantidad;
            });

            const productos = Object.keys(ventasPorProducto);
            const cantidades = Object.values(ventasPorProducto);

            if (graficoVentas) {
                graficoVentas.destroy();
            }

            // Obtener el color del tema actual
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

            graficoVentas = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: productos.map(p => escapeHtml(p)),
                    datasets: [{
                        label: 'Cantidad Vendida',
                        data: cantidades,
                        backgroundColor: accentColor + '80', // 80 = 50% de opacidad
                        borderColor: accentColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Vendidos: ${context.raw}`;
                                }
                            }
                        },
                        legend: {
                            display: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            formatter: (value) => value > 0 ? value : '',
                            color: '#000',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        // --- Funciones de Dashboard ---
        function actualizarDashboard() {
            // Métricas principales
            const totalVentas = compras.reduce((sum, c) => sum + c.precioTotal, 0);
            const productosVendidos = compras.reduce((sum, c) => sum + c.cantidad, 0);
            const compradoresActivos = [...new Set(compras.map(c => c.comprador))].length;

            // Producto más vendido
            const ventasPorProducto = {};
            compras.forEach(c => {
                ventasPorProducto[c.producto] = (ventasPorProducto[c.producto] || 0) + c.cantidad;
            });
            let productoMasVendido = '—';
            let maxVentas = 0;
            for (const [producto, cantidad] of Object.entries(ventasPorProducto)) {
                if (cantidad > maxVentas) {
                    maxVentas = cantidad;
                    productoMasVendido = producto;
                }
            }

            document.getElementById('totalVentasDashboard').textContent = `$${totalVentas.toFixed(2)}`;
            document.getElementById('productosVendidosDashboard').textContent = productosVendidos;
            document.getElementById('compradoresActivosDashboard').textContent = compradoresActivos;
            document.getElementById('productoMasVendidoDashboard').textContent = escapeHtml(productoMasVendido);

            // Gráfico de ventas por producto (Dashboard)
            actualizarGraficoVentasPorProductoDashboard();

            // Gráfico de ventas por día
            actualizarGraficoVentasPorDia();

            // Gráfico de top 5 productos
            actualizarGraficoTopProductos();

            // Gráfico de top 5 compradores
            actualizarGraficoTopCompradores();
        }

        function actualizarGraficoVentasPorProductoDashboard() {
            const ctx = document.getElementById('graficoVentasPorProductoDashboard').getContext('2d');

            const ventasPorProducto = {};
            compras.forEach(c => {
                if (!ventasPorProducto[c.producto]) {
                    ventasPorProducto[c.producto] = 0;
                }
                ventasPorProducto[c.producto] += c.precioTotal;
            });

            const productos = Object.keys(ventasPorProducto).slice(0, 5); // Top 5
            const totales = productos.map(p => ventasPorProducto[p]);

            if (graficoVentasDashboard) {
                graficoVentasDashboard.destroy();
            }

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

            graficoVentasDashboard = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: productos.map(p => escapeHtml(p)),
                    datasets: [{
                        data: totales,
                        backgroundColor: [
                            accentColor + '80',
                            '#05966980',
                            '#7c3aed80',
                            '#dc262680',
                            '#d9770680'
                        ],
                        borderColor: [
                            accentColor,
                            '#059669',
                            '#7c3aed',
                            '#dc2626',
                            '#d97706'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return percentage + '%';
                            },
                            color: '#fff',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        function actualizarGraficoVentasPorDia() {
            const ctx = document.getElementById('graficoVentasPorDia').getContext('2d');

            // Agrupar compras por día
            const ventasPorDia = {};
            compras.forEach(c => {
                const fecha = new Date(c.fecha);
                const dia = fecha.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
                ventasPorDia[dia] = (ventasPorDia[dia] || 0) + c.precioTotal;
            });

            const dias = Object.keys(ventasPorDia).sort();
            const totales = dias.map(dia => ventasPorDia[dia]);

            if (graficoVentasPorDia) {
                graficoVentasPorDia.destroy();
            }

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

            graficoVentasPorDia = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dias,
                    datasets: [{
                        label: 'Ventas por Día',
                        data: totales,
                        borderColor: accentColor,
                        backgroundColor: accentColor + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Total ($)'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `$${context.raw.toFixed(2)}`;
                                }
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        function actualizarGraficoTopProductos() {
            const ctx = document.getElementById('graficoTopProductos').getContext('2d');

            const ventasPorProducto = {};
            compras.forEach(c => {
                ventasPorProducto[c.producto] = (ventasPorProducto[c.producto] || 0) + c.cantidad;
            });

            // Ordenar por cantidad vendida (descendente) y tomar top 5
            const productosOrdenados = Object.entries(ventasPorProducto)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const productos = productosOrdenados.map(p => p[0]);
            const cantidades = productosOrdenados.map(p => p[1]);

            if (graficoTopProductos) {
                graficoTopProductos.destroy();
            }

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

            graficoTopProductos = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: productos.map(p => escapeHtml(p)),
                    datasets: [{
                        label: 'Cantidad Vendida',
                        data: cantidades,
                        backgroundColor: accentColor + '80',
                        borderColor: accentColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'right',
                            formatter: (value) => value,
                            color: '#000',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        function actualizarGraficoTopCompradores() {
            const ctx = document.getElementById('graficoTopCompradores').getContext('2d');

            const gastosPorComprador = {};
            compras.forEach(c => {
                gastosPorComprador[c.comprador] = (gastosPorComprador[c.comprador] || 0) + c.precioTotal;
            });

            // Ordenar por gasto (descendente) y tomar top 5
            const compradoresOrdenados = Object.entries(gastosPorComprador)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const compradores = compradoresOrdenados.map(c => c[0]);
            const totales = compradoresOrdenados.map(c => c[1]);

            if (graficoTopCompradores) {
                graficoTopCompradores.destroy();
            }

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

            graficoTopCompradores = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: compradores.map(c => escapeHtml(c)),
                    datasets: [{
                        label: 'Total Gastado ($)',
                        data: totales,
                        backgroundColor: accentColor + '80',
                        borderColor: accentColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Total ($)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'right',
                            formatter: (value) => `$${value.toFixed(2)}`,
                            color: '#000',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }

        // --- Funciones de Ruleta ---
