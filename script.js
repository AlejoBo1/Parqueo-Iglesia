let parqueoData = [];

// 1. Cargar Datos iniciales
async function loadData() {
    const localData = localStorage.getItem('parqueo_db');
    
    if (localData) {
        parqueoData = JSON.parse(localData);
    } else {
        try {
            const response = await fetch('data.json');
            parqueoData = await response.json();
            // Si el JSON tiene menos de 100, rellenamos el resto
            if (parqueoData.length < 100) {
                for (let i = parqueoData.length + 1; i <= 100; i++) {
                    parqueoData.push({ id: i, ocupado: false, usuario: "", tipo: "", fecha: "" });
                }
            }
        } catch (e) {
            console.warn("No se pudo cargar data.json, generando datos locales...");
            parqueoData = Array.from({ length: 100 }, (_, i) => ({
                id: i + 1, ocupado: false, usuario: "", tipo: "", fecha: ""
            }));
        }
        saveToLocal();
    }
    renderGrid();
}

// 2. Guardar en LocalStorage
function saveToLocal() {
    localStorage.setItem('parqueo_db', JSON.stringify(parqueoData));
}

// 3. Cambiar de sección
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'estadisticas') updateStats();
    if (id === 'ingreso') renderGrid();
}

// 4. Dibujar el mapa de puestos
function renderGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id;
        div.title = p.ocupado ? `Usuario: ${p.usuario} (${p.tipo})` : 'Disponible';
        
        div.onclick = () => {
            if(p.ocupado) {
                if(confirm(`Puesto ${p.id} ocupado por ${p.usuario}. ¿Desea liberarlo?`)) {
                    p.ocupado = false;
                    p.usuario = "";
                    p.tipo = "";
                    saveToLocal();
                    renderGrid();
                }
            } else {
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}

// 5. Manejar el formulario de cobro
document.getElementById('form-pago').onsubmit = (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('puesto-num').value);
    const placa = document.getElementById('placa-carro').value.toUpperCase();
    const nombre = document.getElementById('nombre-usuario').value;
    const contrato = document.getElementById('tipo-contrato').value;
    
    // Buscamos si el puesto ya está ocupado
    const index = parqueoData.findIndex(p => p.id === id);

    if (index !== -1) {
        if (parqueoData[index].ocupado) {
            alert("⚠️ Error: Este puesto ya está ocupado por otro vehículo.");
            return;
        }

        // Guardamos la nueva estructura con PLACA
        parqueoData[index] = {
            id: id,
            ocupado: true,
            placa: placa, // Nueva propiedad
            usuario: nombre,
            tipo: contrato,
            fecha: new Date().toLocaleDateString()
        };

        saveToLocal(); // Guarda en el navegador
        alert(`✅ Ingreso registrado: Puesto ${id} asignado a ${placa}`);
        
        e.target.reset(); // Limpia el formulario
        showSection('ingreso'); // Te manda al mapa para ver el cuadro rojo
    }
};

// 5.1 - RenderGrid: También actualicé el renderGrid para que al pasar el mouse se vea la placa
function renderGrid() {
    const container = document.getElementById('grid-container');
    if(!container) return;
    container.innerHTML = '';
    
    parqueoData.forEach(p => {
        const div = document.createElement('div');
        div.className = `puesto ${p.ocupado ? 'ocupado' : 'disponible'}`;
        div.innerText = p.id;
        
        // Tooltip que muestra la placa si está ocupado
        div.title = p.ocupado ? `PLACA: ${p.placa} | Dueño: ${p.usuario}` : 'Puesto Libre';
        
        div.onclick = () => {
            if(p.ocupado) {
                const info = `Puesto ${p.id}\nVehículo: ${p.placa}\nDueño: ${p.usuario}\nContrato: ${p.tipo}\n\n¿Desea liberar este puesto?`;
                if(confirm(info)) {
                    p.ocupado = false;
                    p.placa = "";
                    p.usuario = "";
                    p.tipo = "";
                    saveToLocal();
                    renderGrid();
                }
            } else {
                showSection('cobros');
                document.getElementById('puesto-num').value = p.id;
            }
        };
        container.appendChild(div);
    });
}

// 6. Actualizar Estadísticas
function updateStats() {
    const ocupados = parqueoData.filter(p => p.ocupado).length;
    const ingresos = parqueoData.reduce((total, p) => {
        if (!p.ocupado) return total;
        return total + (p.tipo === 'Mensual' ? 50 : 25); // Valores ejemplo
    }, 0);

    document.getElementById('stat-ocupados').innerText = ocupados;
    document.getElementById('stat-libres').innerText = 100 - ocupados;
    document.getElementById('stat-ingresos').innerText = ingresos;
    
    document.getElementById('json-preview').innerText = JSON.stringify(parqueoData.filter(p => p.ocupado), null, 2);
}

// 7. Historial de Pagos

let historialPagos = []; // Aquí guardaremos cada transacción

document.getElementById('form-registro-pago').onsubmit = (e) => {
    e.preventDefault();
    
    const puestoId = parseInt(document.getElementById('pago-puesto-num').value);
    const puesto = parqueoData.find(p => p.id === puestoId);

    if (!puesto || !puesto.ocupado) {
        alert("❌ Error: Ese puesto está vacío. No se puede registrar pago.");
        return;
    }

    const nuevoPago = {
        fechaOperacion: new Date().toLocaleString(),
        puestoId: puestoId,
        placa: puesto.placa,
        dueño: puesto.usuario,
        periodo: document.getElementById('periodo-pago').value,
        monto: document.getElementById('monto-pago').value
    };

    historialPagos.push(nuevoPago);
    
    // Guardamos ambos en LocalStorage por ahora
    localStorage.setItem('historial_pagos', JSON.stringify(historialPagos));
    
    alert(`✅ Pago registrado para la placa ${puesto.placa}`);
    actualizarListaPagos();
    e.target.reset();
};

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

// Iniciar aplicación
loadData();