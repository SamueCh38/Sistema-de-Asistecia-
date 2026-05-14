// --- CONFIGURACIÓN DE HORARIOS POR DEPARTAMENTO ---
// entradaMin y salidaMin representan la hora convertida a minutos (Ej. 08:00 AM = 8 * 60 = 480)
const horariosDepto = {
    "Recursos Humanos": { texto: "08:00 a 17:00", entradaMin: 480, salidaMin: 1020 },
    "Tecnología":       { texto: "09:00 a 18:00", entradaMin: 540, salidaMin: 1080 },
    "Ventas":           { texto: "10:00 a 19:00", entradaMin: 600, salidaMin: 1140 },
    "Operaciones":      { texto: "07:00 a 16:00", entradaMin: 420, salidaMin:  960 }
};

// --- BASE DE DATOS SIMULADA ---
let empleadosBD = [
    { id: "001", nombre: "Ana Silva", depto: "Tecnología", entradaHoy: "08:50:00", salidaHoy: "", retraso: "No", difSalida: "--", estado: "Presente", badge: "badge-success" },
    { id: "002", nombre: "Carlos Ruiz", depto: "Ventas", entradaHoy: "10:15:00", salidaHoy: "", retraso: "Sí (15 min)", difSalida: "--", estado: "Retardo", badge: "badge-warning" }
];

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
    let horas = ahora.getHours().toString().padStart(2, '0');
    let minutos = ahora.getMinutes().toString().padStart(2, '0');
    let segundos = ahora.getSeconds().toString().padStart(2, '0');
    relojEl.textContent = `${horas}:${minutos}:${segundos}`;
}
setInterval(actualizarReloj, 1000);
actualizarReloj(); 

// --- 3. ACTUALIZAR TABLAS DINÁMICAMENTE ---
function renderizarTablas() {
    const tbodyDir = document.getElementById('tabla-directorio');
    const tbodyRep = document.getElementById('tabla-reportes');
    
    tbodyDir.innerHTML = '';
    tbodyRep.innerHTML = '';

    empleadosBD.forEach(emp => {
        // Tabla de Directorio
        tbodyDir.innerHTML += `
            <tr>
                <td><strong>${emp.id}</strong></td>
                <td>${emp.nombre}</td>
                <td>${emp.depto}</td>
                <td><button class="btn btn-small">Editar</button></td>
            </tr>
        `;

        // Tabla de Reportes Diario
        const horarioTexto = horariosDepto[emp.depto].texto;

        tbodyRep.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td><strong>${emp.nombre}</strong><br><small class="text-muted">${emp.depto}</small></td>
                <td>${horarioTexto}</td>
                <td>${emp.entradaHoy ? emp.entradaHoy : '--:--:--'}</td>
                <td style="color: ${emp.retraso.includes('Sí') ? '#ef4444' : '#10b981'}">${emp.retraso ? emp.retraso : '--'}</td>
                <td>${emp.salidaHoy ? emp.salidaHoy : '--:--:--'}</td>
                <td>${emp.difSalida}</td>
                <td><span class="badge ${emp.badge}">${emp.estado}</span></td>
            </tr>
        `;
    });
}
renderizarTablas();

// --- 4. GUARDAR NUEVO EMPLEADO ---
document.getElementById('form-empleado').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const nombreInput = document.getElementById('emp-nombre').value;
    const deptoInput = document.getElementById('emp-depto').value;
    
    const nuevoNumero = empleadosBD.length + 1;
    const nuevoId = nuevoNumero.toString().padStart(3, '0');

    const nuevoEmpleado = {
        id: nuevoId,
        nombre: nombreInput,
        depto: deptoInput,
        entradaHoy: "",
        salidaHoy: "",
        retraso: "",
        difSalida: "--",
        estado: "Sin registro",
        badge: "badge-warning" 
    };

    empleadosBD.push(nuevoEmpleado);
    renderizarTablas();
    
    alert(`¡Empleado guardado exitosamente!\nSu ID para registrar asistencia es: ${nuevoId}\nSu horario será: ${horariosDepto[deptoInput].texto}`);
    this.reset(); 
});

// --- 5. VALIDAR ASISTENCIA Y CALCULAR RETRASOS/SALIDAS ---
function registrarMarca(tipo) {
    const inputId = document.getElementById('emp-id').value;
    const msgEl = document.getElementById('mensaje-asistencia');

    if (inputId.trim() === '') {
        msgEl.style.color = '#ef4444'; 
        msgEl.textContent = 'Error: Ingrese un ID.';
        return;
    }

    const empleado = empleadosBD.find(emp => emp.id === inputId);

    if (empleado) {
        msgEl.style.color = '#10b981'; 
        
        const ahora = new Date();
        const horaFormateada = document.getElementById('reloj').textContent;
        const minutosActuales = (ahora.getHours() * 60) + ahora.getMinutes();
        
        // Obtener el horario correspondiente al departamento del empleado
        const horario = horariosDepto[empleado.depto];

        if (tipo === 'Entrada') {
            empleado.entradaHoy = horaFormateada;
            
            // Evaluar Entrada
            if (minutosActuales > horario.entradaMin) {
                const minutosRetraso = minutosActuales - horario.entradaMin;
                empleado.retraso = `Sí (+${minutosRetraso} min)`;
                empleado.estado = "Retardo";
                empleado.badge = "badge-warning";
            } else {
                empleado.retraso = "No (A tiempo)";
                empleado.estado = "Presente";
                empleado.badge = "badge-success";
            }

        } else if (tipo === 'Salida') {
            empleado.salidaHoy = horaFormateada;
            
            // Evaluar Salida
            const diffSalida = minutosActuales - horario.salidaMin;
            
            if (diffSalida > 0) {
                empleado.difSalida = `<span style="color: #3b82f6">+${diffSalida} min (Tarde)</span>`;
            } else if (diffSalida < 0) {
                empleado.difSalida = `<span style="color: #ef4444">${diffSalida} min (Antes)</span>`;
            } else {
                empleado.difSalida = `<span style="color: #10b981">Exacto</span>`;
            }

            empleado.estado = "Jornada Finalizada";
            empleado.badge = "badge-success";
        }

        renderizarTablas();

        msgEl.innerHTML = `✅ ${tipo} de <strong>${empleado.nombre}</strong> registrada a las ${horaFormateada}`;
        document.getElementById('emp-id').value = '';
    } else {
        msgEl.style.color = '#ef4444'; 
        msgEl.innerHTML = `❌ Error: El ID <strong>${inputId}</strong> no existe en el sistema.`;
    }

    setTimeout(() => {
        msgEl.textContent = '';
    }, 4500);
}

// --- 6. PREVENIR ENVÍO DE FORMULARIO DE NOVEDADES ---
document.getElementById('form-novedades').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Novedad registrada correctamente.');
    this.reset();
});