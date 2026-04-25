// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
// ⚠️ IMPORTANTE: Pega aquí la URL exacta de tu "Nueva implementación" de Google Apps Script
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwlBKuWO2GGWyhPPslqulcAgWVp8_e9IGksoNWHgrV1aUDG4dMKe4OAE7qPdvrRb2vPRA/exec";

// Variables globales de datos
let parqueoData = [];
let historialPagos = [];
let historialMovimientos = [];

// Variables para la sesión del operador
let nombreOperador = "";
let pinIngresado = "";


// ==========================================
// 1. CARGA INICIAL Y SINCRONIZACIÓN (NUBE)
// ==========================================

// Esta función arranca apenas se abre la página
window.onload = async () => {
    // 1. Pedir credenciales
    nombreOperador = prompt("Ingrese su nombre (Operador):");
    pinIngresado = prompt("Ingrese el PIN de seguridad:");

    if (!nombreOperador || !pinIngresado) {
        alert("Acceso denegado: Es necesario identificarse.");
        location.reload(); // Recarga si no pone datos
        return;
    }

    console.log(`👤 Operador conectado: ${nombreOperador}`);
    
    // 2. Cargar los datos desde Google Sheets
    await loadData();
};

async function loadData() {
    console.log("☁️ Sincronizando con Google Sheets...");
    
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            body: JSON.stringify({ accion: "CARGAR_ESTADO" })
        });
        
        const res = await response.json();
        
        if (res.status === "success") {
            console.log("✅ Datos cargados correctamente de la nube.");
            
            // Transformamos lo que manda Google al formato que usa tu página
            parqueoData = res.datos.map(fila => ({
                id: fila[0], 
                ocupado: fila[1] === "OCUPADO",
                placa: fila[2] || "",
                propietario: fila[3] || "",
                marca: fila[4] || "",
                contrato: fila[5] || ""
            }));
            renderGrid();
            updateStats();
        } else {
            alert("❌ Error de Google Sheets: " + res.message);
        }
    } catch (err) {
        console.error("❌ Error de conexión:", err);
        alert("No se pudo conectar con la base de datos en la nube.");
    }
}


// ==========================================
// 2. FUNCIÓN PARA ENVIAR DATOS A GOOGLE
// ==========================================
async function enviarAGoogle(datos) {
    try {
        console.log("☁️ Enviando a la nube...", datos);
        
        // Empaquetamos los datos junto con la firma del operador
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
            alert("❌ Error: " + res.message);
            return false;
        }
        
        return true; // Envío exitoso
    } catch (err) { 
        console.error("❌ Error enviando a la nube:", err); 
        alert("Hubo un problema de conexión. El cambio no se guardó.");
        return false;
    }
}


// ==========================================
// 3. MAPA DE PUESTOS (INTERFAZ)
// ==========================================
function renderGrid() {
    const container = document.getElementById('grid-container');
    if(!container) return;
    container.innerHTML = '';
    
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id + (p.placa ? `\n${p.placa}` : "");
        
        div.onclick = async () => {
            if(p.ocupado) {
                // Proceso de Salida
                const confirmacion = confirm(`¿Confirmar salida del vehículo con placa ${p.placa}?`);
                
                if (confirmacion) {
                    const registroSalida = {
                        accion: "MOVIMIENTO",
                        fecha: new Date().toLocaleString(),
                        evento: "SALIDA",
                        puesto: p.id,
                        placa: p.placa
                    };

                    const exito = await enviarAGoogle(registroSalida);
                    
                    if(exito) {
                        p.ocupado = false;
                        p.placa = ""; 
                        p.propietario = "";
                        p.marca = "";
                        p.contrato = "";
                        renderGrid();
                        updateStats();
                        alert("✅ Salida registrada.");
                    }
                }
            } else {
                // Si el puesto está libre, vamos a cobrar/ingresar
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}


// ==========================================
// 4. FORMULARIOS (INGRESO Y PAGOS)
// ==========================================

// Formulario de Ingreso de Vehículo
document.getElementById('form-pago').onsubmit = async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('puesto-num').value);
    const placa = document.getElementById('placa-carro').value.toUpperCase();
    const marca = document.getElementById('marca-carro').value;
    const nombre = document.getElementById('nombre-usuario').value;
    const contrato = document.getElementById('tipo-contrato').value;
    
    const idx = parqueoData.findIndex(p => p.id === id);
    if (idx !== -1 && !parqueoData[idx].ocupado) {
        
        const registroIngreso = { 
            accion: "MOVIMIENTO",
            fecha: new Date().toLocaleString(), 
            evento: "INGRESO", 
            puesto: id, 
            placa: placa, 
            propietario: nombre,
            marca: marca,
            contrato: contrato
        };

        const exito = await enviarAGoogle(registroIngreso);

        if (exito) {
            parqueoData[idx] = { id, ocupado: true, placa, propietario: nombre, marca, contrato };
            alert(`✅ Puesto ${id} asignado a ${placa}.`);
            e.target.reset();
            renderGrid();
            updateStats();
            showSection('ingreso');
        }
    }
};


