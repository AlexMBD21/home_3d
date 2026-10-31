# Habitación 3D Interactiva – Portafolio

Portafolio web inmersivo interactivo en 3D desarrollado con Three.js y Vite.

## 🚀 Características

- **Habitación 3D interactiva**: Navegación en primera persona, rotación orbital suave y soporte táctil con joystick virtual en dispositivos móviles.
- **Doble monitor interactivo**: Interfaz integrada simulando Visual Studio Code con pestañas de proyectos y código fuente.
- **Tocadiscos con audio interactivo**: Reproducción de música con análisis en tiempo real mediante Web Audio API.
- **Almacenamiento en la nube**: Modelos 3D (GLTF/GLB), texturas y audio optimizados y servidos desde Supabase Storage.
- **Diseño responsive**: Optimizado para pantallas de escritorio, tablets y móviles.

## 🛠️ Tecnologías

- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- [Anime.js](https://animejs.com/)
- [Supabase](https://supabase.com/)

## 📦 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/AlexMBD21/home_3d.git
   cd home_3d
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   Copiar `.env.example` a `.env` con las credenciales de Supabase.

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Compilar para producción:
   ```bash
   npm run build
   ```
