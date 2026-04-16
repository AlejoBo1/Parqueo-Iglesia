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
    const index = parqueoData.findIndex(p => p.id === id);

    if (index !== -1) {
        parqueoData[index] = {
            id: id,
            ocupado: true,
            usuario: document.getElementById('nombre-usuario').value,
            tipo: document.getElementById('tipo-contrato').value,
            fecha: new Date().toLocaleDateString()
        };
        saveToLocal();
        alert(`Puesto ${id} registrado exitosamente.`);
        e.target.reset();
        showSection('ingreso');
    }
};

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

// Iniciar aplicación
loadData();