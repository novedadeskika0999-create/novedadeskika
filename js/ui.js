// ============================================================
// ui.js — Toast, tema, modo oscuro, idioma, pestañas, modales
// ============================================================

        function mostrarToast(mensaje, tipo = 'success', duracion = 5000) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast toast-${tipo}`;
            toast.innerHTML = `
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${mensaje}</span>
                <button onclick="this.parentElement.style.animation='slideOut 0.3s ease-out'; setTimeout(() => this.parentElement.remove(), 300);" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, duracion);
        }

        // --- Funciones de Tema ---
        function toggleTheme() {
            isDarkMode = !isDarkMode;
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i> <span id="txtModoClaro">' + idiomas[idiomaActual].txtModoClaro + '</span>';
            } else {
                document.documentElement.removeAttribute('data-theme');
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i> <span id="txtModoOscuro">' + idiomas[idiomaActual].txtModoOscuro + '</span>';
            }
            localStorage.setItem('darkMode', isDarkMode);
            guardarDatosConDebounce();
        }

        function toggleMenu() {
            document.querySelector('nav ul').classList.toggle('active');
        }

        function cambiarTema(tema, silencioso = false) {
            temaActual = tema;
            localStorage.setItem('tema', tema);

            // Remover clases de tema anteriores
            document.documentElement.classList.remove('tema-default', 'tema-green', 'tema-purple', 'tema-red', 'tema-orange', 'tema-pink', 'tema-yellow', 'tema-cyan', 'tema-gray');

            // Aplicar nuevo tema
            document.documentElement.classList.add(`tema-${tema}`);

            // Actualizar el pointer de la ruleta
            const pointers = document.querySelectorAll('.pointer');
            pointers.forEach(pointer => {
                pointer.style.borderBottomColor = `var(--accent)`;
            });

            if (!silencioso) mostrarToast('Tema cambiado correctamente.', 'success');
            if (!silencioso) guardarDatosConDebounce();
        }

        // --- Funciones de Idioma ---
        function cambiarIdioma(idioma, silencioso = false) {
            idiomaActual = idioma;
            const tx = idiomas[idioma];
            for (const key in tx) {
                const el = document.getElementById(key);
                if (el) el.textContent = tx[key];
            }
            // Actualizar botones y elementos dinámicos con data-i18n
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (tx[key]) el.textContent = tx[key];
            });
            // Actualizar placeholders con data-i18n-placeholder
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (tx[key]) el.placeholder = tx[key];
            });
            // Refrescar tablas y listas dinámicas
            if (typeof actualizarTablaLogistica === 'function') actualizarTablaLogistica();
            if (typeof actualizarTablaCompras === 'function') actualizarTablaCompras();
            if (typeof actualizarTablaCuentas === 'function') actualizarTablaCuentas();
            if (typeof actualizarResumenCompradoras === 'function') actualizarResumenCompradoras();
            if (typeof renderRuleta === 'function') renderRuleta();
            if (typeof renderRifaCompras === 'function') renderRifaCompras();
            // Actualizar el toggle de tema
            if (isDarkMode) {
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i> <span id="txtModoClaro">' + tx.txtModoClaro + '</span>';
            } else {
                document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i> <span id="txtModoOscuro">' + tx.txtModoOscuro + '</span>';
            }
            if (!silencioso) guardarDatos();
            if (!silencioso) mostrarToast('Idioma cambiado a ' + (idioma === 'es' ? 'Español' : idioma === 'en' ? 'English' : 'Français'), 'info');
        }

        // --- Funciones de Guardado y Carga ---

        function cambiarPestana(id) {
            // Guardar scroll position de la pestaña actual
            const currentTab = document.querySelector('.tab-content.active');
            if (currentTab) {
                localStorage.setItem(`scroll-${currentTab.id}`, currentTab.scrollTop);
            }

            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('nav li a').forEach(a => a.classList.remove('active-tab'));
            const navEl = document.getElementById('nav-' + id);
            if (navEl) navEl.classList.add('active-tab');

            // Restaurar scroll position de la nueva pestaña
            const savedScroll = localStorage.getItem(`scroll-${id}`);
            if (savedScroll) {
                document.getElementById(id).scrollTop = savedScroll;
            }

            if (id === 'cuenta') actualizarTablaCuentas();
            if (id === 'resumenCompradoras') {
                actualizarResumenPorProducto();
                actualizarGraficoVentasPorProducto();
            }
            if (id === 'dashboard') {
                actualizarDashboard();
            }
        }

        // --- Funciones de Autocompletar ---
        let nombresCompradores = [];
        let selectedCompradorIndex = -1;


        function openTemplateModal() {
            document.getElementById('templateModal').classList.add('active');
        }

        function closeTemplateModal() {
            document.getElementById('templateModal').classList.remove('active');
        }

        function selectTemplate() {
            localStorage.setItem('selectedTemplate', selectedTemplate);
            guardarDatos();
            closeTemplateModal();
            mostrarToast('Plantilla seleccionada correctamente.', 'success');
        }

        function openTemplatePreviewModal() {
            cargarVistaPreviaPlantillas();
            document.getElementById('templatePreviewModal').classList.add('active');
            // Mostrar la vista previa de la plantilla seleccionada actualmente
            mostrarVistaPreviaPlantilla(selectedTemplate);
            // Seleccionar la plantilla actual en el selector
            document.querySelectorAll('#templatePreviewSelector .template-card').forEach((card, index) => {
                const templateKey = Object.keys(plantillasFactura)[index];
                if (templateKey === selectedTemplate) {
                    card.classList.add('selected');
                }
            });
        }

        function closeTemplatePreviewModal() {
            document.getElementById('templatePreviewModal').classList.remove('active');
        }

        function selectTemplateFromPreview() {
            localStorage.setItem('selectedTemplate', selectedTemplate);
            guardarDatos();
            closeTemplatePreviewModal();
            mostrarToast('Plantilla seleccionada correctamente.', 'success');
        }

        // --- Funciones de Secuencia de Factura ---

        function openManualModal() {
            document.getElementById('manualModal').classList.add('active');
        }

        function closeManualModal() {
            document.getElementById('manualModal').classList.remove('active');
        }

        // --- Funciones de HDMI Display ---
        // HDMI Display eliminado — función vacía para compatibilidad
        function actualizarHDMIDisplay() { }

        // --- Funciones de Logo ---
