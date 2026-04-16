# Parqueo-Iglesia
Este código es para la gestión de parqueo en Tabernáculo Internacional 

# ⛪ Sistema de Gestión de Parqueo - Tabernáculo Internacional

Este es un sistema web diseñado para la gestión organizada y eficiente de los 100 puestos de estacionamiento fijos de la Iglesia. El objetivo es digitalizar el control de asignaciones, cobros y estadísticas de uso.

## 🚀 Características del Proyecto

- **Mapa Interactivo (1-100):** Visualización en tiempo real del estado de cada puesto (Libre/Ocupado).
- **Gestión de Contratos:** Registro detallado de usuarios con modalidades de pago **Quincenal** o **Mensual**.
- **Panel de Control (Dashboard):** Sección de estadísticas para monitorear ocupación e ingresos estimados.
- **Persistencia de Datos:** Los datos se manejan actualmente vía `LocalStorage` y próximamente se integrarán con **Google Sheets API**.

## 🛠️ Tecnologías Utilizadas

- **HTML5:** Estructura semántica de la aplicación.
- **CSS3:** Diseño responsivo y moderno tipo Dashboard.
- **JavaScript (Vanilla):** Lógica del sistema, manejo de estados y manipulación del DOM.
- **JSON:** Formato de intercambio de datos para la base de datos inicial.
- **GitHub Pages:** Hosting gratuito y despliegue automático.

## 📂 Estructura de Archivos

```text
/
├── index.html    # Estructura principal y navegación
├── style.css     # Estilos y diseño visual
├── script.js    # Lógica de la aplicación y persistencia
├── data.json     # Plantilla inicial de los puestos
└── README.md     # Documentación del proyecto