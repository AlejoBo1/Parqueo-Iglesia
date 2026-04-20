let parqueoData = [];
let historialPagos = [];
let historialMovimientos = JSON.parse(localStorage.getItem('historial_movimientos')) || [];

// 1. Cargar Datos iniciales
async function loadData() {
    const localData = localStorage.getItem('parqueo_db');
    const localHistorial = localStorage.getItem('historial_pagos');
    
    if (localHistorial) {
        historialPagos = JSON.parse(localHistorial);
        actualizarListaPagos();
    }

    if (localData) {
        parqueoData = JSON.parse(localData);
    } else {
        // Generar 100 puestos si no hay datos
        parqueoData = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            ocupado: false,
            placa: "",
            usuario: "",
            tipo: "",
            fecha: ""
        }));
    }

    // Asegurar que siempre haya 100 puestos
    if (parqueoData.length < 100) {
        for (let i = parqueoData.length + 1; i <= 100; i++) {
            parqueoData.push({ id: i, ocupado: false, placa: "", usuario: "", tipo: "", fecha: "" });
        }
    }
    
    saveToLocal();
    renderGrid();
}

// 2. Guardar en LocalStorage
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
        
        div.onclick = () => {
            if(p.ocupado) {
                const pass = prompt(`Para liberar el puesto ${p.id}, ingresa la contraseña:`);
                if (pass === "1234") { 
                    if(confirm(`¿Confirmar salida del vehículo ${p.placa}?`)) {
                        
                        const registroSalida = {
                            fecha: new Date().toLocaleString(),
                            evento: "SALIDA",
                            puesto: p.id,
                            placa: p.placa,
                            usuario: p.usuario
                        };

                        historialMovimientos.push(registroSalida);
                        enviarAGoogle(registroSalida);
                        
                        p.ocupado = false;
                        p.placa = "";
                        p.usuario = "";
                        p.tipo = "";
                                            
                        saveToLocal();
                        renderGrid();
                        actualizarTablaMovimientos();
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

    if (index !== -1 && !parqueoData[index].ocupado) {
        parqueoData[index] = {
            id: id,
            ocupado: true,
            placa: placa,
            usuario: nombre,
            tipo: contrato,
            fecha: new Date().toLocaleDateString()
        };

        const registroIngreso = {
            fecha: new Date().toLocaleString(),
            evento: "INGRESO",
            puesto: id,
            placa: placa,
            usuario: nombre
        };

        historialMovimientos.push(registroIngreso);
        enviarAGoogle(registroIngreso);

        saveToLocal();
        alert(`✅ Puesto ${id} asignado correctamente.`);
        e.target.reset();
        showSection('ingreso');
    } else {
        alert("⚠️ El puesto está ocupado o no existe.");
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
}

// 7. Registro de Cobros Periódicos
document.getElementById('form-registro-pago').onsubmit = (e) => {
    e.preventDefault();
    
    const puestoId = parseInt(document.getElementById('pago-puesto-num').value);
    const fechaSeleccionada = document.getElementById('fecha-pago').value;
    const periodo = document.getElementById('periodo-pago').value;
    const monto = document.getElementById('monto-pago').value;

    const puesto = parqueoData.find(p => p.id === puestoId);
    if (!puesto || !puesto.ocupado) {
        alert("❌ Error: El puesto está vacío.");
        return;
    }

    const fechaDt = new Date(fechaSeleccionada);
    const mesAno = `${fechaDt.getMonth() + 1}-${fechaDt.getFullYear()}`;

    if (historialPagos.some(p => p.puestoId === puestoId && p.periodo === periodo && p.mesAno === mesAno)) {
        alert(`⚠️ Ya existe este pago para ${mesAno}.`);
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
    enviarAGoogle(nuevoPago);
    saveToLocal();
    actualizarListaPagos();
    alert(`✅ Pago registrado.`);
    e.target.reset();
};

// --- FUNCIONES DE APOYO ---
function actualizarListaPagos() {
    const lista = document.getElementById('lista-historial-pagos');
    if(!lista) return;
    lista.innerHTML = historialPagos.map(p => `
        <li>
            <strong>Puesto ${p.puestoId}</strong> — $${p.monto} (${p.periodo})
            <br><small>${p.fechaOperacion}</small>
        </li>
    `).reverse().join('');
}

function actualizarTablaMovimientos() {
    console.log("Tabla de movimientos actualizada localmente.");
}

// ⚠️ REEMPLAZA ESTO CON TU URL REAL DE GOOGLE APPS SCRIPT
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbx-knKGVIje3zAypWqX0chJdRUZZ1lCOWmX8qSysMkumfCNK9w2w_rfg4ZmhxYj5d3b/exec"; 

async function enviarAGoogle(datos) {
    // Verificamos que la URL no esté vacía
    if (!URL_GOOGLE_SCRIPT || URL_GOOGLE_SCRIPT.includes("TU_URL_AQUI")) {
        console.warn("⚠️ No se ha configurado la URL de Google Sheets.");
        return;
    }

    try {
        console.log("📤 Intentando enviar datos a la nube...", datos);
        
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            mode: 'no-cors', // Necesario para Google Apps Script
            cache: 'no-cache',
            body: JSON.stringify(datos)
        });

        console.log("✅ Solicitud enviada a Google Sheets");
    } catch (e) {
        console.error("❌ Error de red al intentar sincronizar:", e);
    }
}

// --- INICIO DE LA APLICACIÓN ---
async function iniciarApp() {
    await loadData();
    const inputFecha = document.getElementById('fecha-pago');
    if(inputFecha) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }
    console.log("🚀 Aplicación iniciada");
}

iniciarApp();