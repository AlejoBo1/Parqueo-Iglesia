let parqueoData = [];
let historialPagos = [];

// Definimos el historial de movimientos de forma global una sola vez
let historialMovimientos = JSON.parse(localStorage.getItem('historial_movimientos')) || [];

// 1. Cargar Datos iniciales (Puestos e Historial)
async function loadData() {
    const localData = localStorage.getItem('parqueo_db');
    const localHistorial = localStorage.getItem('historial_pagos');
    
    // Cargar historial si existe
    if (localHistorial) {
        historialPagos = JSON.parse(localHistorial);
        actualizarListaPagos(); // ¡Esta era la función que faltaba abajo!
    }

    // Cargar puestos
    if (localData) {
        parqueoData = JSON.parse(localData);
    } else {
        try {
            const response = await fetch('data.json');
            parqueoData = await response.json();
        } catch (e) {
            console.warn("No se pudo cargar data.json, generando datos iniciales...");
            parqueoData = [];
        }
    }

    // Asegurar que siempre haya 100 puestos con todas sus propiedades
    if (parqueoData.length < 100) {
        for (let i = parqueoData.length + 1; i <= 100; i++) {
            parqueoData.push({ 
                id: i, 
                ocupado: false, 
                placa: "", 
                usuario: "", 
                tipo: "", 
                fecha: "" 
            });
        }
    }
    
    saveToLocal();
    renderGrid();
}

// 2. Guardar en LocalStorage (Versión única y correcta)
function saveToLocal() {
    localStorage.setItem('parqueo_db', JSON.stringify(parqueoData));
    localStorage.setItem('historial_pagos', JSON.stringify(historialPagos));
    localStorage.setItem('historial_movimientos', JSON.stringify(historialMovimientos));
}

// 3. Cambiar de sección
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    if (id === 'estadisticas') updateStats();
    if (id === 'ingreso') renderGrid();
}

// 4. Dibujar el mapa de puestos
function renderGrid() {
    const container = document.getElementById('grid-container');
    if(!container) return;
    container.innerHTML = '';
    
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id;
        div.title = p.ocupado ? `PLACA: ${p.placa} | Dueño: ${p.usuario}` : 'Puesto Libre';
        
        div.onclick = () => {
            if(p.ocupado) {
                const pass = prompt(`Para liberar el puesto ${p.id}, ingresa la contraseña:`);
                
                if (pass === "1234") { 
                    if(confirm(`¿Confirmar salida del vehículo ${p.placa}?`)) {
                        
                        // Registro de Auditoría (SALIDA)
                        historialMovimientos.push({
                            fecha: new Date().toLocaleString(),
                            evento: "SALIDA",
                            puesto: p.id,
                            placa: p.placa,
                            usuario: p.usuario
                        });
                        
                        p.ocupado = false;
                        p.placa = "";
                        p.usuario = "";
                        p.tipo = "";
                        
                        saveToLocal();
                        renderGrid();
                        // Importante: Si tienes la tabla en el HTML, actualízala aquí
                        if (typeof actualizarTablaMovimientos === "function") {
                            actualizarTablaMovimientos(); 
                        }
                        alert("✅ Salida registrada exitosamente.");
                    }
                } else if (pass !== null) {
                    alert("❌ Contraseña incorrecta.");
                }
            } else {
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}

// 5. Manejar el formulario de ingreso inicial
document.getElementById('form-pago').onsubmit = (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('puesto-num').value);
    const placa = document.getElementById('placa-carro').value.toUpperCase();
    const nombre = document.getElementById('nombre-usuario').value;
    const contrato = document.getElementById('tipo-contrato').value;
    
    const index = parqueoData.findIndex(p => p.id === id);

    if (index !== -1) {
        if (parqueoData[index].ocupado) {
            alert("⚠️ Error: Este puesto ya está ocupado.");
            return;
        }

        parqueoData[index] = {
            id: id,
            ocupado: true,
            placa: placa,
            usuario: nombre,
            tipo: contrato,
            fecha: new Date().toLocaleDateString()
        };

        historialMovimientos.push({
            fecha: new Date().toLocaleString(),
            evento: "INGRESO",
            puesto: id,
            placa: placa,
            usuario: nombre
        });

        saveToLocal();
        alert(`✅ Puesto ${id} asignado correctamente.`);
        e.target.reset();
        showSection('ingreso');
    }
};

// 6. Actualizar Estadísticas
function updateStats() {
    const ocupados = parqueoData.filter(p => p.ocupado).length;
    const ingresosEstimados = parqueoData.reduce((total, p) => {
        if (!p.ocupado) return total;
        return total + (p.tipo === 'Mensual' ? 50 : 25);
    }, 0);

    document.getElementById('stat-ocupados').innerText = ocupados;
    document.getElementById('stat-libres').innerText = 100 - ocupados;
    document.getElementById('stat-ingresos').innerText = ingresosEstimados;
    
    document.getElementById('json-preview').innerText = JSON.stringify(parqueoData.filter(p => p.ocupado), null, 2);
}

// 7. Registro de Cobros Periódicos
document.getElementById('form-registro-pago').onsubmit = (e) => {
    e.preventDefault();
    
    const puestoId = parseInt(document.getElementById('pago-puesto-num').value);
    const fechaSeleccionada = document.getElementById('fecha-pago').value; // YYYY-MM-DD
    const periodo = document.getElementById('periodo-pago').value;
    const monto = document.getElementById('monto-pago').value;

    // 1. Validar que el puesto exista y esté ocupado
    const puesto = parqueoData.find(p => p.id === puestoId);
    if (!puesto || !puesto.ocupado) {
        alert("❌ Error: El puesto está vacío o no existe.");
        return;
    }

    const fechaDt = new Date(fechaSeleccionada);
    const mesAno = `${fechaDt.getMonth() + 1}-${fechaDt.getFullYear()}`;

    const yaExistePago = historialPagos.some(p => 
        p.puestoId === puestoId && 
        p.periodo === periodo && 
        p.mesAno === mesAno
    );

    if (yaExistePago) {
        alert(`⚠️ El puesto ${puestoId} ya tiene un registro de "${periodo}" para este mes (${mesAno}). No se puede duplicar.`);
        return; 
    }

    const nuevoPago = {
        fechaOperacion: new Date().toLocaleString(),
        fechaReferencia: fechaSeleccionada,          
        mesAno: mesAno,                              
        puestoId: puestoId,
        placa: puesto.placa,
        dueño: puesto.usuario,
        periodo: periodo,
        monto: monto
    };

    historialPagos.push(nuevoPago);
    saveToLocal();
    
    alert(`✅ Pago registrado exitosamente para la placa ${puesto.placa}`);
    actualizarListaPagos();
    e.target.reset();
};


// --- FUNCIONES DE APOYO ---

// ¡ESTA ES LA FUNCIÓN QUE SE HABÍA BORRADO!
function actualizarListaPagos() {
    const lista = document.getElementById('lista-historial-pagos');
    if(!lista) return;

    lista.innerHTML = historialPagos.map(p => `
        <li>
            <div>
                <span class="fecha-pago">${p.fechaOperacion}</span><br>
                <strong>Puesto ${p.puestoId}</strong> — ${p.placa} (${p.dueño})
            </div>
            <div>
                <small style="color: #666; margin-right: 10px;">${p.periodo}</small>
                <span class="monto-badge">$${p.monto}</span>
            </div>
        </li>
    `).reverse().join('');
}

function actualizarTablaMovimientos() {
    // Por ahora solo loguea
    console.log("Actualizando tabla de movimientos...");
}

// --- INICIO DE LA APLICACIÓN ---

async function iniciarApp() {
    await loadData();

    const inputFecha = document.getElementById('fecha-pago');
    if(inputFecha) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }
    
    actualizarTablaMovimientos();
    console.log("🚀 Aplicación iniciada correctamente");
}

// Ejecutamos el inicio
iniciarApp();