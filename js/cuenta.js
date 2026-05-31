// ============================================================
// cuenta.js — Descarga de cuentas PDF, plantillas, secuencia de factura,
//             descarga masiva, WhatsApp, manual de usuario
// ============================================================

// Función para escapar HTML (evitar XSS)
function escapeHtml(unsafe) {
    return unsafe
        ? unsafe.toString()
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;")
        : "";
}

// Función para actualizar la tabla de cuentas
function actualizarTablaCuentas() {
    const tbody = document.getElementById('tbodyCuentas');
    tbody.innerHTML = '';

    [...new Set(compras.map(c => c.comprador))].forEach(nombre => {
        const comprasDeCompradora = compras.filter(c => c.comprador === nombre);
        const total = comprasDeCompradora.reduce((s, c) => s + (c.precioTotal || c.precio * c.cantidad), 0);
        const row = document.createElement('tr');
        const descargada = cuentasGeneradas.includes(nombre);

        row.innerHTML = `
            <td>${escapeHtml(nombre)}</td>
            <td>$${total.toFixed(2)}</td>
            <td>${
                descargada
                    ? `<span class="badge badge-green">${escapeHtml(idiomas[idiomaActual].txtSi)}</span>`
                    : `<span class="badge badge-red">${escapeHtml(idiomas[idiomaActual].txtNo)}</span>`
            }</td>
            <td>
                <button onclick="descargarCuenta('${escapeHtml(nombre)}')" class="btn-primary btn-sm">
                    <i class="fas fa-file-pdf"></i> ${escapeHtml(idiomas[idiomaActual].txtDescargar)}
                </button>
                <button onclick="enviarCuentaPorWhatsApp('${escapeHtml(nombre)}')" class="btn-success btn-sm">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </td>`;
        tbody.appendChild(row);
    });
}

// Función para buscar cuentas
function buscarCuenta() {
    const nombre = document.getElementById('buscadorCuenta').value.trim();
    if (!nombre) return mostrarToast(idiomas[idiomaActual].txtIngreseNombreCompradora, 'error');
    descargarCuenta(nombre);
}

// Función para convertir hex a rgb
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

// Función para descargar la cuenta en PDF
function descargarCuenta(nombre) {
    const comprasDeCompradora = compras.filter(c => c.comprador === nombre);
    if (!comprasDeCompradora.length) {
        mostrarToast(idiomas[idiomaActual].txtNoComprasCompradora, 'error');
        return;
    }

    if (cuentasGeneradas.includes(nombre) && !confirm(idiomas[idiomaActual].txtCuentaYaGenerada)) return;

    const plantilla = plantillasFactura[selectedTemplate];
    const img = logoHeader ? new Image() : null;

    if (img) {
        img.crossOrigin = 'Anonymous';
        img.onload = () => generarPdfCuenta(nombre, comprasDeCompradora, img, plantilla);
        img.onerror = () => generarPdfCuenta(nombre, comprasDeCompradora, null, plantilla);
        img.src = logoHeader;
    } else {
        generarPdfCuenta(nombre, comprasDeCompradora, null, plantilla);
    }
}

// Función para generar el PDF de la cuenta
function generarPdfCuenta(nombre, comprasCliente, imgLogo, plantilla) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuración de la plantilla
    const primaryColor = plantilla.colores.primary;
    const secondaryColor = plantilla.colores.secondary;
    const textColor = plantilla.colores.text;
    const backgroundColor = plantilla.colores.background;

    // Establecer colores según el estilo
    if (plantilla.showBorders) {
        doc.setDrawColor(...hexToRgb(plantilla.borderColor));
        doc.setLineWidth(plantilla.borderWidth);
    }

    // Encabezado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(primaryColor));
    doc.text('Novedades Kika', plantilla.titlePosition.x, plantilla.titlePosition.y, null, null, 'center');

    if (imgLogo) {
        doc.addImage(imgLogo, 'JPEG', 
            plantilla.logoPosition.x, 
            plantilla.logoPosition.y, 
            plantilla.logoPosition.width, 
            plantilla.logoPosition.height
        );
    }

    // Información de la factura
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(textColor));
    
    const fechaActual = new Date().toLocaleDateString('es-ES');
    const numeroFactura = secuenciaFactura + numeroFacturaActual;

    doc.text(`Factura #: ${numeroFactura}`, 20, plantilla.tableStartY - 30);
    doc.text(`Fecha: ${fechaActual}`, 20, plantilla.tableStartY - 20);
    doc.text(`Compradora: ${escapeHtml(nombre)}`, 20, plantilla.tableStartY - 10);

    // Tabla de productos
    const body = comprasCliente.map(c => [
        escapeHtml(c.producto),
        escapeHtml(c.especificacion || '—'),
        escapeHtml(c.tamano),
        `$${(c.precio || 0).toFixed(2)}`,
        c.cantidad.toString(),
        `$${((c.precio || 0) * c.cantidad).toFixed(2)}`
    ]);

    // Estilo de la tabla según la plantilla
    let headStyles = {
        fillColor: hexToRgb(plantilla.colores.tableHeader),
        textColor: 255,
        fontStyle: 'bold'
    };

    let bodyStyles = {
        textColor: hexToRgb(plantilla.colores.tableText)
    };

    // Para plantillas con colores alternados en filas
    if (plantilla.colores.rowColors) {
        bodyStyles = {
            textColor: hexToRgb(plantilla.colores.tableText),
            fillColor: (rowIndex) => hexToRgb(plantilla.colores.rowColors[rowIndex % 2])
        };
    }

    // Para plantillas sin bordes
    if (!plantilla.showBorders) {
        doc.autoTable({
            startY: plantilla.tableStartY,
            head: [['Producto', 'Especificación', 'Tamaño', 'Precio Unit.', 'Cant.', 'Subtotal']],
            body: body,
            styles: {
                fontSize: 10,
                cellPadding: 2,
                halign: 'left',
                lineColor: hexToRgb(backgroundColor),
                lineWidth: 0
            },
            headStyles: headStyles,
            bodyStyles: bodyStyles
        });
    } else {
        // Para plantillas con bordes
        doc.autoTable({
            startY: plantilla.tableStartY,
            head: [['Producto', 'Especificación', 'Tamaño', 'Precio Unit.', 'Cant.', 'Subtotal']],
            body: body,
            styles: {
                fontSize: 10,
                cellPadding: 2,
                halign: 'left',
                lineColor: hexToRgb(plantilla.borderColor),
                lineWidth: plantilla.borderWidth
            },
            headStyles: headStyles,
            bodyStyles: bodyStyles
        });
    }

    // Totales
    const total = comprasCliente.reduce((s, c) => s + (c.precioTotal || c.precio * c.cantidad), 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(textColor));
    
    const finalY = doc.lastAutoTable.finalY;
    
    // Diferentes estilos según la plantilla
    if (plantilla.estilo === 'corporativa' || plantilla.estilo === 'profesional') {
        // Estilo corporativo: caja alrededor del total
        doc.setDrawColor(...hexToRgb(primaryColor));
        doc.setLineWidth(0.5);
        doc.rect(20, finalY + 10, 170, 20);
        doc.text(`Total a pagar: $${total.toFixed(2)}`, 25, finalY + 20);
    } else if (plantilla.estilo === 'colorido') {
        // Estilo colorido: total con color
        doc.setTextColor(...hexToRgb(plantilla.colores.primary));
        doc.setFontSize(14);
        doc.text(`Total a pagar: $${total.toFixed(2)}`, 20, finalY + 20);
        doc.setTextColor(...hexToRgb(textColor));
        doc.setFontSize(12);
    } else {
        // Estilo estándar
        doc.text(`Total a pagar: $${total.toFixed(2)}`, 20, finalY + 20);
    }

    // Notas
    const notas = comprasCliente.map(c => c.notas).filter(n => n).join(' | ');
    if (notas) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Notas: ${notas}`, 20, finalY + 30);
    }

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...hexToRgb(plantilla.colores.footer));
    doc.text('Gracias por su compra!', 105, doc.internal.pageSize.height - 20, null, null, 'center');
    doc.text('Novedades Kika - Plataforma de gestión de compras', 105, doc.internal.pageSize.height - 15, null, null, 'center');

    // Guardar el PDF
    doc.save(`${escapeHtml(nombre)}_Factura_${numeroFactura}.pdf`);
    
    // Incrementar el número de factura
    numeroFacturaActual++;
    localStorage.setItem('numeroFacturaActual', numeroFacturaActual);
    
    // Marcar como generada
    if (!cuentasGeneradas.includes(nombre)) {
        cuentasGeneradas.push(nombre);
        guardarDatosConDebounce();
        actualizarTablaCuentas();
        actualizarResumenCompradoras();
    }
    
    mostrarToast('Cuenta generada correctamente.', 'success');
}

// Función para enviar la cuenta por WhatsApp
function enviarCuentaPorWhatsApp(nombre) {
    const comprasDeCompradora = compras.filter(c => c.comprador === nombre);
    if (!comprasDeCompradora.length) {
        mostrarToast(idiomas[idiomaActual].txtNoComprasCompradora, 'error');
        return;
    }

    // Número fijo para enviar las cuentas
    const telefono = '5636685728';
    
    // Generar el PDF
    const plantilla = plantillasFactura[selectedTemplate];
    const img = logoHeader ? new Image() : null;

    if (img) {
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Configuración de la plantilla
            const primaryColor = plantilla.colores.primary;
            const textColor = plantilla.colores.text;

            // Encabezado
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...hexToRgb(primaryColor));
            doc.text('Novedades Kika', plantilla.titlePosition.x, plantilla.titlePosition.y, null, null, 'center');

            if (imgLogo) {
                doc.addImage(img, 'JPEG', 
                    plantilla.logoPosition.x, 
                    plantilla.logoPosition.y, 
                    plantilla.logoPosition.width, 
                    plantilla.logoPosition.height
                );
            }

            // Información de la factura
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...hexToRgb(textColor));
            
            const fechaActual = new Date().toLocaleDateString('es-ES');
            const numeroFactura = secuenciaFactura + numeroFacturaActual;

            doc.text(`Factura #: ${numeroFactura}`, 20, plantilla.tableStartY - 30);
            doc.text(`Fecha: ${fechaActual}`, 20, plantilla.tableStartY - 20);
            doc.text(`Compradora: ${escapeHtml(nombre)}`, 20, plantilla.tableStartY - 10);

            // Tabla de productos
            const body = comprasDeCompradora.map(c => [
                escapeHtml(c.producto),
                escapeHtml(c.especificacion || '—'),
                escapeHtml(c.tamano),
                `$${(c.precio || 0).toFixed(2)}`,
                c.cantidad.toString(),
                `$${((c.precio || 0) * c.cantidad).toFixed(2)}`
            ]);

            let headStyles = {
                fillColor: hexToRgb(plantilla.colores.tableHeader),
                textColor: 255,
                fontStyle: 'bold'
            };

            let bodyStyles = {
                textColor: hexToRgb(plantilla.colores.tableText)
            };

            if (plantilla.colores.rowColors) {
                bodyStyles = {
                    textColor: hexToRgb(plantilla.colores.tableText),
                    fillColor: (rowIndex) => hexToRgb(plantilla.colores.rowColors[rowIndex % 2])
                };
            }

            if (!plantilla.showBorders) {
                doc.autoTable({
                    startY: plantilla.tableStartY,
                    head: [['Producto', 'Especificación', 'Tamaño', 'Precio Unit.', 'Cant.', 'Subtotal']],
                    body: body,
                    styles: {
                        fontSize: 10,
                        cellPadding: 2,
                        halign: 'left',
                        lineColor: hexToRgb(backgroundColor),
                        lineWidth: 0
                    },
                    headStyles: headStyles,
                    bodyStyles: bodyStyles
                });
            } else {
                doc.autoTable({
                    startY: plantilla.tableStartY,
                    head: [['Producto', 'Especificación', 'Tamaño', 'Precio Unit.', 'Cant.', 'Subtotal']],
                    body: body,
                    styles: {
                        fontSize: 10,
                        cellPadding: 2,
                        halign: 'left',
                        lineColor: hexToRgb(plantilla.borderColor),
                        lineWidth: plantilla.borderWidth
                    },
                    headStyles: headStyles,
                    bodyStyles: bodyStyles
                });
            }

            // Totales
            const total = comprasDeCompradora.reduce((s, c) => s + (c.precioTotal || c.precio * c.cantidad), 0);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...hexToRgb(textColor));
            
            const finalY = doc.lastAutoTable.finalY;
            
            if (plantilla.estilo === 'corporativa' || plantilla.estilo === 'profesional') {
                doc.setDrawColor(...hexToRgb(primaryColor));
                doc.setLineWidth(0.5);
                doc.rect(20, finalY + 10, 170, 20);
                doc.text(`Total a pagar: $${total.toFixed(2)}`, 25, finalY + 20);
            } else if (plantilla.estilo === 'colorido') {
                doc.setTextColor(...hexToRgb(plantilla.colores.primary));
                doc.setFontSize(14);
                doc.text(`Total a pagar: $${total.toFixed(2)}`, 20, finalY + 20);
                doc.setTextColor(...hexToRgb(textColor));
                doc.setFontSize(12);
            } else {
                doc.text(`Total a pagar: $${total.toFixed(2)}`, 20, finalY + 20);
            }

            // Notas
            const notas = comprasDeCompradora.map(c => c.notas).filter(n => n).join(' | ');
            if (notas) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Notas: ${notas}`, 20, finalY + 30);
            }

            // Pie de página
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...hexToRgb(plantilla.colores.footer));
            doc.text('Gracias por su compra!', 105, doc.internal.pageSize.height - 20, null, null, 'center');
            doc.text('Novedades Kika - Plataforma de gestión de compras', 105, doc.internal.pageSize.height - 15, null, null, 'center');

            // Guardar el PDF temporalmente
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Crear mensaje para WhatsApp
            const mensaje = encodeURIComponent(`Hola ${escapeHtml(nombre)}, aquí tienes tu factura de Novedades Kika. Total: $${total.toFixed(2)}`);
            
            // Abrir WhatsApp con el mensaje
            window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
            
            // Descargar el PDF automáticamente
            doc.save(`${escapeHtml(nombre)}_Factura_${numeroFactura}.pdf`);
            
            // Incrementar el número de factura
            numeroFacturaActual++;
            localStorage.setItem('numeroFacturaActual', numeroFacturaActual);
            
            // Marcar como generada
            if (!cuentasGeneradas.includes(nombre)) {
                cuentasGeneradas.push(nombre);
                guardarDatosConDebounce();
                actualizarTablaCuentas();
                actualizarResumenCompradoras();
            }
            
            mostrarToast('Se abrió WhatsApp. Adjunte manualmente el PDF que se descargó.', 'info', 8000);
        };
        img.onerror = () => {
            // Si no hay logo, generar sin logo
            generarPdfCuenta(nombre, comprasDeCompradora, null, plantilla);
            const total = comprasDeCompradora.reduce((s, c) => s + (c.precioTotal || c.precio * c.cantidad), 0);
            const mensaje = encodeURIComponent(`Hola ${escapeHtml(nombre)}, aquí tienes tu factura de Novedades Kika. Total: $${total.toFixed(2)}`);
            window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
            mostrarToast('Se abrió WhatsApp. Adjunte manualmente el PDF que se descargó.', 'info', 8000);
        };
        img.src = logoHeader;
    } else {
        // Si no hay logo, generar sin logo
        generarPdfCuenta(nombre, comprasDeCompradora, null, plantilla);
        const total = comprasDeCompradora.reduce((s, c) => s + (c.precioTotal || c.precio * c.cantidad), 0);
        const mensaje = encodeURIComponent(`Hola ${escapeHtml(nombre)}, aquí tienes tu factura de Novedades Kika. Total: $${total.toFixed(2)}`);
        window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
        mostrarToast('Se abrió WhatsApp. Adjunte manualmente el PDF que se descargó.', 'info', 8000);
    }
}

// --- Funciones de Plantillas de Factura ---
function cargarPlantillasFactura() {
    const selector = document.getElementById('templateSelector');
    selector.innerHTML = '';

    for (const [key, plantilla] of Object.entries(plantillasFactura)) {
        const card = document.createElement('div');
        card.className = `template-card ${selectedTemplate === key ? 'selected' : ''}`;
        card.onclick = () => {
            document.querySelectorAll('#templateSelector .template-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedTemplate = key;
        };

        card.innerHTML = `
            <div style="background: ${plantilla.colores.primary}; height: 100%; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <i class="fas fa-file-invoice" style="font-size: 2rem; color: white;"></i>
            </div>
            <h4>${plantilla.nombre}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">${plantilla.descripcion}</p>
        `;

        selector.appendChild(card);
    }
}

function cargarVistaPreviaPlantillas() {
    const selector = document.getElementById('templatePreviewSelector');
    selector.innerHTML = '';

    for (const [key, plantilla] of Object.entries(plantillasFactura)) {
        const card = document.createElement('div');
        card.className = `template-card ${selectedTemplate === key ? 'selected' : ''}`;
        card.onclick = () => {
            document.querySelectorAll('#templatePreviewSelector .template-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedTemplate = key;
            mostrarVistaPreviaPlantilla(key);
        };

        card.innerHTML = `
            <div style="background: ${plantilla.colores.background || '#fff'}; border-radius: 6px; padding: 8px; margin-bottom: 8px; border: 1px solid ${plantilla.colores.tableBorder || '#e5e7eb'}; min-height: 80px; overflow: hidden;">
                <div style="background: ${plantilla.colores.primary}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.6rem; font-weight: bold; margin-bottom: 5px;">Novedades Kika</div>
                <div style="display:flex; gap:3px; margin-bottom:4px;">
                    <div style="flex:1; background:${plantilla.colores.tableHeader}; height:9px; border-radius:2px;"></div>
                    <div style="flex:1; background:${plantilla.colores.tableHeader}; height:9px; border-radius:2px; opacity:0.7;"></div>
                    <div style="flex:1; background:${plantilla.colores.tableHeader}; height:9px; border-radius:2px; opacity:0.4;"></div>
                </div>
                ${plantilla.colores.rowColors ?
                    `<div style="background:\${plantilla.colores.rowColors[0]}; height:6px; border-radius:2px; margin-bottom:2px;"></div>
                     <div style="background:\${plantilla.colores.rowColors[1]}; height:6px; border-radius:2px; margin-bottom:2px;"></div>
                     <div style="background:\${plantilla.colores.rowColors[0]}; height:6px; border-radius:2px;"></div>` :
                    `<div style="background:\${plantilla.colores.tableBorder}; height:6px; border-radius:2px; margin-bottom:2px; opacity:0.35;"></div>
                     <div style="background:\${plantilla.colores.tableBorder}; height:6px; border-radius:2px; margin-bottom:2px; opacity:0.25;"></div>
                     <div style="background:\${plantilla.colores.tableBorder}; height:6px; border-radius:2px; opacity:0.15;"></div>`
                }
                <div style="text-align:right; margin-top:4px; font-size:0.58rem; font-weight:bold; color:\${plantilla.colores.primary};">Total: $350</div>
            </div>
            <h4 style="font-size:0.82rem; margin-bottom:2px;">${plantilla.nombre}</h4>
            <p style="font-size: 0.7rem; color: var(--text-muted); line-height:1.3;">${plantilla.descripcion}</p>
        `;

        selector.appendChild(card);
    }
}

function mostrarVistaPreviaPlantilla(templateKey) {
    const plantilla = plantillasFactura[templateKey];
    const previewContainer = document.getElementById('templatePreviewContainer');
    
    const primaryColor = plantilla.colores.primary;
    const backgroundColor = plantilla.colores.background;
    const textColor = plantilla.colores.text;
    const tableHeaderColor = plantilla.colores.tableHeader;
    const tableTextColor = plantilla.colores.tableText;
    
    let borderStyle = 'none';
    if (plantilla.showBorders) {
        borderStyle = `1px solid ${plantilla.borderColor}`;
    }

    previewContainer.innerHTML = `
        <div style="background: ${backgroundColor}; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; margin-top: 20px; box-shadow: var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div style="background: ${primaryColor}; color: white; padding: 10px 20px; border-radius: var(--radius); display: inline-block; margin-bottom: 10px; font-size: 1.2rem; font-weight: bold;">
                        Novedades Kika
                    </div>
                    <div style="color: ${textColor}; margin-bottom: 5px;">
                        <strong>Factura #:</strong> ${plantilla.estilo === 'corporativa' ? 'INV-2024-001' : 'FACT-1'}
                    </div>
                    <div style="color: ${textColor}; margin-bottom: 5px;">
                        <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}
                    </div>
                    <div style="color: ${textColor};">
                        <strong>Compradora:</strong> Ejemplo Cliente
                    </div>
                </div>
                <div style="background: ${primaryColor}; width: ${plantilla.logoPosition.width * 2}px; height: ${plantilla.logoPosition.height * 2}px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: white;">
                    <i class="fas fa-image" style="font-size: 1.5rem;"></i>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: white;">
                <thead>
                    <tr style="background-color: ${tableHeaderColor}; color: white;">
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Producto</th>
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Especificación</th>
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Tamaño</th>
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Precio Unit.</th>
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Cant.</th>
                        <th style="padding: 10px; text-align: left; border: ${borderStyle};">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="${plantilla.colores.rowColors ? `background-color: ${plantilla.colores.rowColors[0]};` : ''}">
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Producto Ejemplo 1</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Rojo</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Mediano</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">$100.00</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">2</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">$200.00</td>
                    </tr>
                    <tr style="${plantilla.colores.rowColors ? `background-color: ${plantilla.colores.rowColors[1]};` : ''}">
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Producto Ejemplo 2</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Azul</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">Grande</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">$150.00</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">1</td>
                        <td style="padding: 10px; border: ${borderStyle}; color: ${tableTextColor};">$150.00</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="text-align: right; margin-bottom: 20px;">
                ${plantilla.estilo === 'corporativa' ? 
                    `<div style="border: 2px solid ${primaryColor}; padding: 10px; display: inline-block;">` : ''}
                <p style="color: ${textColor}; font-size: 1.1rem; font-weight: bold;">
                    <strong>Total a pagar:</strong> $350.00
                </p>
                ${plantilla.estilo === 'corporativa' ? `</div>` : ''}
            </div>
            
            <p style="text-align: center; font-style: italic; color: ${plantilla.colores.footer};">
                Gracias por su compra!<br>
                <small>Novedades Kika - Plataforma de gestión de compras</small>
            </p>
            
            <div style="margin-top: 20px; padding: 15px; background: var(--surface-2); border-radius: var(--radius);">
                <h4 style="margin-bottom: 10px; color: var(--text-primary);">Características de esta plantilla:</h4>
                <ul style="color: var(--text-secondary); font-size: 0.9rem; padding-left: 20px;">
                    <li><strong>Estilo:</strong> ${plantilla.estilo}</li>
                    <li><strong>Color principal:</strong> ${primaryColor}</li>
                    <li><strong>Color de texto:</strong> ${textColor}</li>
                    <li><strong>Bordes:</strong> ${plantilla.showBorders ? 'Sí' : 'No'}</li>
                    ${plantilla.colores.rowColors ? `<li><strong>Filas con colores alternados:</strong> Sí</li>` : ''}
                    ${plantilla.estilo === 'corporativa' ? `<li><strong>Diseño:</strong> Corporativo con bordes destacados</li>` : ''}
                    ${plantilla.estilo === 'colorido' ? `<li><strong>Diseño:</strong> Colorido con múltiples colores</li>` : ''}
                </ul>
            </div>
        </div>
    `;
}

// --- Funciones de Secuencia de Factura ---
function cargarEjemplosSecuencia() {
    const container = document.getElementById('ejemplosSecuencia');
    container.innerHTML = '';
    
    ejemplosSecuencia.forEach(ejemplo => {
        const div = document.createElement('div');
        div.className = 'ejemplo-secuencia';
        div.textContent = ejemplo;
        div.onclick = () => {
            document.getElementById('secFacturaPrefijo').value = ejemplo;
            generarEjemploSecuencia();
        };
        container.appendChild(div);
    });
}

function openSecFacturaModal() {
    document.getElementById('secFacturaModal').classList.add('active');
}

function closeSecFacturaModal() {
    document.getElementById('secFacturaModal').classList.remove('active');
}

function generarEjemploSecuencia() {
    const prefijo = document.getElementById('secFacturaPrefijo').value;
    const ejemplo = document.getElementById('ejemploSecuencia');
    ejemplo.textContent = `Ejemplo: ${prefijo}${numeroFacturaActual}`;
}

function guardarSecuenciaFactura() {
    const prefijo = document.getElementById('secFacturaPrefijo').value.trim();
    if (!prefijo) {
        mostrarToast('Ingrese un prefijo para la secuencia.', 'error');
        return;
    }
    
    secuenciaFactura = prefijo;
    localStorage.setItem('secuenciaFactura', secuenciaFactura);
    guardarDatos();
    closeSecFacturaModal();
    mostrarToast(idiomas[idiomaActual].txtSecuenciaGuardada, 'success');
}

function eliminarSecuenciaFactura() {
    if (!confirm('¿Está seguro de eliminar la secuencia actual?')) return;
    
    secuenciaFactura = 'FACT-';
    numeroFacturaActual = 1;
    localStorage.setItem('secuenciaFactura', secuenciaFactura);
    localStorage.setItem('numeroFacturaActual', numeroFacturaActual);
    guardarDatos();
    
    document.getElementById('secFacturaPrefijo').value = secuenciaFactura;
    generarEjemploSecuencia();
    
    closeSecFacturaModal();
    mostrarToast(idiomas[idiomaActual].txtSecuenciaEliminada, 'success');
}

// --- Funciones de Manual de Usuario ---
function cargarManualUsuario() {
    const manualContent = document.getElementById('manualContent');
    
    manualContent.innerHTML = `
        <div class="manual-section">
            <h3><i class="fas fa-info-circle" style="margin-right: 8px;"></i>Introducción</h3>
            <p>Bienvenido a <strong>Novedades Kika</strong>, una plataforma completa para la gestión de logística, compras y facturación.</p>
            <p>Esta aplicación te permite:</p>
            <ul>
                <li>Registrar y gestionar productos en inventario</li>
                <li>Realizar compras y registrar pagos</li>
                <li>Generar facturas profesionales en PDF</li>
                <li>Realizar sorteos con la ruleta</li>
                <li>Visualizar estadísticas y resúmenes de ventas</li>
                <li>Enviar facturas por WhatsApp</li>
                <li>Configurar secuencias personalizadas para facturas</li>
            </ul>
        </div>

        <div class="manual-section">
            <h3><i class="fas fa-file-invoice" style="margin-right: 8px;"></i>Cuenta de Compradoras</h3>
            <p>Para generar facturas:</p>
            <ol>
                <li>Selecciona una compradora del buscador o de la lista.</li>
                <li>Haz clic en "Descargar Cuenta" para generar el PDF.</li>
                <li>Selecciona una plantilla de factura (opcional).</li>
                <li>Para enviar por WhatsApp, haz clic en el botón correspondiente.</li>
                <li>Configura la secuencia de facturas en el botón "Configurar Secuencia".</li>
            </ol>
            <p><strong>Nota:</strong> Las facturas se guardan como PDF y pueden enviarse por WhatsApp al número 5636685728.</p>
        </div>
    `;
}

// Inicializar la tabla al cargar la página
window.onload = function() {
    actualizarTablaCuentas();
};