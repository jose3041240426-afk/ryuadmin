# Pasos para implementar Impresión Térmica Nativa en React Native (Expo)

Para que el código de `PrinterService.js` y `PrinterScreen.js` funcione en tu aplicación, debes seguir estos pasos exactamente.

## 1. Instalar la librería
Abre la terminal en la raíz de tu proyecto de React Native y ejecuta:
\`\`\`bash
npm install react-native-thermal-receipt-printer
\`\`\`

## 2. Configurar Permisos en app.json o eas.json
Como estamos usando Bluetooth, Android requiere permisos explícitos.
Abre tu archivo \`app.json\` y dentro de la llave \`"android"\`, añade los siguientes permisos:

\`\`\`json
"android": {
  "permissions": [
    "android.permission.BLUETOOTH",
    "android.permission.BLUETOOTH_ADMIN",
    "android.permission.BLUETOOTH_CONNECT",
    "android.permission.BLUETOOTH_SCAN",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
\`\`\`

*(Nota: Location es necesario en Android para que funcione el escáner de dispositivos Bluetooth)*

## 3. Compilar un Custom Dev Client (Importante)
Las librerías que tocan el hardware Bluetooth **no funcionan en Expo Go**. 
Si estás usando EAS, debes instalar el dev-client:
\`\`\`bash
npx expo install expo-dev-client
\`\`\`

Y luego compilar la app para probarla en tu dispositivo físico (tablet o celular):
\`\`\`bash
eas build --profile development --platform android
\`\`\`
*(Instalas el APK que te arroje EAS en tu dispositivo y corres `npx expo start --dev-client`)*

## 4. Integrar la Pantalla
Importa \`PrinterScreen.js\` en el archivo de navegación de tu proyecto, o rénderizalo en la pantalla donde necesites que el usuario escoja la impresora.

\`\`\`javascript
import PrinterScreen from './impresion/PrinterScreen';

// Úsalo como cualquier otro componente:
<PrinterScreen />
\`\`\`
