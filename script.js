// La dirección donde está escuchando nuestro servidor Python
const API_URL = 'http://localhost:5000/api';

// --- 1. NAVEGACIÓN DEL MENÚ ---
const menuBtns = document.querySelectorAll('.menu-btn');
const sections = document.querySelectorAll('.content-section');

menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        menuBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// --- 2. RELOJ EN TIEMPO REAL ---
function actualizarReloj() {
    const relojEl = document.getElementById('reloj');
    const ahora = new Date();
    relojEl.textContent = ahora.toTimeString().split(' ')[0];
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

// --- 3. CARGAR DATOS DESDE LA BASE DE DATOS (MYSQL VÍA PYTHON) ---
async function cargarDatosBD() {
    try {
        console.log("Conectando al servidor...");
        const respuesta = await fetch(`${API_URL}/datos-iniciales`);
        
        if (!respuesta.ok) throw new Error("No se pudo obtener respuesta del servidor");
        
        const datos = await respuesta.json();
        
        const tbodyDir = document.getElementById('tabla-directorio');
        const tbodyRep = document.getElementById('tabla-reportes');
        
        tbodyDir.innerHTML = '';
        tbodyRep.innerHTML = '';

        // Llenar tabla del Directorio de Empleados
        datos.directorio.forEach(emp => {
            tbodyDir.innerHTML += `
                <tr>
                    <td><strong>${emp.id}</strong></td>
                    <td>${emp.nombre}</td>
                    <td>${emp.depto}</td>
                    <td><button class="btn btn-small">Editar</button></td>
                </tr>
            `;
        });

        // Llenar tabla de Reportes de Asistencia
        datos.reporte.forEach(emp => {
            let badgeColor = "badge-success";
            if (emp.Estado === "Retardo") badgeColor = "badge-warning";
            else if (emp.Estado === "Sin registro") badgeColor = "badge-warning";

            tbodyRep.innerHTML += `
                <tr>
                    <td>${emp.id_emp}</td>
                    <td><strong>${emp.Empleado}</strong><br><small class="text-muted">${emp.Departamento}</small></td>
                    <td>${emp.Horario}</td>
                    <td>${emp.Entrada}</td>
                    <td style="color: ${emp.Retraso.includes('Sí') ? '#ef4444' : '#10b981'}">${emp.Retraso}</td>
                    <td>${emp.Salida}</td>
                    <td>${emp.Dif_Salida}</td>
                    <td><span class="badge ${badgeColor}">${emp.Estado}</span></td>
                </tr>
            `;
        });
        console.log("¡Datos cargados exitosamente!");
        
    } catch (error) {
        console.error("Error conectando al backend:", error);
    }
}

// Ejecutar la carga de datos tan pronto como se abre la página
cargarDatosBD();

// --- 4. GUARDAR NUEVO EMPLEADO EN BASE DE DATOS ---
document.getElementById('form-empleado').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const nombre = document.getElementById('emp-nombre').value;
    const depto = document.getElementById('emp-depto').value;
    
    try {
        const res = await fetch(`${API_URL}/empleados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, depto })
        });
        const data = await res.json();
        
        if(data.success) {
            alert(`¡Empleado guardado exitosamente!\nSu ID para registrar asistencia es: ${data.nuevo_id}`);
            this.reset(); 
            cargarDatosBD(); // Recargar las tablas para ver al nuevo empleado
        } else {
            alert(`Hubo un problema: ${data.error}`);
        }
    } catch (error) {
        console.error("Error al guardar empleado:", error);
        alert("❌ No se pudo guardar. Asegúrate de que el servidor Python esté encendido.");
    }
});

// --- 5. REGISTRAR ENTRADA Y SALIDA EN BASE DE DATOS ---
// Esta función es llamada por los botones del HTML (onclick="registrarMarca(...)")
async function registrarMarca(tipo) {
    const inputId = document.getElementById('emp-id').value;
    const msgEl = document.getElementById('mensaje-asistencia');

    if (inputId.trim() === '') {
        msgEl.style.color = '#ef4444'; 
        msgEl.textContent = 'Error: Ingrese un ID.';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/asistencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: inputId, tipo: tipo })
        });
        
        const data = await res.json();

        if (data.success) {
            msgEl.style.color = '#10b981'; 
            msgEl.innerHTML = `✅ ${tipo} de <strong>${data.nombre}</strong> registrada a las ${data.hora}`;
            document.getElementById('emp-id').value = '';
            cargarDatosBD(); // Actualizar la tabla de reportes al instante
        } else {
            msgEl.style.color = '#ef4444'; 
            msgEl.innerHTML = `❌ Error: ${data.mensaje}`;
        }
    } catch (error) {
        console.error("Error al registrar asistencia:", error);
        msgEl.style.color = '#ef4444'; 
        msgEl.textContent = "❌ Servidor inalcanzable. Revisa si app.py está ejecutándose.";
    }

    // Borrar el mensaje después de 4.5 segundos
    setTimeout(() => { msgEl.textContent = ''; }, 4500);
}

// --- 6. REGISTRAR NOVEDADES EN BASE DE DATOS ---
document.getElementById('form-novedades').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Obtenemos los valores de los inputs. 
    // *Asegúrate de que estos IDs coincidan con los de tu index.html*
    const empleado = document.getElementById('nov-empleado').value;
    const tipo = document.getElementById('nov-tipo').value;
    const fecha_inicio = document.getElementById('nov-inicio').value;
    const fecha_fin = document.getElementById('nov-fin').value;

    try {
        const res = await fetch(`${API_URL}/novedades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                empleado: empleado, 
                tipo: tipo, 
                fecha_inicio: fecha_inicio, 
                fecha_fin: fecha_fin 
            })
        });
        
        const data = await res.json();

        if (data.success) {
            alert(`✅ ${data.mensaje}`);
            this.reset(); // Limpia el formulario automáticamente tras guardar
        } else {
            alert(`❌ Error: ${data.mensaje}`);
        }
    } catch (error) {
        console.error("Error al registrar novedad:", error);
        alert("❌ Error de conexión con el servidor.");
    }
});
