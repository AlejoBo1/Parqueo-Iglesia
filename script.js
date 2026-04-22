let parqueoData = [];
let historialPagos = [];
let historialMovimientos = []; // Ya no cargamos de localStorage

// Variables para el control de acceso
let nombreOperador = "";
let pinIngresado = "";

// 1. Cargar Datos
async function loadData() {
    console.log("☁️ Sincronizando con Google Sheets...");
    
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_ESTADO" })
        });
        
        const res = await response.json();
        
        if (res.status === "success") {
            // Mapeamos las filas de la hoja "Estado_Actual" a tu array parqueoData
            parqueoData = res.datos.map(fila => ({
                id: fila[0],         // Columna A (ID)
                ocupado: fila[1] === "OCUPADO", // Columna B (Estado)
                placa: fila[2] || "", // Columna C (Placa)
                usuario: fila[3] || "" // Columna D (Dueño)
            }));
            
            console.log("✅ Datos cargados correctamente");
            renderGrid();
        }
    } catch (err) {
        console.error("❌ Error de conexión:", err);
        alert("No se pudo conectar con la base de datos en la nube.");
    }
}


// 2. Navegación
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    if (id === 'estadisticas') updateStats();
    if (id === 'ingreso') renderGrid();
}

// 3. Mapa de Puestos
function renderGrid() {
    const container = document.getElementById('grid-container');
    if(!container) return;
    container.innerHTML = '';
    
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        // Usamos 'disponible' u 'ocupado' según tu CSS
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id + (p.placa ? `\n${p.placa}` : "");
        
        div.onclick = async () => {
            if(p.ocupado) {
                // Ahora validamos con el PIN que el operador ingresó al inicio
                const confirmacion = confirm(`¿Confirmar salida del vehículo con placa ${p.placa}?`);
                
                if (confirmacion) {
                    const registroSalida = {
                        accion: "MOVIMIENTO", // Le decimos al API qué tipo de operación es
                        fecha: new Date().toLocaleString(),
                        evento: "SALIDA",
                        puesto: p.id,
                        placa: p.placa,
                        operador: nombreOperador // Usamos el nombre capturado al inicio
                    };

                    // Enviamos a la nube y esperamos confirmación
                    const exito = await enviarAGoogle(registroSalida);
                    
                    if(exito) {
                        p.ocupado = false;
                        p.placa = ""; 
                        p.usuario = "";
                        renderGrid();
                        updateStats();
                        alert("✅ Salida registrada en la nube.");
                    }
                }
            } else {
                // Si está libre, mandamos a la sección de cobros/registro
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}

// 4. Formulario Ingreso
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

// 5. Registro de Pagos
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

// --- SINCRONIZACIÓN Y SEGURIDAD ---
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxvPCv_sUG37bxNOvy9c6NCzD8Fah61vqKpT1WGppbX_eyIAnKeRqNrGKhDq80fFCoacw/exec";

// Variables globales para la sesión del operador
let nombreOperador = "";
let pinIngresado = "";

async function enviarAGoogle(datos) {
    try {
        console.log("☁️ Enviando a la nube...", datos);
        // Agregamos el PIN y el Operador a cada envío para que Google los valide
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
            alert("❌ Error de seguridad: " + res.message);
            return false;
        }
        return true;
    } catch (err) { 
        console.error("Error nube:", err); 
        return false;
    }
}

function actualizarInterfazDesdeNube(puestosNube) {
    // 1. Actualizamos tu variable principal de datos (parqueoData)
    // Asumiendo que puestosNube es un array de 100 filas
    puestosNube.forEach((fila, index) => {
        parqueoData[index] = {
            puesto: fila[0],
            ocupado: fila[1] === "OCUPADO",
            placa: fila[2],
            dueno: fila[3]
        };
    });

    // 2. Refrescamos visualmente los cuadritos (la función que ya tenías)
    renderPuestos(); // O el nombre de tu función que dibuja los cuadros
    updateStats();
}

// --- ESTE ES EL NUEVO BLOQUE QUE REEMPLAZA A loadData() ---
window.onload = async () => {
    // 1. Pedir identificación al entrar
    nombreOperador = prompt("Ingrese su nombre (Operador):");
    pinIngresado = prompt("Ingrese el PIN de seguridad:");

    if (!nombreOperador || !pinIngresado) {
        alert("Es necesario identificarse para usar el sistema.");
        location.reload(); // Recarga si no pone datos
        return;
    }

    console.log(`👤 Operador: ${nombreOperador} conectado.`);

    // 2. Cargar estado inicial desde Google
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_ESTADO" })
        });
        const res = await response.json();
        
        if (res.status === "success") {
            actualizarInterfazDesdeNube(res.datos);
        }
    } catch (err) {
        alert("No se pudo sincronizar con la nube. El sistema podría no estar actualizado.");
    }
};