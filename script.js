// https://script.google.com/macros/s/AKfycbzd0q3aMajWrmEaJ6_pTvqsnv3_lzifT35C8sqEISETavzOc45q3-VZTltMcQYMM8yAuA/exec

const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbzd0q3aMajWrmEaJ6_pTvqsnv3_lzifT35C8sqEISETavzOc45q3-VZTltMcQYMM8yAuA/exec";
const TOTAL_PUESTOS = 109; // ← Cambiar este numero si el parqueo crece
let parqueoData = [];
let nombreOperador = "";
let pinIngresado = "";

// ============================================================
// AUTENTICACIÓN CON MODAL
// ============================================================
const MAX_INTENTOS = 3;
const BLOQUEO_MINUTOS = 5;
let intentosFallidos = 0;

window.onload = () => {
    const bloqueadoHasta = sessionStorage.getItem('bloqueadoHasta');
    if (bloqueadoHasta && Date.now() < parseInt(bloqueadoHasta)) {
        mostrarBloqueo(parseInt(bloqueadoHasta));
        return;
    }

    nombreOperador = sessionStorage.getItem('operador');
    pinIngresado   = sessionStorage.getItem('pin');

    if (nombreOperador && pinIngresado) {
        abrirSistema();
    }
};

function mostrarError(mensaje) {
    const el = document.getElementById('auth-error');
    el.textContent = mensaje;
    el.style.display = 'block';
    const input = document.getElementById('auth-pin');
    input.style.borderColor = '#e74c3c';
    input.value = '';
    input.focus();
}

function mostrarBloqueo(hasta) {
    const btn        = document.getElementById('auth-btn');
    const errorEl    = document.getElementById('auth-error');
    const intentosEl = document.getElementById('auth-intentos');

    btn.disabled = true;
    btn.style.background = '#95a5a6';
    btn.style.cursor = 'not-allowed';
    document.getElementById('auth-nombre').disabled = true;
    document.getElementById('auth-pin').disabled = true;

    const intervalo = setInterval(() => {
        const restante = Math.ceil((hasta - Date.now()) / 1000);
        if (restante <= 0) {
            clearInterval(intervalo);
            sessionStorage.removeItem('bloqueadoHasta');
            intentosFallidos = 0;
            btn.disabled = false;
            btn.style.background = '#3498db';
            btn.style.cursor = 'pointer';
            document.getElementById('auth-nombre').disabled = false;
            document.getElementById('auth-pin').disabled = false;
            errorEl.style.display = 'none';
            intentosEl.textContent = '';
        } else {
            const mins = Math.floor(restante / 60);
            const segs = restante % 60;
            errorEl.style.display = 'block';
            errorEl.textContent = `🔒 Acceso bloqueado`;
            intentosEl.textContent = `Podés intentar de nuevo en ${mins}:${String(segs).padStart(2,'0')}`;
        }
    }, 1000);
}

async function intentarAcceso() {
    const nombre = document.getElementById('auth-nombre').value.trim();
    const pin    = document.getElementById('auth-pin').value.trim();
    const btn    = document.getElementById('auth-btn');

    if (!nombre) {
        mostrarError('⚠️ Ingresá tu nombre para continuar.');
        document.getElementById('auth-nombre').focus();
        return;
    }
    if (!pin) {
        mostrarError('⚠️ Ingresá el PIN de seguridad.');
        document.getElementById('auth-pin').focus();
        return;
    }

    btn.textContent = 'Verificando...';
    btn.disabled = true;
    btn.style.background = '#95a5a6';

    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_ESTADO", pin: pin })
        });
        const res = await response.json();

        if (res.status === "success") {
            sessionStorage.setItem('operador', nombre);
            sessionStorage.setItem('pin', pin);
            nombreOperador = nombre;
            pinIngresado   = pin;

            parqueoData = res.datos.map(fila => ({
                id:          fila[0],
                ocupado:     fila[1] === "OCUPADO",
                placa:       fila[2] || "",
                propietario: fila[3] || "",
                operador:    fila[4] || "",
                marca:       fila[5] || "",
                contrato:    fila[6] || "",
                telefono:    fila[7] || ""
            }));

            abrirSistema();

        } else {
            intentosFallidos++;
            const restantes = MAX_INTENTOS - intentosFallidos;

            if (intentosFallidos >= MAX_INTENTOS) {
                const hasta = Date.now() + (BLOQUEO_MINUTOS * 60 * 1000);
                sessionStorage.setItem('bloqueadoHasta', hasta);
                mostrarBloqueo(hasta);
            } else {
                mostrarError(`❌ PIN incorrecto. Te quedan ${restantes} intento${restantes !== 1 ? 's' : ''}.`);
                document.getElementById('auth-intentos').textContent =
                    `Intento ${intentosFallidos} de ${MAX_INTENTOS}`;
                btn.textContent = 'Ingresar al Sistema';
                btn.disabled = false;
                btn.style.background = '#3498db';
            }
        }
    } catch (err) {
        mostrarError('⚠️ Error de conexión. Verificá tu internet.');
        btn.textContent = 'Ingresar al Sistema';
        btn.disabled = false;
        btn.style.background = '#3498db';
    }
}

function abrirSistema() {
    document.getElementById('modal-auth').style.display = 'none';
    document.getElementById('app-principal').style.display = 'block';

    const elUser = document.getElementById('nombre-operador-display');
    if (elUser) elUser.innerText = nombreOperador;

    // Mes actual y fecha de hoy por defecto
    const selectMes = document.getElementById('mes-pago');
    if (selectMes) selectMes.selectedIndex = new Date().getMonth();
    const inputFecha = document.getElementById('fecha-pago');
    if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];

    if (parqueoData.length > 0) {
        renderGrid();
        updateStats();
    } else {
        loadData();
    }
}

// ============================================================
// LÓGICA PRINCIPAL
// ============================================================

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
                contrato:    fila[6] || "",
                telefono:    fila[7] || ""
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
        document.getElementById('stat-libres').innerText   = TOTAL_PUESTOS - oc;
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
        accion:      "MOVIMIENTO",
        evento:      "SALIDA",
        puesto:      p.id,
        placa:       p.placa,
        propietario: p.propietario
    });
    if (exito) loadData();
}

async function enviarAGoogle(datos) {
    try {
        const datosConSeguridad = {
            ...datos,
            pin:      pinIngresado,
            operador: nombreOperador
        };

        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify(datosConSeguridad)
        });

        const res = await response.json();
        if (res.status === "error") {
            if (res.message === "PIN Incorrecto") {
                alert("❌ Sesión expirada. Identificate de nuevo.");
                sessionStorage.clear();
                location.reload();
            } else {
                alert("❌ Error del servidor: " + res.message);
            }
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
        contrato:    document.getElementById('tipo-contrato').value,
        telefono:    document.getElementById('telefono-usuario').value
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
    const campoContrato    = document.getElementById('pago-contrato');

    if (puesto && puesto.ocupado) {
        campoPropietario.value = puesto.propietario || "Sin nombre";
        campoPlaca.value       = puesto.placa       || "Sin placa";
        campoModelo.value      = puesto.marca        || "Sin modelo";
        campoContrato.value    = puesto.contrato     || "Sin contrato";

        [campoPropietario, campoPlaca, campoModelo, campoContrato].forEach(c => {
            c.style.background  = "#f0fff4";
            c.style.borderColor = "#27ae60";
        });
    } else {
        campoPropietario.value = "";
        campoPlaca.value       = "";
        campoModelo.value      = "";
        campoContrato.value    = "";

        [campoPropietario, campoPlaca, campoModelo, campoContrato].forEach(c => {
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

    const monto = parseFloat(document.getElementById('monto-pago').value);
    if (isNaN(monto) || monto <= 0) {
        alert("⚠️ El monto debe ser un número positivo.");
        document.getElementById('monto-pago').focus();
        return;
    }

    const datos = {
        accion:      "REGISTRAR_PAGO",
        puesto:      numPuesto,
        placa:       puesto.placa,
        propietario: puesto.propietario,
        modelo:      puesto.marca,
        periodo:     document.getElementById('periodo-pago').value,
        monto:       monto,
        fechaPago:   document.getElementById('fecha-pago').value,
        mes:         document.getElementById('mes-pago').value,
        comentario:  document.getElementById('comentario-pago').value.trim()
    };

    if (await enviarAGoogle(datos)) {
        alert(`✅ Pago registrado — Puesto ${numPuesto} · ${puesto.propietario}`);
        this.reset();

        ['pago-propietario', 'pago-placa', 'pago-modelo', 'pago-contrato'].forEach(id => {
            const el = document.getElementById(id);
            el.value             = "";
            el.style.background  = "#f0f4f8";
            el.style.borderColor = "#edf2f7";
        });

        // Restaurar mes y fecha tras el reset
        const selectMes = document.getElementById('mes-pago');
        if (selectMes) selectMes.selectedIndex = new Date().getMonth();
        const inputFecha = document.getElementById('fecha-pago');
        if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];

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
                const [fecha, puesto, placa, monto, propietario, operador, periodo, modelo, estatus, mes, fechaPago, comentario] = fila;
                const li = document.createElement('li');
                li.innerHTML = `
                    <div style="flex:1;">
                        <strong>Puesto ${puesto}</strong> — ${propietario} (${placa})<br>
                        <span class="fecha-pago">${periodo} · ${mes} · ${fechaPago || fecha}</span>
                        ${comentario ? `<br><em style="color:#718096; font-size:0.8rem;">💬 ${comentario}</em>` : ''}
                    </div>
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