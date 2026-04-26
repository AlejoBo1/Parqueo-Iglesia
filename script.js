const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzi7c3UpWlTqcwbyuk9Lci3nJbsBtGl9pH_2ixrr3PPd_hWywLjlg6-Z557_yvpTD740g/exec";
let parqueoData = [];
let nombreOperador = "";
let pinIngresado = "";

window.onload = async () => {
    nombreOperador = sessionStorage.getItem('operador');
    pinIngresado   = sessionStorage.getItem('pin');

    if (!nombreOperador || !pinIngresado) {
        nombreOperador = prompt("Ingrese su nombre (Operador):");
        pinIngresado   = prompt("Ingrese el PIN de seguridad:");

        if (!nombreOperador || !pinIngresado) {
            alert("Acceso denegado: Es necesario identificarse.");
            location.reload();
            return;
        }

        sessionStorage.setItem('operador', nombreOperador);
        sessionStorage.setItem('pin', pinIngresado);
    }

    const elUser = document.getElementById('nombre-operador-display');
    if (elUser) elUser.innerText = nombreOperador;

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
                id:          fila[0],
                ocupado:     fila[1] === "OCUPADO",
                placa:       fila[2] || "",
                propietario: fila[3] || "",
                operador:    fila[4] || "",
                marca:       fila[5] || "",
                contrato:    fila[6] || ""
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
    if (id === 'registro-pagos') cargarHistorialPagos();
}

function updateStats() {
    const oc = parqueoData.filter(p => p.ocupado).length;
    if (document.getElementById('stat-ocupados')) {
        document.getElementById('stat-ocupados').innerText = oc;
        document.getElementById('stat-libres').innerText   = 100 - oc;
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
    const exito = await enviarAGoogle({
        accion: "MOVIMIENTO",
        evento: "SALIDA",
        puesto: p.id,
        placa:  p.placa,
        propietario: p.propietario
        // ✅ Sin fecha — la genera el servidor
    });
    if (exito) loadData();
}

async function enviarAGoogle(datos) {
    try {
        const datosConSeguridad = {
            ...datos,
            pin:      pinIngresado,
            operador: nombreOperador
            // ✅ Sin fecha aquí tampoco
        };

        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify(datosConSeguridad)
        });

        const res = await response.json();
        if (res.status === "error") {
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

// --- INGRESO DE VEHÍCULO ---
document.getElementById('form-pago').onsubmit = async (e) => {
    e.preventDefault();
    const datos = {
        accion:      "MOVIMIENTO",
        evento:      "INGRESO",
        puesto:      document.getElementById('puesto-num').value,
        placa:       document.getElementById('placa-carro').value.toUpperCase(),
        propietario: document.getElementById('nombre-usuario').value,
        marca:       document.getElementById('marca-carro').value,
        contrato:    document.getElementById('tipo-contrato').value
        // ✅ Sin fecha — la genera el servidor
    };
    if (await enviarAGoogle(datos)) {
        alert("✅ Ingreso guardado");
        e.target.reset();
        loadData();
        showSection('ingreso');
    }
};

// --- AUTOCOMPLETADO DEL FORMULARIO DE PAGOS ---
document.getElementById('pago-puesto-num').addEventListener('input', function () {
    const num    = parseInt(this.value);
    const puesto = parqueoData.find(p => p.id === num);

    const campoPropietario = document.getElementById('pago-propietario');
    const campoPlaca       = document.getElementById('pago-placa');
    const campoModelo      = document.getElementById('pago-modelo');

    if (puesto && puesto.ocupado) {
        campoPropietario.value = puesto.propietario || "Sin nombre";
        campoPlaca.value       = puesto.placa        || "Sin placa";
        campoModelo.value      = puesto.marca         || "Sin modelo";

        [campoPropietario, campoPlaca, campoModelo].forEach(c => {
            c.style.background   = "#f0fff4";
            c.style.borderColor  = "#27ae60";
        });
    } else {
        campoPropietario.value = "";
        campoPlaca.value       = "";
        campoModelo.value      = "";

        [campoPropietario, campoPlaca, campoModelo].forEach(c => {
            c.style.background  = "#f0f4f8";
            c.style.borderColor = "#edf2f7";
        });
    }
});

// --- REGISTRAR PAGO ---
document.getElementById('form-registro-pago').addEventListener('submit', async function (e) {
    e.preventDefault();

    const numPuesto = parseInt(document.getElementById('pago-puesto-num').value);
    const puesto    = parqueoData.find(p => p.id === numPuesto);

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
        periodo:     document.getElementById('periodo-pago').value,
        monto:       document.getElementById('monto-pago').value,
        // ✅ Sin fecha — la genera el servidor
    };

    if (await enviarAGoogle(datos)) {
        alert(`✅ Pago registrado — Puesto ${numPuesto} · ${puesto.propietario}`);
        this.reset();
        ['pago-propietario', 'pago-placa', 'pago-modelo'].forEach(id => {
            const el = document.getElementById(id);
            el.value            = "";
            el.style.background = "#f0f4f8";
            el.style.borderColor = "#edf2f7";
        });
        cargarHistorialPagos();
    }
});

// --- HISTORIAL DE PAGOS ---
async function cargarHistorialPagos() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_PAGOS", pin: pinIngresado })
        });
        const res = await response.json();

        const lista = document.getElementById('lista-historial-pagos');
        lista.innerHTML = "";

        if (res.status === "success" && res.pagos.length > 0) {
            res.pagos.slice(-20).reverse().forEach(fila => {
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