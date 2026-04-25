// Reemplaza TODO tu script.js con esto
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwxAMljQ3DjJbZoKTCdUF6UL9GZELfVdN0XErKStwymRhC7OyrOT1xZN-ZAtnGtlp7HGw/exec";
let parqueoData = [];
let nombreOperador = "";
let pinIngresado = "";

window.onload = async () => {
    // 1. Intentar recuperar la sesión guardada
    nombreOperador = sessionStorage.getItem('operador');
    pinIngresado = sessionStorage.getItem('pin');

    // 2. Si NO hay sesión guardada, pedir los datos
    if (!nombreOperador || !pinIngresado) {
        nombreOperador = prompt("Ingrese su nombre (Operador):");
        pinIngresado = prompt("Ingrese el PIN de seguridad:");

        if (!nombreOperador || !pinIngresado) {
            alert("Acceso denegado: Es necesario identificarse.");
            location.reload();
            return;
        }

        // Guardar en la memoria del navegador (se borra al cerrar la pestaña)
        sessionStorage.setItem('operador', nombreOperador);
        sessionStorage.setItem('pin', pinIngresado);
    }

    console.log(`👤 Sesión activa: ${nombreOperador}`);
    
    // Mostrar el nombre en la interfaz si tienes el elemento
    const elUser = document.getElementById('nombre-operador-display');
    if(elUser) elUser.innerText = nombreOperador;

    await loadData();
};

async function loadData() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_ESTADO", pin: pinIngresado })
        });
        const res = await response.json();
        if (res.status === "success") {
            parqueoData = res.datos.map(fila => ({
                id: fila[0], 
                ocupado: fila[1] === "OCUPADO",
                placa: fila[2] || "",
                propietario: fila[3] || "",
                operador: fila[4] || "",
                marca: fila[5] || "",
                contrato: fila[6] || ""
            }));
            renderGrid();
            updateStats();
        }
    } catch (e) { alert("Error al sincronizar datos."); }
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    if (id === 'ingreso') renderGrid();
}

function updateStats() {
    const oc = parqueoData.filter(p => p.ocupado).length;
    if(document.getElementById('stat-ocupados')) {
        document.getElementById('stat-ocupados').innerText = oc;
        document.getElementById('stat-libres').innerText = 100 - oc;
    }
}

function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id + (p.placa ? `\n${p.placa}` : "");
        div.onclick = () => p.ocupado ? registrarSalida(p) : irAIngreso(p.id);
        container.appendChild(div);
    });
}

function irAIngreso(id) {
    showSection('cobros');
    document.getElementById('puesto-num').value = id;
}

async function registrarSalida(p) {
    if (!confirm(`¿Liberar puesto ${p.id}?`)) return;
    const exito = await enviarAGoogle({ accion: "MOVIMIENTO", evento: "SALIDA", puesto: p.id, placa: p.placa });
    if (exito) loadData();
}

async function enviarAGoogle(datos) {
    try {
        // Siempre usamos las variables que ya tenemos en memoria
        const datosConSeguridad = {
            ...datos,
            pin: pinIngresado,
            operador: nombreOperador
        };

        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify(datosConSeguridad)
        });
        
        const res = await response.json();
        if (res.status === "error") {
            // Si el PIN falló en el servidor, borramos la sesión y pedimos de nuevo
            alert("❌ PIN Incorrecto. Por seguridad, identifíquese de nuevo.");
            sessionStorage.clear();
            location.reload();
            return false;
        }
        return true;
    } catch (err) { 
        console.error("Error nube:", err); 
        return false;
    }
}

document.getElementById('form-pago').onsubmit = async (e) => {
    e.preventDefault();
    const datos = {
        accion: "MOVIMIENTO",
        evento: "INGRESO",
        puesto: document.getElementById('puesto-num').value,
        placa: document.getElementById('placa-carro').value.toUpperCase(),
        propietario: document.getElementById('nombre-usuario').value,
        marca: document.getElementById('marca-carro').value,
        contrato: document.getElementById('tipo-contrato').value,
        fecha: new Date().toLocaleString()
    };
    if (await enviarAGoogle(datos)) {
        alert("✅ Ingreso guardado");
        e.target.reset();
        loadData();
        showSection('ingreso');
    }
};

// --- AUTOCOMPLETADO DEL FORMULARIO DE PAGOS ---
// Cuando el operador escribe un número de puesto, se busca en
// parqueoData (ya cargado desde Google Sheets) y se rellenan
// los campos de solo lectura automáticamente.
 
document.getElementById('pago-puesto-num').addEventListener('input', function () {
    const num = parseInt(this.value);
    const puesto = parqueoData.find(p => p.id === num);
 
    const campoPropietario = document.getElementById('pago-propietario');
    const campoPlaca       = document.getElementById('pago-placa');
    const campoModelo      = document.getElementById('pago-modelo');
 
    if (puesto && puesto.ocupado) {
        // Puesto encontrado y ocupado: rellenar con sus datos
        campoPropietario.value = puesto.propietario || "Sin nombre";
        campoPlaca.value       = puesto.placa       || "Sin placa";
        campoModelo.value      = puesto.marca       || "Sin modelo";
 
        // Resaltar en verde para indicar que encontró datos
        [campoPropietario, campoPlaca, campoModelo].forEach(c => {
            c.style.background = "#f0fff4";
            c.style.borderColor = "#27ae60";
        });
 
    } else {
        // Puesto no encontrado o está libre: limpiar campos
        campoPropietario.value = "";
        campoPlaca.value       = "";
        campoModelo.value      = "";
 
        // Volver al estilo neutral
        [campoPropietario, campoPlaca, campoModelo].forEach(c => {
            c.style.background = "#f0f4f8";
            c.style.borderColor = "#edf2f7";
        });
    }
});
 
 
// --- SUBMIT DEL FORMULARIO DE PAGOS ---
// Envía el registro de pago a Google Sheets (hoja "Control_Pagos")
// junto con los datos autocompletados del puesto.
 
document.getElementById('form-registro-pago').addEventListener('submit', async function (e) {
    e.preventDefault();
 
    const numPuesto = parseInt(document.getElementById('pago-puesto-num').value);
    const puesto    = parqueoData.find(p => p.id === numPuesto);
 
    // Validación: el puesto debe estar ocupado para registrar un pago
    if (!puesto || !puesto.ocupado) {
        alert("⚠️ El puesto ingresado no existe o está libre. Verificá el número.");
        return;
    }
 
    const datos = {
        accion:      "REGISTRAR_PAGO",
        puesto:      numPuesto,
        placa:       puesto.placa,
        propietario: puesto.propietario,
        modelo:      puesto.marca,
        fecha:       document.getElementById('fecha-pago').value,
        periodo:     document.getElementById('periodo-pago').value,
        monto:       document.getElementById('monto-pago').value,
        estatus:     "PAGADO"
    };
 
    const exito = await enviarAGoogle(datos);
 
    if (exito) {
        alert(`✅ Pago registrado para el puesto ${numPuesto} — ${puesto.propietario}`);
        this.reset();
        // Limpiar también los campos de solo lectura
        ['pago-propietario', 'pago-placa', 'pago-modelo'].forEach(id => {
            const el = document.getElementById(id);
            el.value = "";
            el.style.background   = "#f0f4f8";
            el.style.borderColor  = "#edf2f7";
        });
        cargarHistorialPagos(); // Refrescar la lista debajo del formulario
    }
});
 
 
// --- CARGAR HISTORIAL DE PAGOS ---
// Pide al servidor los últimos pagos registrados y los muestra
// en la lista #lista-historial-pagos.
 
async function cargarHistorialPagos() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({
                accion: "CARGAR_PAGOS",
                pin:    pinIngresado
            })
        });
        const res = await response.json();
 
        const lista = document.getElementById('lista-historial-pagos');
        lista.innerHTML = "";
 
        if (res.status === "success" && res.pagos.length > 0) {
            // Mostrar los últimos 20 pagos (los más recientes primero)
            res.pagos.slice(-20).reverse().forEach(fila => {
                // Orden columnas: Fecha, Puesto, Placa, Monto, Propietario, Operador, Periodo, Modelo, Estatus
                const [fecha, puesto, placa, monto, propietario, operador, periodo] = fila;
                const li = document.createElement('li');
                li.innerHTML = `
                    <span><strong>Puesto ${puesto}</strong> — ${propietario} (${placa})</span>
                    <span class="fecha-pago">${periodo} · ${fecha}</span>
                    <span class="monto-badge">$${parseFloat(monto).toFixed(2)}</span>
                `;
                lista.appendChild(li);
            });
        } else {
            lista.innerHTML = "<li style='padding:15px; color:#718096;'>No hay pagos registrados aún.</li>";
        }
 
    } catch (err) {
        console.error("Error cargando historial de pagos:", err);
    }
}
 