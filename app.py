from flask import Flask, render_template, request, jsonify, send_from_directory
import pymysql
import random
import string
import logging # Importamos el módulo de logging

# 1. Configuración del Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 2. Configuración de Flask para tu estructura de archivos (todo en la raíz)
app = Flask(__name__, template_folder='.', static_folder='.')

def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='sam38ch', #
        db='sistema_asistencia', #
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def generar_id_7_digitos():
    # Genera un ID de 7 dígitos numéricos
    return "".join(random.choices(string.digits, k=7))

@app.route('/')
def index():
    return render_template('index.html')

# Ruta para servir tus archivos CSS y JS desde la raíz
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/guardar_empleado', methods=['POST'])
def guardar_empleado():
    data = request.json
    nuevo_id = generar_id_7_digitos()
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = """INSERT INTO empleados 
                     (id_usuario, nombre, apellido_paterno, apellido_materno, edad, puesto, sexo, horario_entrada, horario_salida, estatus) 
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Activo')""" #
            cursor.execute(sql, (
                nuevo_id, data['nombre'], data['paterno'], data['materno'], 
                data['edad'], data['puesto'], data['sexo'], 
                data['entrada'], data['salida']
            ))
        conn.commit()
        conn.close()
        
        data['id_usuario'] = nuevo_id
        data['estatus'] = 'Activo'
        logger.info(f"Empleado registrado exitosamente: ID {nuevo_id}")
        return jsonify({"status": "success", "empleado": data})
    except Exception as e:
        logger.error(f"Error al guardar en base de datos: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/verificar_asistencia', methods=['POST'])
def verificar_asistencia():
    data = request.json
    user_id = data.get('id_usuario')
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "SELECT nombre, apellido_paterno FROM empleados WHERE id_usuario = %s"
            cursor.execute(sql, (user_id,))
            empleado = cursor.fetchone()
        conn.close()
        if empleado:
            logger.info(f"Asistencia verificada para ID: {user_id}")
            return jsonify({"status": "success", "nombre": f"{empleado['nombre']} {empleado['apellido_paterno']}"})
        else:
            logger.warning(f"Intento de acceso fallido: ID {user_id} no existe.")
            return jsonify({"status": "error", "message": "ID no encontrado"})
    except Exception as e:
        logger.error(f"Error en verificación: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# 3. Implementación del bloque principal solicitado
if __name__ == '__main__':
    logger.info("Iniciando servidor Flask...")
    app.run(debug=True, host='127.0.0.1', port=5000)