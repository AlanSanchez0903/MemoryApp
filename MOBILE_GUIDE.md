# Guía para generar un APK de la app de memoria

Esta guía parte del estado actual del proyecto:
- La app Flask sirve la SPA en `/` y los assets en `/static`.
- Ya tiene `manifest.json` y `service-worker.js` enlazados (PWA lista).

Puedes 1) usarla como **PWA** (instalable desde el navegador) o 2) empaquetarla en un **APK** con Capacitor.

## 1) Instalar como PWA (sin APK)
1. Publica tu backend Flask en HTTPS (ej. Render, Railway, Vercel con un proxy, servidor propio con Nginx).
2. Abre la URL en Android/Chrome o iOS/Safari, espera el banner o usa el menú ⋮ → "Agregar a pantalla principal".
3. El service worker cachea `/`, CSS, JS, logo y manifest para uso básico offline.

## 2) Generar un APK con Capacitor (Android)
### Requisitos
- Node.js 18+ y Java/Android Studio instalados en tu equipo local.
- El backend Flask accesible localmente en `http://127.0.0.1:5000` (para copiar archivos) o desplegado en internet si lo consumirás de forma remota.

### Pasos
1. **Crear proyecto Capacitor en una carpeta nueva (hermana de `MemoryApp/`):**
   ```bash
   mkdir memory-mobile && cd memory-mobile
   npm init -y
   npm install @capacitor/core @capacitor/cli
   npx cap init memory-app com.tuempresa.memoryapp --web-dir=www
   ```
2. **Generar la carpeta `www` con tu frontend renderizado:**
   - Inicia Flask en otra terminal: `FLASK_APP=run.py flask run --host=127.0.0.1 --port=5000`.
   - Copia la página ya renderizada y los estáticos:
     ```bash
     mkdir -p www/static
     curl http://127.0.0.1:5000/ -o www/index.html
     cp -r ../MemoryApp/src/static/* www/static/
     ```
   - Si tu API quedará remota, actualiza las URLs `fetch(...)` de tu JS (si las hubiera) para apuntar al dominio público de Flask.
3. **Añadir Android:**
   ```bash
   npx cap add android
   ```
4. **Actualizar assets tras cada cambio:**
   ```bash
   npx cap copy android
   ```
5. **Abrir en Android Studio y generar el APK/AAB:**
   - Abre `android/` con Android Studio.
   - Asegura que en `android/app/src/main/AndroidManifest.xml` esté el permiso de Internet si consumes el backend remoto:
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     ```
   - En Android Studio: *Build* → *Generate Signed Bundle / APK* → elige `APK` o `Android App Bundle`, crea/usa un keystore y genera el archivo.
   - Prueba en emulador o dispositivo real.

### Notas finales
- El service worker funciona cuando la app se sirve por HTTP/HTTPS; en una WebView puede no ser necesario, pero no estorba para la versión web.
- Si prefieres que la WebView cargue directamente tu servidor Flask (sin empaquetar HTML), en `capacitor.config.ts` usa:
  ```ts
  server: { url: 'https://tu-dominio-flask.com', cleartext: false }
  ```
  y reconstruye con `npx cap sync android`.
