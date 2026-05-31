// ============================================================
// ruleta.js — Ruletas reescritas con giro real de la rueda
// ============================================================

        function cargarColoresRuleta() {
            const containerCompartidas = document.getElementById('colorOptionsRifaCompartidas');
            containerCompartidas.innerHTML = '';
            coloresRuleta.forEach((color) => {
                const div = document.createElement('div');
                div.className = `color-option ${color === ruletaColorCompartidas ? 'selected' : ''}`;
                div.style.backgroundColor = color;
                div.title = color;
                div.onclick = () => {
                    ruletaColorCompartidas = color;
                    localStorage.setItem('ruletaColorCompartidas', color);
                    guardarDatos();
                    renderRuletaCircular();
                    document.querySelectorAll('#colorOptionsRifaCompartidas .color-option').forEach(d => d.classList.remove('selected'));
                    div.classList.add('selected');
                };
                containerCompartidas.appendChild(div);
            });

            const containerCompras = document.getElementById('colorOptionsRifaCompras');
            containerCompras.innerHTML = '';
            coloresRuleta.forEach((color) => {
                const div = document.createElement('div');
                div.className = `color-option ${color === ruletaColorCompras ? 'selected' : ''}`;
                div.style.backgroundColor = color;
                div.title = color;
                div.onclick = () => {
                    ruletaColorCompras = color;
                    localStorage.setItem('ruletaColorCompras', color);
                    guardarDatos();
                    renderRuletaCircularCompras();
                    document.querySelectorAll('#colorOptionsRifaCompras .color-option').forEach(d => d.classList.remove('selected'));
                    div.classList.add('selected');
                };
                containerCompras.appendChild(div);
            });
        }

        function agregarParticipante() {
            const n = document.getElementById('nombreParticipante').value.trim();
            if (!n) return mostrarToast('Ingrese el nombre del participante.', 'error');
            if (participantes.includes(n)) {
                mostrarToast('Este participante ya está en la ruleta.', 'error');
                return;
            }
            participantes.push(escapeHtml(n));
            document.getElementById('nombreParticipante').value = '';
            renderRuleta();
            renderRuletaCircular();
            guardarDatosConDebounce();
            mostrarToast('Participante agregado correctamente.', 'success');
        }

        function renderRuleta() {
            const ul = document.getElementById('listaParticipantes');
            if (!ul) return;
            ul.innerHTML = '';
            participantes.forEach((p, i) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${p}</span>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="editarParticipante(${i})" class="btn-secondary btn-sm">${idiomas[idiomaActual].txtEditar}</button>
                        <button onclick="eliminarParticipante(${i})" class="btn-danger btn-sm">${idiomas[idiomaActual].txtEliminar}</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            document.getElementById('listaParticipantesContainer').style.display = participantes.length > 0 ? 'block' : 'none';
        }

        // Dibuja la ruleta usando Canvas para un giro real y correcto
        function renderRuletaCircular() {
            const canvas = document.getElementById('ruleta-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const cx = size / 2, cy = size / 2, r = size / 2 - 4;

            ctx.clearRect(0, 0, size, size);

            if (participantes.length === 0) {
                ctx.fillStyle = 'var(--text-muted)';
                ctx.font = `${size * 0.06}px DM Sans, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#888';
                ctx.fillText('Agrega participantes', cx, cy);
                return;
            }

            const n = participantes.length;
            const arc = (2 * Math.PI) / n;
            const startOffset = -Math.PI / 2; // Empezar desde arriba

            participantes.forEach((p, i) => {
                const startAngle = startOffset + i * arc;
                const endAngle = startAngle + arc;
                const color = coloresRuleta[i % coloresRuleta.length];

                // Sector
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Texto
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + arc / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 4;
                const maxLen = 14;
                const label = p.length > maxLen ? p.substring(0, maxLen) + '…' : p;
                const fontSize = Math.max(10, Math.min(16, size * 0.038));
                ctx.font = `bold ${fontSize}px DM Sans, sans-serif`;
                ctx.fillText(label, r - 10, 0);
                ctx.restore();
            });

            // Borde exterior
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = ruletaColorCompartidas;
            ctx.lineWidth = 6;
            ctx.stroke();

            // Centro
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.06, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = ruletaColorCompartidas;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function renderRuletaCircularCompras() {
            const canvas = document.getElementById('ruleta-canvas-compras');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const cx = size / 2, cy = size / 2, r = size / 2 - 4;

            ctx.clearRect(0, 0, size, size);

            if (rifaCompras.length === 0) {
                ctx.fillStyle = '#888';
                ctx.font = `${size * 0.06}px DM Sans, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('No hay compras', cx, cy);
                return;
            }

            const n = rifaCompras.length;
            const arc = (2 * Math.PI) / n;
            const startOffset = -Math.PI / 2;

            rifaCompras.forEach((p, i) => {
                const startAngle = startOffset + i * arc;
                const endAngle = startAngle + arc;
                const color = coloresRuleta[i % coloresRuleta.length];

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + arc / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 4;
                const maxLen = 14;
                const label = p.length > maxLen ? p.substring(0, maxLen) + '…' : p;
                const fontSize = Math.max(10, Math.min(16, size * 0.038));
                ctx.font = `bold ${fontSize}px DM Sans, sans-serif`;
                ctx.fillText(label, r - 10, 0);
                ctx.restore();
            });

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = ruletaColorCompras;
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.06, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = ruletaColorCompras;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function editarParticipante(i) {
            const nuevoNombre = prompt(idiomas[idiomaActual].txtEditarParticipante, participantes[i]);
            if (!nuevoNombre || nuevoNombre.trim() === '') return;
            if (participantes.includes(nuevoNombre.trim()) && nuevoNombre.trim() !== participantes[i]) {
                mostrarToast('Este participante ya está en la ruleta.', 'error');
                return;
            }
            participantes[i] = escapeHtml(nuevoNombre.trim());
            renderRuleta();
            renderRuletaCircular();
            guardarDatosConDebounce();
            mostrarToast('Participante actualizado correctamente.', 'success');
        }

        function eliminarParticipante(i) {
            if (!confirm(idiomas[idiomaActual].txtConfirmarEliminarParticipante)) return;
            participantes.splice(i, 1);
            renderRuleta();
            renderRuletaCircular();
            guardarDatosConDebounce();
            mostrarToast('Participante eliminado correctamente.', 'success');
        }

        // Variable para almacenar la rotación actual de cada ruleta
        let ruletaAngle = 0;
        let ruletaAngleCompras = 0;

        function spinRoulette(res) {
            if (!participantes.length) return mostrarToast(idiomas[idiomaActual].txtNoParticipantesRuleta, 'error');

            const canvas = document.getElementById('ruleta-canvas');
            const duracion = 4000;
            const n = participantes.length;
            const arc = 360 / n;

            // Elegir al ganador ANTES de girar
            const selectedIndex = Math.floor(Math.random() * n);

            // Ángulo necesario para que el sector selectedIndex quede bajo el puntero (arriba, 0°)
            // Sector i empieza en i*arc grados desde -90° (top)
            // Para que el sector selectedIndex quede en la parte superior: rotación final = -(selectedIndex * arc + arc/2)
            const targetSectorCenter = selectedIndex * arc + arc / 2;
            const extraSpins = 5 * 360; // 5 vueltas completas
            const finalAngle = ruletaAngle + extraSpins + (360 - (ruletaAngle % 360) - targetSectorCenter + 360) % 360;

            document.getElementById('btnGana').disabled = true;
            document.getElementById('btnPierde').disabled = true;
            document.getElementById('btnLimpiarRifa').disabled = true;

            const startTime = performance.now();
            const startAngle = ruletaAngle;
            const totalRotation = finalAngle - startAngle;

            function easeOut(t) {
                return 1 - Math.pow(1 - t, 4);
            }

            function animate(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duracion, 1);
                const currentAngle = startAngle + totalRotation * easeOut(progress);
                ruletaAngle = currentAngle;

                // Dibujar la ruleta girada
                drawRuletaWithRotation(canvas, participantes, ruletaColorCompartidas, currentAngle);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    ruletaAngle = finalAngle % 360;
                    const ganador = participantes[selectedIndex];

                    const msg = document.getElementById('mensajeRifa');
                    msg.style.display = 'flex';
                    if (res === 'gana') {
                        msg.innerHTML = `
                            <span style="color: var(--success); font-size: 1.4rem;">🎉 ${escapeHtml(idiomas[idiomaActual].txtFelicidades)}</span>
                            <strong style="margin: 6px 0;">${escapeHtml(idiomas[idiomaActual].txtGanadorRuleta)}</strong>
                            <span style="color: ${ruletaColorCompartidas}; font-size: 1.3rem; font-weight: bold;">${escapeHtml(ganador)}</span>
                        `;
                    } else {
                        msg.innerHTML = `
                            <span style="color: var(--danger); font-size: 1.4rem;">😔 ${escapeHtml(idiomas[idiomaActual].txtPierdeRuleta)}</span>
                            <span style="color: ${ruletaColorCompartidas}; font-size: 1.2rem; font-weight: bold;">${escapeHtml(ganador)}</span>
                            <small style="font-size:0.95rem; color:var(--text-secondary);">${escapeHtml(idiomas[idiomaActual].txtSigueParticipando)}</small>
                        `;
                    }

                    participantes.splice(selectedIndex, 1);
                    ruletaAngle = 0;
                    renderRuleta();
                    renderRuletaCircular();
                    guardarDatosConDebounce();

                    document.getElementById('btnGana').disabled = false;
                    document.getElementById('btnPierde').disabled = false;
                    document.getElementById('btnLimpiarRifa').disabled = false;
                }
            }

            requestAnimationFrame(animate);
        }

        function spinRouletteCompras(res) {
            if (!rifaCompras.length) return mostrarToast(idiomas[idiomaActual].txtNoParticipantesRuleta, 'error');

            const canvas = document.getElementById('ruleta-canvas-compras');
            const duracion = 4000;
            const n = rifaCompras.length;
            const arc = 360 / n;

            const selectedIndex = Math.floor(Math.random() * n);
            const targetSectorCenter = selectedIndex * arc + arc / 2;
            const extraSpins = 5 * 360;
            const finalAngle = ruletaAngleCompras + extraSpins + (360 - (ruletaAngleCompras % 360) - targetSectorCenter + 360) % 360;

            document.getElementById('btnGiraGana').disabled = true;
            document.getElementById('btnGiraPierde').disabled = true;
            document.getElementById('btnLimpiarRifaCompras').disabled = true;

            const startTime = performance.now();
            const startAngle = ruletaAngleCompras;
            const totalRotation = finalAngle - startAngle;

            function easeOut(t) {
                return 1 - Math.pow(1 - t, 4);
            }

            function animate(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duracion, 1);
                const currentAngle = startAngle + totalRotation * easeOut(progress);
                ruletaAngleCompras = currentAngle;

                drawRuletaWithRotation(canvas, rifaCompras, ruletaColorCompras, currentAngle);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    ruletaAngleCompras = finalAngle % 360;
                    const ganador = rifaCompras[selectedIndex];

                    const msg = document.getElementById('mensajeRifaCompras');
                    msg.style.display = 'flex';
                    if (res === 'gana') {
                        msg.innerHTML = `
                            <span style="color: var(--success); font-size: 1.4rem;">🎉 ${escapeHtml(idiomas[idiomaActual].txtFelicidades)}</span>
                            <strong style="margin: 6px 0;">${escapeHtml(idiomas[idiomaActual].txtGanadorRuleta)}</strong>
                            <span style="color: ${ruletaColorCompras}; font-size: 1.3rem; font-weight: bold;">${escapeHtml(ganador)}</span>
                        `;
                    } else {
                        msg.innerHTML = `
                            <span style="color: var(--danger); font-size: 1.4rem;">😔 ${escapeHtml(idiomas[idiomaActual].txtPierdeRuleta)}</span>
                            <span style="color: ${ruletaColorCompras}; font-size: 1.2rem; font-weight: bold;">${escapeHtml(ganador)}</span>
                            <small style="font-size:0.95rem; color:var(--text-secondary);">${escapeHtml(idiomas[idiomaActual].txtSigueParticipando)}</small>
                        `;
                    }

                    rifaCompras.splice(selectedIndex, 1);
                    ruletaAngleCompras = 0;
                    renderRifaCompras();
                    renderRuletaCircularCompras();
                    guardarDatosConDebounce();

                    document.getElementById('btnGiraGana').disabled = false;
                    document.getElementById('btnGiraPierde').disabled = false;
                    document.getElementById('btnLimpiarRifaCompras').disabled = false;
                }
            }

            requestAnimationFrame(animate);
        }

        // Función reutilizable para dibujar la ruleta con rotación
        function drawRuletaWithRotation(canvas, items, accentColor, angleDeg) {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const cx = size / 2, cy = size / 2, r = size / 2 - 4;

            ctx.clearRect(0, 0, size, size);

            if (!items || items.length === 0) return;

            const n = items.length;
            const arc = (2 * Math.PI) / n;
            const rotRad = (angleDeg * Math.PI) / 180;
            const startOffset = -Math.PI / 2 + rotRad;

            items.forEach((p, i) => {
                const startAngle = startOffset + i * arc;
                const endAngle = startAngle + arc;
                const color = coloresRuleta[i % coloresRuleta.length];

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + arc / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 4;
                const maxLen = 14;
                const label = p.length > maxLen ? p.substring(0, maxLen) + '…' : p;
                const fontSize = Math.max(10, Math.min(16, size * 0.038));
                ctx.font = `bold ${fontSize}px DM Sans, sans-serif`;
                ctx.fillText(label, r - 10, 0);
                ctx.restore();
            });

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.06, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function limpiarRifa() {
            if (!confirm(idiomas[idiomaActual].txtConfirmarLimpiarRuleta)) return;
            participantes = [];
            ruletaAngle = 0;
            renderRuleta();
            renderRuletaCircular();
            const msg = document.getElementById('mensajeRifa');
            msg.style.display = 'none';
            msg.textContent = '';
            guardarDatosConDebounce();
            mostrarToast('Ruleta limpiada correctamente.', 'success');
        }

        function actualizarRifaCompras() {
            rifaCompras = [];
            compras.forEach(c => {
                for (let i = 0; i < c.cantidad; i++) {
                    rifaCompras.push(escapeHtml(c.comprador));
                }
            });
            ruletaAngleCompras = 0;
            renderRuletaCircularCompras();
        }

        function renderRifaCompras() {
            const ul = document.getElementById('listaRifaCompras');
            if (!ul) return;
            ul.innerHTML = '';
            rifaCompras.forEach(n => {
                const li = document.createElement('li');
                li.textContent = n;
                ul.appendChild(li);
            });
            document.getElementById('listaRifaComprasContainer').style.display = rifaCompras.length > 0 ? 'block' : 'none';
        }

        function limpiarRifaCompras() {
            if (!confirm(idiomas[idiomaActual].txtConfirmarLimpiarRuletaCompras)) return;
            rifaCompras = [];
            ruletaAngleCompras = 0;
            renderRifaCompras();
            renderRuletaCircularCompras();
            const msg = document.getElementById('mensajeRifaCompras');
            msg.style.display = 'none';
            msg.textContent = '';
            guardarDatosConDebounce();
            mostrarToast('Ruleta de compras limpiada correctamente.', 'success');
        }

        // --- Funciones de Cuenta ---
