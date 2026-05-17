# 🍱 Ryu Admin - Documentación Técnica y de Usuario

## 📋 Descripción General
**Ryu Admin** es una plataforma de gestión y análisis ejecutivo diseñada específicamente para el ecosistema de **Ryu Sushi**. La aplicación actúa como el cerebro analítico del sistema de Punto de Venta (POS), permitiendo a los administradores visualizar el rendimiento del negocio en tiempo real, analizar tendencias de ventas y gestionar la operativa desde cualquier lugar.

Desarrollada con **React Native** y **Expo**, la app ofrece una experiencia premium con una interfaz bento-style optimizada para dispositivos móviles, centrada en la legibilidad y el acceso rápido a métricas clave.

---

## 🛠️ Stack Tecnológico
- **Frontend**: React Native (Expo)
- **Base de Datos & Tiempo Real**: Supabase (PostgreSQL)
- **Gráficas**: React Native Chart Kit
- **Estilizado**: StyleSheet (Custom Design System en Rojo Corporativo `#ff0000`)
- **Navegación**: Custom Modern Tab Bar
- **Servicios Externos**: DeepSeek AI (Analista Financiero - *En desarrollo*)

---

## 🏗️ Arquitectura del Proyecto

### Directorios Principales
- `/src/components/ui`: Componentes visuales reutilizables (ej. `ModernTabBar.js`).
- `/src/services`: Lógica de comunicación externa.
  - `supabase.js`: Configuración del cliente y autenticación.
  - `/impresion`: Lógica para conexión y envío de datos a impresoras térmicas.
- `/src/utils`: Funciones de procesamiento de datos y helpers.
  - `chartHelpers.js`: El motor de transformación de datos de Supabase a formatos legibles por las gráficas.
- `App.js`: Archivo principal que gestiona el estado global, la navegación y las pantallas principales.

---

## 🚀 Funcionalidades Clave

### 1. Dashboard Ejecutivo
El corazón de la aplicación. Presenta un resumen visual del estado del negocio:
- **Resumen Rápido**: Tarjetas con Ventas Totales y Ticket Promedio.
- **Gráfica de Tendencia (Line Chart)**: Visualización de las ventas de los últimos 7 días.
- **Productos Estrella (Pie Chart)**: Distribución de los platos más vendidos.
- **Horas Pico (Bar Chart)**: Identificación de los momentos de mayor afluencia de pedidos.
- **Métodos de Pago**: Comparativa entre Efectivo y Tarjeta.

### 2. Sistema de Filtrado Inteligente
Permite segmentar toda la analítica del dashboard con un solo toque:
- **Hoy**: Datos del día actual.
- **7 Días**: Análisis semanal.
- **30 Días**: Rendimiento mensual.
- **Todo**: Historial completo.

### 3. Historial de Pedidos Avanzado
Una vista detallada de todas las transacciones:
- **Agrupación por Fecha**: Organización lógica de pedidos por días.
- **Detalle de Items**: Visualización de productos específicos y notas adicionales de cada pedido.
- **Filtro Rápido por Fecha**: Scroll horizontal para seleccionar días específicos del historial.
- **Desglose de Pago**: Indica la hora exacta y el método utilizado.

### 4. Gestión de Impresión
Módulo dedicado para la configuración de hardware:
- **Búsqueda de Impresoras**: Conectividad Bluetooth para impresoras térmicas.
- **Generación de Tickets**: Capacidad de imprimir comprobantes directamente desde la administración.

---

## 📊 Lógica de Negocio (`chartHelpers.js`)
El sistema utiliza transformaciones avanzadas para procesar los datos crudos de Supabase:
- **`calculateStats`**: Calcula automáticamente el producto más vendido, el de menor rotación y la hora pico de ventas.
- **`processSalesData`**: Ordena cronológicamente las ventas para evitar errores de visualización entre cambios de mes.
- **`processHourData`**: Agrupa pedidos en rangos de 2 horas para facilitar la lectura de tendencias horarias.

---

## 🔧 Configuración e Instalación

### Requisitos Previos
- Node.js (v16+)
- Expo CLI
- Cuenta en Supabase con la tabla `pedidos` configurada.

### Pasos
1. **Clonar el repositorio**:
   ```bash
   git clone [url-del-repo]
   ```
2. **Instalar dependencias**:
   ```bash
   npm install
   ```
3. **Variables de Entorno**:
   Configurar las credenciales de Supabase en `src/services/supabase.js`.
4. **Iniciar en Desarrollo**:
   ```bash
   npx expo start
   ```

---

## 🔮 Roadmap / Próximas Mejoras
- [ ] **IA Analyst**: Integración profunda con DeepSeek para ofrecer recomendaciones automáticas sobre compras de insumos basadas en tendencias de venta.
- [ ] **Gestión de Inventario**: Módulo para registrar mermas y costos operativos.
- [ ] **Notificaciones Push**: Alertas en tiempo real cuando se alcancen metas de venta diarias.
- [ ] **Exportación de Reportes**: Generación de archivos PDF/Excel con el cierre de mes.

---

## 🎨 Guía de Estilo
La aplicación sigue una línea estética **Dark/Premium** con acentos en rojo:
- **Color Primario**: `#ff0000` (Ryu Red)
- **Fondo**: `#f5f7fa` (Gris claro premium)
- **Tipografía**: Bold para encabezados, Regular para datos secundarios.
- **Sombras**: Elevation 3-10 para crear profundidad de capas.

---
*Documentación generada para Ryu Sushi - 2026*
