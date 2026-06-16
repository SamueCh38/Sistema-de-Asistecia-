from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import pymysql.cursors
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
db_config = {
    'host': 'localhost',
    'user': 'root', 
    'password': 'sam38ch', # ¡Asegúrate de poner tu contraseña aquí si tienes una!
    'database': 'sistema_asistencia',
    'cursorclass': pymysql.cursors.DictCursor 
}

def get_db_connection():
    return pymysql.connect(**db_config)

# --- ENDPOINT 1: Obtener el reporte de hoy y el directorio ---
@app.route('/api/datos-iniciales', methods=['GET'])
def obtener_datos():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT e.codigo_empleado as id, e.nombre_completo as nombre, d.nombre as depto 
        FROM empleados e JOIN departamentos d ON e.departamento_id = d.id
    """)
    directorio = cursor.fetchall()

    cursor.execute("""
        SELECT 
            e.codigo_empleado AS id_emp,
            e.nombre_completo AS Empleado,
            d.nombre AS Departamento,
            CONCAT(TIME_FORMAT(d.hora_entrada, '%H:%i'), ' a ', TIME_FORMAT(d.hora_salida, '%H:%i')) AS Horario,
            IFNULL(TIME_FORMAT(a.hora_entrada, '%H:%i:%s'), '--:--:--') AS Entrada,
            CASE 
                WHEN a.minutos_retraso > 0 THEN CONCAT('Sí (+', a.minutos_retraso, ' min)')
                WHEN a.hora_entrada IS NOT NULL THEN 'No'
                ELSE '--'
            END AS Retraso,
            IFNULL(TIME_FORMAT(a.hora_salida, '%H:%i:%s'), '--:--:--') AS Salida,
            CASE 
                WHEN a.diferencia_salida > 0 THEN CONCAT('+', a.diferencia_salida, ' min (Tarde)')
                WHEN a.diferencia_salida < 0 THEN CONCAT(a.diferencia_salida, ' min (Antes)')
                WHEN a.hora_salida IS NOT NULL THEN 'Exacto'
                ELSE '--'
            END AS Dif_Salida,
            IFNULL(a.estado, 'Sin registro') AS Estado
        FROM empleados e
        JOIN departamentos d ON e.departamento_id = d.id
        LEFT JOIN asistencia a ON e.id = a.empleado_id AND a.fecha = CURDATE();
    """)
    reporte_hoy = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify({'directorio': directorio, 'reporte': reporte_hoy})

# --- ENDPOINT 2: Registrar un nuevo empleado ---
@app.route('/api/empleados', methods=['POST'])
def registrar_empleado():
    datos = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT COUNT(*) as total FROM empleados")
        resultado = cursor.fetchone()
        total = resultado['total']
        nuevo_codigo = str(total + 1).zfill(3)
        
        deptos = {"Recursos Humanos": 1, "Tecnología": 2, "Ventas": 3, "Operaciones": 4}
        depto_id = deptos.get(datos['depto'], 1)

        cursor.execute(
            "INSERT INTO empleados (codigo_empleado, nombre_completo, departamento_id) VALUES (%s, %s, %s)",
            (nuevo_codigo, datos['nombre'], depto_id)
        )
        conn.commit()
        return jsonify({'success': True, 'nuevo_id': nuevo_codigo}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# --- ENDPOINT 3: Registrar Entrada / Salida ---
@app.route('/api/asistencia', methods=['POST'])
def registrar_asistencia():
    datos = request.json
    codigo_emp = datos['id']
    tipo = datos['tipo'] 
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT e.id, e.nombre_completo, d.hora_entrada, d.hora_salida 
            FROM empleados e JOIN departamentos d ON e.departamento_id = d.id 
            WHERE e.codigo_empleado = %s
        """, (codigo_emp,))
        empleado = cursor.fetchone()
        
        if not empleado:
            return jsonify({'success': False, 'mensaje': 'ID no encontrado'}), 404

        emp_id = empleado['id']
        ahora = datetime.now()
        hora_actual_str = ahora.strftime('%H:%M:%S')
        minutos_actuales = ahora.hour * 60 + ahora.minute
        
        min_entrada_depto = empleado['hora_entrada'].seconds // 60
        min_salida_depto = empleado['hora_salida'].seconds // 60

        if tipo == 'Entrada':
            retraso = max(0, minutos_actuales - min_entrada_depto)
            estado = 'Retardo' if retraso > 0 else 'Presente'
            
            cursor.execute("""
                INSERT INTO asistencia (empleado_id, fecha, hora_entrada, minutos_retraso, estado) 
                VALUES (%s, CURDATE(), %s, %s, %s)
                ON DUPLICATE KEY UPDATE hora_entrada = %s, minutos_retraso = %s, estado = %s
            """, (emp_id, hora_actual_str, retraso, estado, hora_actual_str, retraso, estado))
            
        elif tipo == 'Salida':
            dif_salida = minutos_actuales - min_salida_depto
            
            cursor.execute("""
                UPDATE asistencia 
                SET hora_salida = %s, diferencia_salida = %s, estado = 'Jornada Finalizada' 
                WHERE empleado_id = %s AND fecha = CURDATE()
            """, (hora_actual_str, dif_salida, emp_id))
            
            if cursor.rowcount == 0:
                return jsonify({'success': False, 'mensaje': 'Debe registrar entrada primero.'}), 400

        conn.commit()
        return jsonify({'success': True, 'nombre': empleado['nombre_completo'], 'hora': hora_actual_str})
        
    except Exception as e:
        print("Error:", e)
        return jsonify({'success': False, 'mensaje': 'Error en el servidor'}), 500
    finally:
        cursor.close()
        conn.close()

# --- ENDPOINT 4: Registrar Novedad ---
@app.route('/api/novedades', methods=['POST'])
def registrar_novedad():
    datos = request.json
    empleado_input = datos['empleado'] # Puede ser el ID (003) o el Nombre (Samuel)
    tipo = datos['tipo']
    fecha_inicio = datos['fecha_inicio']
    fecha_fin = datos['fecha_fin']

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Buscar al empleado por su código o por su nombre completo
        cursor.execute("""
            SELECT id, nombre_completo FROM empleados 
            WHERE codigo_empleado = %s OR nombre_completo LIKE %s
        """, (empleado_input, f"%{empleado_input}%"))
        
        empleado = cursor.fetchone()

        if not empleado:
            return jsonify({'success': False, 'mensaje': 'Empleado no encontrado. Verifique el ID o Nombre.'}), 404

        emp_id = empleado['id']

        # 2. Insertar en la tabla novedades
        cursor.execute("""
            INSERT INTO novedades (empleado_id, tipo_novedad, fecha_inicio, fecha_fin) 
            VALUES (%s, %s, %s, %s)
        """, (emp_id, tipo, fecha_inicio, fecha_fin))

        conn.commit()
        return jsonify({
            'success': True, 
            'mensaje': f"Novedad registrada exitosamente para {empleado['nombre_completo']}"
        })

    except Exception as e:
        print("Error al registrar novedad:", e)
        return jsonify({'success': False, 'mensaje': 'Error en la base de datos.'}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)