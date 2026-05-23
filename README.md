# Presupuestador Laviana

App de cotizaciones para Qué Autos y Foton Malaspina.

## 🚀 Cómo subirlo a Vercel (paso a paso)

### Opción 1: Subida directa desde la web (más fácil)

1. Andá a **github.com** y entrá con tu cuenta
2. Click en el botón verde **"New"** (o "+" arriba a la derecha → "New repository")
3. Nombre del repositorio: `presupuestador-laviana`
4. Dejá los demás campos como están (público está bien)
5. Click en **"Create repository"**
6. En la pantalla nueva, click en **"uploading an existing file"** (texto en azul)
7. Arrastrá TODOS los archivos y carpetas de este zip (menos `node_modules` si está)
8. Abajo, click en **"Commit changes"**

### Conectar con Vercel

1. Andá a **vercel.com/new**
2. Vas a ver una lista de tus repositorios de GitHub
3. Buscá `presupuestador-laviana` y click en **"Import"**
4. NO cambies ninguna configuración, solo click en **"Deploy"**
5. Esperá 1-2 minutos
6. ¡Listo! Te muestra el link de tu app

### Después del primer deploy

Te queda una URL tipo: `https://presupuestador-laviana.vercel.app`

- **Compartila** con los vendedores
- **En el celular**: abrila → toca el menú (los 3 puntitos) → "Agregar a pantalla de inicio" → queda como app
- **En la PC**: guardala como marcador o como app del navegador

## 🔄 Cómo actualizar la app

Cuando Claude te pase un código nuevo:

1. Andá a GitHub → tu repositorio
2. Entrá al archivo que cambió (ej: `src/App.jsx`)
3. Click en el lápiz ✏️ arriba a la derecha
4. Pegá el nuevo código
5. Click en **"Commit changes"**
6. Vercel detecta el cambio y publica solo (1-2 min)

## 📁 Estructura del proyecto

```
presupuestador-app/
├── src/
│   ├── App.jsx          ← El código principal
│   ├── main.jsx         ← Punto de entrada
│   └── index.css        ← Estilos globales
├── public/
│   ├── manifest.json    ← Config PWA
│   └── icon.svg         ← Ícono
├── package.json         ← Dependencias
├── vite.config.js       ← Config build
├── tailwind.config.js   ← Config estilos
└── index.html           ← HTML base
```
