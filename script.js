// Reemplaza TODO tu script.js con esto
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzLuRbxYBRbljg0I5MSCKMUTXCCXBFaV0GVRuXHemMgAl6qERt_QSpDaejX62HGhrCMqA/exec";
let parqueoData = [];
let nombreOperador = "";
let pinIngresado = "";

window.onload = async () => {
    nombreOperador = prompt("Nombre del Operador:");
    pinIngresado = prompt("PIN de Seguridad:");
    if (!nombreOperador || !pinIngresado) return location.reload();
    
    // Mostrar operador en el header (opcional)
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
    const res = await fetch(URL_GOOGLE_SCRIPT, {
        method: 'POST',
        body: JSON.stringify({ ...datos, pin: pinIngresado, operador: nombreOperador })
    });
    const json = await res.json();
    return json.status === "success";
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