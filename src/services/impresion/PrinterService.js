import { BLEPrinter } from 'react-native-thermal-receipt-printer';
import { Alert } from 'react-native';

class PrinterService {
  constructor() {
    this.currentPrinter = null;
  }

  // 1. Inicializar el servicio de Bluetooth
  async init() {
    try {
      await BLEPrinter.init();
      console.log('Servicio de impresora Bluetooth inicializado');
      return true;
    } catch (error) {
      console.error('Error inicializando impresora:', error);
      Alert.alert('Error', 'No se pudo inicializar el servicio Bluetooth. Asegúrate de tenerlo encendido.');
      return false;
    }
  }

  // 2. Buscar dispositivos Bluetooth cercanos
  async scanPrinters() {
    try {
      const printers = await BLEPrinter.getDeviceList();
      // Retorna una lista de objetos, usualmente con { device_name, inner_mac_address }
      return printers;
    } catch (error) {
      console.error('Error buscando impresoras:', error);
      return [];
    }
  }

  // 3. Conectarse a una impresora específica
  async connect(macAddress) {
    try {
      const printer = await BLEPrinter.connectPrinter(macAddress);
      this.currentPrinter = printer;
      console.log('Conectado a:', printer);
      return true;
    } catch (error) {
      console.error('Error conectando a la impresora:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar a la impresora seleccionada.');
      return false;
    }
  }

  // 4. Imprimir un ticket de prueba
  async printTestTicket() {
    if (!this.currentPrinter) {
      Alert.alert('Aviso', 'Primero debes conectar una impresora.');
      return;
    }

    try {
      // Formato básico ESC/POS. 
      // <C> = Center, <B> = Bold, \n = Salto de línea
      const textToPrint = `
<C><B>MI TIENDA DE PRUEBA</B></C>
--------------------------------
1x Articulo de Prueba    $10.00
1x Servicio Técnico      $50.00
--------------------------------
<C><B>TOTAL: $60.00</B></C>

¡Gracias por tu compra!

\n\n\n`;

      await BLEPrinter.printText(textToPrint);
      console.log('Ticket impreso con éxito');
    } catch (error) {
      console.error('Error al imprimir:', error);
      Alert.alert('Error de impresión', 'Ocurrió un problema al enviar el texto a la impresora.');
    }
  }
}

export default new PrinterService();
