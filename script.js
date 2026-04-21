let parqueoData = [];
let historialPagos = [];
let historialMovimientos = JSON.parse(localStorage.getItem('historial_movimientos')) || [];

// 1. Cargar Datos
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
        parqueoData = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1, ocupado: false, placa: "", usuario: "", tipo: "", fecha: ""
        }));
    }
    renderGrid();
}

// 2. Guardar Local
function saveToLocal() {
    localStorage.setItem('parqueo_db', JSON.stringify(parqueoData));
    localStorage.setItem('historial_pagos', JSON.stringify(historialPagos));
    localStorage.setItem('historial_movimientos', JSON.stringify(historialMovimientos));
}

// 3. Navegación
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    if (id === 'estadisticas') updateStats();
    if (id === 'ingreso') renderGrid();
}

// 4. Mapa de Puestos
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
                const pass = prompt(`Contraseña para liberar puesto ${p.id}:`);
                if (pass === "1234") { 
                    if(confirm(`¿Confirmar salida de ${p.placa}?`)) {
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
                        p.placa = ""; p.usuario = ""; p.tipo = "";
                        saveToLocal();
                        renderGrid();
                    }
                }
            } else {
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}

// 5. Formulario Ingreso
document.getElementById('form-pago').onsubmit = (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('puesto-num').value);
    const placa = document.getElementById('placa-carro').value.toUpperCase();
    const nombre = document.getElementById('nombre-usuario').value;
    const contrato = document.getElementById('tipo-contrato').value;
    
    const idx = parqueoData.findIndex(p => p.id === id);
    if (idx !== -1 && !parqueoData[idx].ocupado) {
        parqueoData[idx] = { id, ocupado: true, placa, usuario: nombre, tipo: contrato, fecha: new Date().toLocaleDateString() };

        const registro = { fecha: new Date().toLocaleString(), evento: "INGRESO", puesto: id, placa, usuario: nombre };
        historialMovimientos.push(registro);
        enviarAGoogle(registro);

        saveToLocal();
        alert(`✅ Puesto ${id} asignado.`);
        e.target.reset();
        showSection('ingreso');
    }
};

// 7. Registro de Pagos
document.getElementById('form-registro-pago').onsubmit = (e) => {
    e.preventDefault();
    const pId = parseInt(document.getElementById('pago-puesto-num').value);
    const p = parqueoData.find(x => x.id === pId);
    
    if (!p || !p.ocupado) return alert("Puesto vacío");

    const fechaSel = document.getElementById('fecha-pago').value;
    const dt = new Date(fechaSel);
    const mesAno = `${dt.getMonth() + 1}-${dt.getFullYear()}`;

    const pago = {
        fechaOperacion: new Date().toLocaleString(),
        fechaReferencia: fechaSel,
        mesAno,
        puestoId: pId,
        placa: p.placa,
        dueño: p.usuario,
        periodo: document.getElementById('periodo-pago').value,
        monto: document.getElementById('monto-pago').value
    };

    historialPagos.push(pago);
    enviarAGoogle(pago);
    saveToLocal();
    actualizarListaPagos();
    alert("✅ Pago registrado.");
    e.target.reset();
};

// --- SINCRONIZACIÓN ---
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/https://script.google.com/macros/s/AKfycbxsiFIZtfEITwjDVNxarD1_Qe21-nfCs1zD7UUDs0iR9m-F8qtvYmiu6wvUn68K3Gue/exec";

async function enviarAGoogle(datos) {
    try {
        console.log("☁️ Enviando...", datos);
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(datos)
        });
    } catch (err) { console.error("Error nube:", err); }
}

function actualizarListaPagos() {
    const el = document.getElementById('lista-historial-pagos');
    if(el) el.innerHTML = historialPagos.map(p => `<li>Puesto ${p.puestoId}: $${p.monto}</li>`).reverse().join('');
}

function updateStats() {
    const oc = parqueoData.filter(p => p.ocupado).length;
    document.getElementById('stat-ocupados').innerText = oc;
    document.getElementById('stat-libres').innerText = 100 - oc;
}

loadData();