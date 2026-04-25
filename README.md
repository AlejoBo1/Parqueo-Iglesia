🚗 Sistema de Gestión de Parqueo Inteligente (v2.0)

Este es un sistema web interactivo diseñado para la administración de 100 puestos de estacionamiento en tiempo real. Utiliza una arquitectura Serverless conectando una interfaz de usuario moderna con Google Sheets como base de datos a través de Google Apps Script.

🌟 Características Principales del Mapa Interactivo (Grid): Visualización dinámica de 100 puestos con estados codificados por colores (Verde: Disponible, Rojo: Ocupado).

Sincronización en la Nube: Persistencia de datos bidireccional con Google Sheets mediante la API Fetch.
Gestión de Operadores: Sistema de acceso mediante Nombre y PIN de seguridad.
Persistencia de Sesión: Uso de sessionStorage para evitar ingresos repetitivos del PIN durante la jornada de trabajo.
Registro Detallado: Captura de datos críticos:Número de Placa.Marca/Modelo del vehículo, Nombre del Propietario, Tipo de Contrato.

Historial Automático: Registro de entradas y salidas con marca de tiempo y nombre del operador responsable.

🛠️ Stack Tecnológico
Frontend: HTML5, CSS3 (Variables, Flexbox, Grid, Animaciones).
Lógica: JavaScript Vanilla (ES6+), Fetch API, SessionStorage.
Backend: Google Apps Script (JavaScript de servidor).
Base de Datos: Google Sheets.

📋 Configuración de la Base de Datos
Para el correcto funcionamiento, la hoja de cálculo de Google (Estado_Actual) debe seguir estrictamente el siguiente orden de columnas:
Columna,Encabezado,Descripción
A,PUESTO,ID numérico del puesto (1-100)
B,ESTADO,OCUPADO / LIBRE
C,PLACA,Matrícula del vehículo
D,PROPIETARIO,Nombre completo del cliente
E,OPERADOR,Empleado que realizó el registro
F,MODELO,Marca o modelo del vehículo
G,CONTRATO,"Tipo de plan (Mensual, Diario, etc.)"

🚀 Instalación y Despliegue

Google Sheets: Crea una hoja con las pestañas Estado_Actual y Historial_Movimientos.
Apps Script: Copia el código del servidor en el editor de extensiones de la hoja y realiza una "Nueva implementación" como Aplicación Web con acceso para "Cualquier persona".
Frontend: * Actualiza la constante URL_GOOGLE_SCRIPT en el archivo script.js con la URL obtenida en el paso anterior.
Abre el archivo index.html en cualquier navegador moderno.

🔒 Seguridad
El sistema implementa una capa de validación donde cada petición enviada a la nube incluye el PIN de seguridad del operador. Si el PIN no coincide con el configurado en el servidor, la transacción es rechazada automáticamente.

Desarrollado por: David Escobar
