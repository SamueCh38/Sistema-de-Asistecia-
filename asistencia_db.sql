-- 1. Crear la base de datos y usarla
CREATE DATABASE IF NOT EXISTS sistema_asistencia;
USE sistema_asistencia;

-- 2. Crear tabla de Departamentos (con sus horarios)
CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL
);

-- 3. Crear tabla de Empleados
CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_empleado VARCHAR(10) UNIQUE NOT NULL, -- Aquí guardaremos "001", "002", etc.
    nombre_completo VARCHAR(100) NOT NULL,
    departamento_id INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

-- 4. Crear tabla de Registro de Asistencia Diaria
CREATE TABLE asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada TIME NULL,
    hora_salida TIME NULL,
    minutos_retraso INT DEFAULT 0,
    diferencia_salida INT DEFAULT 0, -- Negativo (Salió antes), Positivo (Salió tarde)
    estado VARCHAR(50) DEFAULT 'Sin registro',
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    UNIQUE(empleado_id, fecha) -- Evita que un empleado tenga dos registros el mismo día
);

-- 5. Crear tabla de Novedades (Permisos e Incapacidades)
CREATE TABLE novedades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    tipo_novedad ENUM('Permiso Personal', 'Vacaciones', 'Incapacidad Médica') NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    notas TEXT,
    estado ENUM('Pendiente', 'Aprobado', 'Rechazado') DEFAULT 'Aprobado',
    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

-- ==========================================
-- INSERTAR DATOS DE PRUEBA (Los que teníamos en JS)
-- ==========================================

-- Insertar los 4 departamentos con sus horarios
INSERT INTO departamentos (nombre, hora_entrada, hora_salida) VALUES
('Recursos Humanos', '08:00:00', '17:00:00'),
('Tecnología', '09:00:00', '18:00:00'),
('Ventas', '10:00:00', '19:00:00'),
('Operaciones', '07:00:00', '16:00:00');

-- Insertar a los empleados de prueba
-- Ana Silva en Tecnología (ID 2), Carlos Ruiz en Ventas (ID 3)
INSERT INTO empleados (codigo_empleado, nombre_completo, departamento_id) VALUES
('001', 'Ana Silva', 2),
('002', 'Carlos Ruiz', 3);

-- (Opcional) Insertar una asistencia de prueba para hoy
INSERT INTO asistencia (empleado_id, fecha, hora_entrada, estado) VALUES
(1, CURDATE(), '08:50:00', 'Presente'),
(2, CURDATE(), '10:15:00', 'Retardo');