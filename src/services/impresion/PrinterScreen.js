import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PrinterService from './PrinterService';

const PrinterScreen = () => {
  const [printers, setPrinters] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState(null);

  useEffect(() => {
    // Inicializar el servicio de bluetooth cuando cargue la pantalla
    PrinterService.init();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    const devices = await PrinterService.scanPrinters();
    setPrinters(devices || []);
    setIsScanning(false);
  };

  const handleConnect = async (printer) => {
    // La propiedad que contiene la MAC Address suele llamarse 'inner_mac_address' o 'mac_address' dependiendo del OS
    const macAddress = printer.inner_mac_address || printer.mac_address;
    const success = await PrinterService.connect(macAddress);
    if (success) {
      setConnectedPrinter(printer);
    }
  };

  const handlePrintTest = () => {
    PrinterService.printTestTicket();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración de Impresora térmica</Text>

      <Button title="Buscar Impresoras Bluetooth" onPress={handleScan} />

      {isScanning && <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 20 }} />}

      <FlatList
        data={printers}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.printerItem}
            onPress={() => handleConnect(item)}
          >
            <Text style={styles.printerName}>{item.device_name || 'Dispositivo Desconocido'}</Text>
            <Text>{item.inner_mac_address || item.mac_address}</Text>
          </TouchableOpacity>
        )}
      />

      {connectedPrinter && (
        <View style={styles.connectedBox}>
          <Text style={{ fontWeight: 'bold', color: 'green' }}>
            Conectado a: {connectedPrinter.device_name}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Button title="Imprimir Ticket de Prueba" onPress={handlePrintTest} color="green" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  printerItem: { padding: 15, borderBottomWidth: 1, borderColor: '#ccc', marginVertical: 5, backgroundColor: '#f9f9f9' },
  printerName: { fontSize: 16, fontWeight: 'bold' },
  connectedBox: { marginTop: 20, padding: 15, borderWidth: 1, borderColor: 'green', borderRadius: 8 }
});

export default PrinterScreen;
