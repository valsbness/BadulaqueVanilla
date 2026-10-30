# Badulaque Vanilla

Panel inicial de administración para Badulaque Vanilla.

## Incluye
- Calculadora convencional.
- Inventario con costo, precio de venta y existencias.
- Registro de ventas que descuenta existencias y calcula ingresos y ganancia estimada.
- Resumen de ventas diarias, ventas acumuladas y capital invertido en existencias.
- Eventos independientes con premio, imagen, participantes, celular y cantidad de participaciones.
- Ruleta aleatoria y pantalla de ganador con confeti e imagen del premio.

## Cómo abrir
Descarga y descomprime el proyecto. Abre `index.html` en Chrome o Edge.

## Almacenamiento
Esta primera versión guarda la información en el almacenamiento local del navegador (`localStorage`). Por eso permanece en el mismo navegador y dispositivo. No borres los datos del sitio si quieres conservarlos. Para sincronizar entre varios dispositivos o usuarios habrá que conectar una base de datos (por ejemplo Supabase) y configurar sus credenciales y políticas.

## Archivos
- `index.html`: estructura de la aplicación.
- `style.css`: diseño adaptable a PC y móvil.
- `app.js`: inventario, ventas, calculadora y sorteos.
