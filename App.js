import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator, Dimensions, Modal, Animated, Vibration, useColorScheme, Switch, TextInput, KeyboardAvoidingView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './src/services/supabase';
import {
  processSalesData,
  processProductData,
  processHourData,
  processPaymentData,
  calculateStats,
  getDailyBreakdown,
  processWeeklyComparisonData
} from './src/utils/chartHelpers';
import LimelightNav from './src/components/ui/LimelightNav';
import { getAIPredictions, sendAIChatMessage } from './src/services/gemini';

const AnimatedView = ({ children, style }) => {
  return <View style={style}>{children}</View>;
};

const AnimatedChatMessage = ({ msg, isDark }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  let contentText = msg.content;
  let uiData = null;

  if (msg.role === 'assistant') {
    try {
      const parsed = JSON.parse(msg.content);
      contentText = parsed.text || '';
      uiData = parsed.ui;
    } catch (e) {
      // Fallback si no es JSON
      contentText = msg.content;
    }
  }

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
      backgroundColor: msg.role === 'user' ? '#FF0000' : (isDark ? '#252525' : '#f0f0f0'),
      padding: 15,
      paddingHorizontal: 18,
      borderRadius: 22,
      borderBottomRightRadius: msg.role === 'user' ? 4 : 22,
      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 22,
      marginBottom: 12,
      maxWidth: '85%',
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 }
    }}>
      <Text style={{ 
        color: msg.role === 'user' ? '#fff' : (isDark ? '#fff' : '#333'), 
        fontSize: 15, 
        lineHeight: 22,
        fontWeight: msg.role === 'assistant' ? '500' : '400'
      }}>
        {contentText}
      </Text>
      
      {/* A2UI RENDERER */}
      {uiData && uiData.type === 'bar_chart' && (
        <View style={{ marginTop: 15, backgroundColor: isDark ? '#1a1a1a' : '#fff', padding: 12, borderRadius: 12, overflow: 'hidden' }}>
          <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
            {uiData.title}
          </Text>
          <BarChart
            data={{
              labels: uiData.labels,
              datasets: [{ data: uiData.data }]
            }}
            width={Dimensions.get('window').width * 0.65}
            height={160}
            yAxisLabel=""
            fromZero={true}
            chartConfig={{
              backgroundColor: isDark ? '#1a1a1a' : '#fff',
              backgroundGradientFrom: isDark ? '#1a1a1a' : '#fff',
              backgroundGradientTo: isDark ? '#1a1a1a' : '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              barPercentage: 0.6,
            }}
            style={{ borderRadius: 8, marginLeft: -20 }}
            showValuesOnTopOfBars
          />
        </View>
      )}
    </Animated.View>
  );
};

const TypingIndicator = ({ isDark }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF0000',
    marginHorizontal: 3,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }]
  });

  return (
    <View style={{
      alignSelf: 'flex-start',
      backgroundColor: isDark ? '#252525' : '#f0f0f0',
      padding: 18,
      borderRadius: 22,
      borderBottomLeftRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15
    }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [fontSizeMult, setFontSizeMult] = useState(1);
  const [visibleCharts, setVisibleCharts] = useState({
    weekly: true,
    products: true,
    hours: true,
    payments: true,
    orders: true
  });
  const [aiResponse, setAiResponse] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  const chatScrollRef = useRef(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_preference');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
        const savedFont = await AsyncStorage.getItem('@font_preference');
        if (savedFont !== null) {
          setFontSizeMult(parseFloat(savedFont));
        }
        const savedCharts = await AsyncStorage.getItem('@visible_charts');
        if (savedCharts !== null) {
          setVisibleCharts(JSON.parse(savedCharts));
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  const handleFontSizeChange = async (multiplier) => {
    setFontSizeMult(multiplier);
    try {
      await AsyncStorage.setItem('@font_preference', multiplier.toString());
    } catch (error) {
      console.error('Error saving font:', error);
    }
  };

  const toggleChart = async (chartKey) => {
    const newVisibleCharts = { ...visibleCharts, [chartKey]: !visibleCharts[chartKey] };
    setVisibleCharts(newVisibleCharts);
    try {
      await AsyncStorage.setItem('@visible_charts', JSON.stringify(newVisibleCharts));
    } catch (error) {
      console.error('Error saving chart visibility:', error);
    }
  };

  const generatePDFReport = async (type = '7D') => {
    try {
      const title = type === '7D' ? 'Reporte Semanal' : 'Reporte Mensual';
      const dateRange = type === '7D' ? 'Últimos 7 días' : 'Últimos 30 días';

      const formatCurrency = (val) => {
        return new Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
              .header { text-align: center; border-bottom: 4px solid #ff0000; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { color: #ff0000; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; }
              .header p { margin: 5px 0; color: #666; font-size: 13px; }
              
              .stats-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
              .stat-box { background: #fdf2f2; padding: 15px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid #ffebeb; }
              .stat-label { font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; display: block; }
              .stat-val { font-size: 20px; font-weight: bold; color: #ff0000; }
              
              .section-title { color: #1a1a1a; border-left: 5px solid #ff0000; padding-left: 12px; margin: 25px 0 15px 0; font-size: 18px; text-transform: uppercase; }
              
              .grid-2 { display: flex; gap: 20px; margin-bottom: 20px; }
              .grid-item { flex: 1; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 15px; }
              
              table { width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px; }
              th { background: #f4f4f4; color: #333; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #eee; }
              td { border-bottom: 1px solid #eee; padding: 10px; font-size: 12px; color: #444; }
              .val-col { text-align: right; font-weight: bold; }
              
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
              .highlight { color: #ff0000; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>RYU SUSHI ADMIN</h1>
              <p>${title} - Análisis de Negocio</p>
              <p>Periodo: ${dateRange} | Generado: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-label">Ventas Totales</span>
                <span class="stat-val">$${formatCurrency(stats.totalSales)}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Total Pedidos</span>
                <span class="stat-val">${pedidos.length}</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Ticket Promedio</span>
                <span class="stat-val">$${formatCurrency(stats.averageTicket)}</span>
              </div>
            </div>

            <div class="grid-2">
              <div class="grid-item">
                <div class="section-title" style="margin-top: 0;">Productos Estrella</div>
                <table>
                  <thead>
                    <tr><th>Producto</th><th class="val-col">Vendidos</th></tr>
                  </thead>
                  <tbody>
                    ${pieChartData.map(p => `
                      <tr>
                        <td>${p.name}</td>
                        <td class="val-col">${p.population}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div class="grid-item">
                <div class="section-title" style="margin-top: 0;">Horas Pico</div>
                <table>
                  <thead>
                    <tr><th>Rango Horario</th><th class="val-col">Pedidos</th></tr>
                  </thead>
                  <tbody>
                    ${barChartData.labels.map((h, i) => `
                      <tr>
                        <td>${h}</td>
                        <td class="val-col">${barChartData.datasets[0].data[i]}</td>
                      </tr>
                    `).slice(0, 5).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section-title">Desempeño por Día (Semana Actual vs Pasada)</div>
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th class="val-col">Esta Semana</th>
                  <th class="val-col">Semana Pasada</th>
                  <th class="val-col">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                ${weeklyComparisonData.labels.map((label, i) => {
        const thisWeek = weeklyComparisonData.data[i][0];
        const lastWeek = weeklyComparisonData.data[i][1];
        const diff = thisWeek - lastWeek;
        const color = diff >= 0 ? '#00a650' : '#ff0000';
        return `
                    <tr>
                      <td>${label}</td>
                      <td class="val-col">$${formatCurrency(thisWeek)}</td>
                      <td class="val-col">$${formatCurrency(lastWeek)}</td>
                      <td class="val-col" style="color: ${color}">${diff >= 0 ? '+' : ''}$${formatCurrency(diff)}</td>
                    </tr>
                  `;
      }).join('')}
              </tbody>
            </table>

            ${aiResponse ? `
            <div style="background: #f8f5ff; border: 1px solid #e0d5f5; border-radius: 12px; padding: 20px; margin-top: 30px;">
              <div style="color: #8E54E9; font-weight: bold; font-size: 16px; margin-bottom: 15px; text-transform: uppercase; display: flex; align-items: center;">
                Análisis Estratégico IA Ryu
              </div>
              <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                <div style="flex: 1;">
                  <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold;">Estimación Próxima Jornada</span>
                  <div style="font-size: 20px; font-weight: bold; color: #8E54E9;">$${formatCurrency(aiResponse.nextSessionEstimate || 0)}</div>
                </div>
                <div style="flex: 1;">
                  <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold;">Confianza de Análisis</span>
                  <div style="font-size: 20px; font-weight: bold; color: #8E54E9;">${aiResponse.confidenceScore || 0}%</div>
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <span style="font-size: 11px; font-weight: bold; color: #333;">Estrategia Recomendada:</span>
                <p style="font-size: 12px; color: #444; margin: 5px 0;">${aiResponse.strategy || 'No disponible'}</p>
              </div>
              
              <div>
                <span style="font-size: 11px; font-weight: bold; color: #333;">Sugerencia de Promoción:</span>
                <p style="font-size: 12px; color: #444; margin: 5px 0;">${aiResponse.promotionSuggestion || 'No disponible'}</p>
              </div>
              
              <div style="margin-top: 15px; font-style: italic; font-size: 10px; color: #888;">
                * Análisis predictivo generado automáticamente mediante inteligencia artificial basado en tendencias de ventas y comportamiento de productos.
              </div>
            </div>
            ` : ''}

            <div class="footer">
              <p>Análisis de datos basado en registros de base de datos en tiempo real.</p>
              <p>&copy; ${new Date().getFullYear()} Ryu Sushi. Confidencial y de uso administrativo.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      showNotification('Éxito', 'Reporte analítico generado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification('Error', 'No se pudo generar el reporte');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || sendingChat) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];

    setChatMessages(newMessages);
    setChatInput('');
    setSendingChat(true);

    // Calcular estadísticas detalladas para el chat
    const catalog = ["Torrelo", "Vaquero", "Mar y tierra", "Camaron", "Surimi", "Costeño", "Gallinazo", "Res", "Vegetariano", "Ryu burro", "Flamin", "Goliat", "Combo 1", "Combo 2", "Combo 3", "Combo 4", "Combo 5", "Combo 6", "Papas Gajo", "Papas Francesa"];

    // 1. Ventas EXACTAS por fecha (no agrupadas por día de la semana)
    const salesByExactDate = {};
    pedidos.forEach(p => {
      if (p.time) {
        const d = new Date(p.time);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayName = d.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase();
        if (!salesByExactDate[dateKey]) salesByExactDate[dateKey] = { total: 0, day: dayName, orders: 0 };
        salesByExactDate[dateKey].total += p.total || 0;
        salesByExactDate[dateKey].orders += 1;
      }
    });
    // Redondear totales para evitar decimales flotantes falsos
    Object.keys(salesByExactDate).forEach(k => {
      salesByExactDate[k].total = Math.round(salesByExactDate[k].total * 100) / 100;
    });

    // Calcular venta de hoy
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todaySales = salesByExactDate[todayKey]?.total || 0;
    const localDay = now.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase();

    // 2. Comparativa semanal (Esta semana vs Semana pasada por día)
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const weekComparison = {};
    daysOfWeek.forEach((d, i) => {
      weekComparison[d] = {
        estaSemana: Math.round(weeklyComparisonData.data[i][0] * 100) / 100,
        semanaPasada: Math.round(weeklyComparisonData.data[i][1] * 100) / 100
      };
    });

    // 3. Lista completa de productos agrupados por nombre base
    const productStats = {};
    const combos = catalog.filter(c => c.toLowerCase().includes('combo'));
    const baseItems = catalog.filter(c => !c.toLowerCase().includes('combo'));

    const flavors = ["Natural", "BBQ", "Búfalo", "Mango Habanero", "Infierno"];

    // 3b. Desglose de productos POR FECHA para que la IA sepa qué se vendió cada día
    const productsByDate = {};

    pedidos.forEach(p => {
      const dateKey = p.time ? (() => {
        const d = new Date(p.time);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })() : null;

      p.items?.forEach(item => {
        const fullName = item.name || '';
        const lowerName = fullName.toLowerCase();
        let baseName = '';

        if (lowerName.includes('combo')) {
          const foundCombo = combos.find(c => lowerName.includes(c.toLowerCase()));
          baseName = foundCombo || fullName.split(/[\s:(]/)[0].trim();
        } else if (lowerName.includes('alita') || lowerName.includes('boneless')) {
          const isAlita = lowerName.includes('alita');
          const flavor = flavors.find(f => lowerName.includes(f.toLowerCase()));
          baseName = `${isAlita ? 'Alitas' : 'Boneless'} ${flavor || '(Sencillo)'}`;
        } else {
          // Intentar encontrar en el catálogo (ej: "Torrelo")
          const found = catalog.find(c => lowerName.includes(c.toLowerCase()));
          baseName = found || fullName.split(/[\s:(]/)[0].trim();
        }

        productStats[baseName] = (productStats[baseName] || 0) + 1;

        // Guardar desglose por fecha
        if (dateKey) {
          if (!productsByDate[dateKey]) productsByDate[dateKey] = {};
          productsByDate[dateKey][baseName] = (productsByDate[dateKey][baseName] || 0) + 1;
        }
      });
    });

    // 4. Productos sin ventas — Incluir todo el catálogo
    const unsold = catalog.filter(item => !productStats[item]);

    try {
      // Preparar resumen de predicciones si existen
      const predictions = aiResponse ? {
        nextSessionEstimate: aiResponse.nextSessionEstimate,
        next3DaysEstimate: aiResponse.next3DaysEstimate,
        weeklyForecast: aiResponse.weeklyForecast,
        monthlyForecast: aiResponse.monthlyForecast,
        growthPercentage: aiResponse.growthPercentage,
        confidenceScore: aiResponse.confidenceScore,
        busiestDayPrediction: aiResponse.busiestDayPrediction,
        bestHourPrediction: aiResponse.bestHourPrediction,
        reasoning: aiResponse.reasoning,
        strategy: aiResponse.strategy,
        promotionSuggestion: aiResponse.promotionSuggestion,
        shortAnalysis: aiResponse.shortAnalysis,
        jornadaStatus: aiResponse._jornadaStatus,
        nextJornadaDay: aiResponse._nextJornadaDay
      } : null;

      const response = await sendAIChatMessage(newMessages, {
        stats: processedData.stats,
        salesByExactDate,
        weekComparison,
        todaySales,
        productStats,
        productsByDate,
        unsoldProducts: unsold,
        hourlyData: processedData.barChartData,
        dateFilter: dateFilter, // Pasar el filtro actual para que la IA sepa qué periodo está viendo
        timeRange: dateFilter === 'Today' ? 'Hoy' : (dateFilter === '7D' ? 'Últimos 7 días' : (dateFilter === '30D' ? 'Últimos 30 días' : 'Todo el tiempo')),
        localDate: now.toLocaleDateString('es-MX'),
        localDay: localDay,
        currentTimestamp: now.toISOString(),
        aiPredictions: predictions
      });
      setChatMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat Error:', error);
      showNotification('Error', 'No se pudo conectar con el consultor');
    } finally {
      setSendingChat(false);
    }
  };

  const runAIAnalysis = async () => {
    if (loading || analyzing) return;
    setAnalyzing(true);
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.toLocaleDateString('es-MX', { weekday: 'long' });

      // Horarios reales de Ryu Sushi
      // Lun, Mar, Jue, Vie, Dom = 16:30 - 23:00
      // Sáb = 18:00 - 23:00
      // Mié = CERRADO
      const schedule = {
        0: { open: 16.5, close: 23, name: 'domingo' },    // Dom
        1: { open: 16.5, close: 23, name: 'lunes' },      // Lun
        2: { open: 16.5, close: 23, name: 'martes' },     // Mar
        3: null,                                             // Mié - CERRADO
        4: { open: 16.5, close: 23, name: 'jueves' },     // Jue
        5: { open: 16.5, close: 23, name: 'viernes' },    // Vie
        6: { open: 18,   close: 23, name: 'sábado' },     // Sáb
      };

      const currentMinutes = now.getMinutes();
      const currentTimeDecimal = currentHour + (currentMinutes / 60); // ej: 16:30 = 16.5
      const todaySchedule = schedule[now.getDay()];

      // Buscar próximo día abierto (para cuando estamos cerrados)
      const getNextOpenDay = (fromDate) => {
        const check = new Date(fromDate);
        for (let i = 1; i <= 7; i++) {
          check.setDate(check.getDate() + 1);
          const daySchedule = schedule[check.getDay()];
          if (daySchedule) {
            const dayName = check.toLocaleDateString('es-MX', { weekday: 'long' });
            const openTime = daySchedule.open === 18 ? '18:00' : '16:30';
            return { dayName, openTime, daysAhead: i };
          }
        }
        return { dayName: '?', openTime: '?', daysAhead: 1 };
      };

      let nextJornadaDay;
      let jornadaStatus;

      if (!todaySchedule) {
        // Hoy es MIÉRCOLES (cerrado)
        const next = getNextOpenDay(now);
        nextJornadaDay = next.dayName;
        jornadaStatus = `CERRADO HOY (miércoles). Próxima jornada: ${next.dayName} a las ${next.openTime}`;
      } else if (currentTimeDecimal < todaySchedule.open) {
        // Antes de abrir (ej: son las 00:25, abre a las 16:30)
        const openTime = todaySchedule.open === 18 ? '18:00' : '16:30';
        nextJornadaDay = currentDay;
        jornadaStatus = `CERRADO ahora. La jornada de hoy ${currentDay} INICIA a las ${openTime}`;
      } else if (currentTimeDecimal < todaySchedule.close) {
        // Dentro del horario de operación
        nextJornadaDay = currentDay;
        jornadaStatus = `JORNADA EN CURSO — HOY ${currentDay} (cierra a las 23:00)`;
      } else {
        // Después de las 23:00, la jornada de hoy terminó
        const next = getNextOpenDay(now);
        nextJornadaDay = next.dayName;
        jornadaStatus = `JORNADA FINALIZADA. Hoy ${currentDay} cerró a las 23:00. Próxima: ${next.dayName} a las ${next.openTime}`;
      }

      // Calcular venta de hoy
      const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const todayEntry = dailyBreakdown.find(d => d.dateStr === todayStr);
      const todaySales = todayEntry ? parseFloat(todayEntry.total) : 0;

      // Separar historial: quitar HOY del historial para que no lo use como "referencia histórica"
      const historicalBreakdown = dailyBreakdown.filter(d => d.dateStr !== todayStr);

      const result = await getAIPredictions({
        stats,
        pedidosLength: pedidos.length,
        dailyBreakdown: historicalBreakdown,
        todaySales,
        todayDay: currentDay,
        hourlyData: barChartData,
        topProducts: pieChartData,
        currentTimestamp: now.toISOString(),
        localDate: now.toLocaleDateString('es-MX'),
        localDay: currentDay,
        currentHour,
        nextJornadaDay,
        jornadaStatus,
        timeRange: dateFilter === 'Today' ? 'Hoy' : (dateFilter === '7D' ? 'Últimos 7 días' : (dateFilter === '30D' ? 'Últimos 30 días' : 'Todo el tiempo'))
      });
      if (result) {
        setAiResponse({
          ...result,
          _jornadaStatus: jornadaStatus,
          _nextJornadaDay: nextJornadaDay,
          _todaySales: todaySales,
          _todayDay: currentDay
        });
      } else {
        showNotification('Error', 'No se pudieron generar las predicciones');
      }
    } catch (error) {
      console.error('AI Prediction Trigger Error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('@theme_preference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };
  const styles = useMemo(() => getStyles(isDark, fontSizeMult), [isDark, fontSizeMult]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [pedidos, setPedidos] = useState([]);
  const [comparisonPedidos, setComparisonPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7D');
  const [showVentasDetalle, setShowVentasDetalle] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [selectedHistorialDate, setSelectedHistorialDate] = useState('All');
  const [selectedComparisonDay, setSelectedComparisonDay] = useState(null);
  const [inAppNotification, setInAppNotification] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const notificationAnim = useRef(new Animated.Value(-100)).current;

  const showNotification = (title, message) => {
    setInAppNotification({ title, message });
    Vibration.vibrate([0, 500, 200, 500]); // Patrón de vibración largo para avisar

    Animated.spring(notificationAnim, {
      toValue: 20, // Baja desde arriba
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
      Animated.timing(notificationAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setInAppNotification(null));
    }, 4000);
  };

  // Suscripción Realtime a nuevos pedidos
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => {
          const newOrder = payload.new;
          showNotification('🍣 ¡Nuevo Pedido!', `${newOrder.clientname || 'Cliente'} — $${newOrder.price?.toFixed(2) || '0.00'}`);
          // Refrescar datos automáticamente
          fetchPedidos();
          fetchComparisonPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter]);

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([fetchPedidos(), fetchComparisonPedidos()]);
    };
    loadAllData();
  }, [dateFilter]);

  // Ejecutar análisis de IA automáticamente después de cargar los pedidos iniciales
  useEffect(() => {
    if (!loading && pedidos.length > 0 && !aiResponse && !analyzing) {
      // Pequeño delay para asegurar que los memos se procesen
      setTimeout(() => {
        runAIAnalysis();
      }, 1000);
    }
  }, [loading, pedidos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPedidos(), fetchComparisonPedidos()]);
    await runAIAnalysis();
    setRefreshing(false);
  };

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('pedidos')
        .select('*')
        .order('time', { ascending: false });

      const now = new Date();
      if (dateFilter === 'Today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('time', today);
      } else if (dateFilter === '7D') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('time', sevenDaysAgo);
      } else if (dateFilter === '30D') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('time', thirtyDaysAgo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching pedidos:', error);
      } else if (data) {
        const grouped = data.reduce((acc, current) => {
          if (!acc[current.clientid]) {
            acc[current.clientid] = {
              clientid: current.clientid,
              clientname: current.clientname,
              time: current.time,
              paymentmethod: current.paymentmethod,
              total: 0,
              items: []
            };
          }
          acc[current.clientid].items.push(current);
          acc[current.clientid].total += current.price;
          return acc;
        }, {});

        const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.time) - new Date(a.time));
        setPedidos(groupedArray);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Siempre trae 14 días para la gráfica comparativa semanal
  const fetchComparisonPedidos = async () => {
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .gte('time', fourteenDaysAgo)
        .order('time', { ascending: false });

      if (error) {
        console.error('Error fetching comparison pedidos:', error);
      } else if (data) {
        const grouped = data.reduce((acc, current) => {
          if (!acc[current.clientid]) {
            acc[current.clientid] = {
              clientid: current.clientid,
              clientname: current.clientname,
              time: current.time,
              paymentmethod: current.paymentmethod,
              total: 0,
              items: []
            };
          }
          acc[current.clientid].items.push(current);
          acc[current.clientid].total += current.price;
          return acc;
        }, {});

        setComparisonPedidos(Object.values(grouped));
      }
    } catch (error) {
      console.error('Error comparison:', error);
    }
  };

  const screenWidth = Dimensions.get("window").width;

  const chartConfig = {
    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientFrom: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientTo: isDark ? '#1e1e1e' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(100, 100, 100, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#ff0000" },
    barPercentage: 0.6
  };

  const processedData = useMemo(() => {
    const { pieData, fullList } = processProductData(pedidos);
    return {
      chartData: processSalesData(pedidos),
      pieChartData: pieData,
      fullProductList: fullList,
      barChartData: processHourData(pedidos),
      paymentChartData: processPaymentData(pedidos),
      dailyBreakdown: getDailyBreakdown(pedidos),
      stats: calculateStats(pedidos),
    };
  }, [pedidos]);

  const weeklyComparisonData = useMemo(() => {
    return processWeeklyComparisonData(comparisonPedidos);
  }, [comparisonPedidos]);

  const { chartData, pieChartData, fullProductList, barChartData, paymentChartData, dailyBreakdown, stats } = processedData;





  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Banner de Notificación In-App */}
      <Animated.View style={[
        styles.notificationBanner,
        { transform: [{ translateY: notificationAnim }] }
      ]}>
        <View style={styles.notificationContent}>
          <Ionicons name="notifications-circle" size={32} color="#fff" />
          <View style={styles.notificationTextContainer}>
            <Text style={styles.notificationTitle}>{inAppNotification?.title}</Text>
            <Text style={styles.notificationMessage}>{inAppNotification?.message}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Header Premium (Ryu Sushi Red) */}
      <LinearGradient
        colors={['#ff0000', '#cc0000']}
        style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Ryu Admin</Text>
        <TouchableOpacity onPress={toggleTheme} style={{ padding: 5 }}>
          <Ionicons name={isDark ? "sunny" : "moon"} size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filtros de Fecha */}
      {activeTab === 'Dashboard' && (
        <View style={styles.filterContainer}>
          {['Today', '7D', '30D', 'All'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, dateFilter === f && styles.filterButtonActive]}
              onPress={() => setDateFilter(f)}
            >
              <Text style={[styles.filterButtonText, dateFilter === f && styles.filterButtonTextActive]}>
                {f === 'Today' ? 'Hoy' : f === '7D' ? '7 días' : f === '30D' ? '30 días' : 'Todo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Contenido Dinámico */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#ff0000"
            colors={["#ff0000"]}
          />
        }
      >
        {activeTab === 'Dashboard' && (
          <View key="dashboard-content">
            {/* Resumen Rápido */}
            <View style={styles.summaryRow}>
              <AnimatedView
                style={[styles.summaryCard, { borderLeftColor: '#00a650', width: '48%' }]}
                delay={100}
              >
                <TouchableOpacity onPress={() => setShowVentasDetalle(true)}>
                  <Text style={styles.summaryLabel}>Ventas Totales</Text>
                  <Text style={styles.summaryValue}>${stats.totalSales}</Text>
                  <Text style={{ fontSize: 10, color: '#00a650', marginTop: 4 }}>Ver detalle →</Text>
                </TouchableOpacity>
              </AnimatedView>

              <AnimatedView
                style={[styles.summaryCard, { borderLeftColor: '#ff0000', width: '48%' }]}
                delay={200}
              >
                <Text style={styles.summaryLabel}>Ticket Prom.</Text>
                <Text style={styles.summaryValue}>${stats.averageTicket}</Text>
              </AnimatedView>
            </View>

            {/* Gráfica de Ventas */}
            <AnimatedView delay={300}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ventas Recientes</Text>
                {!loading && pedidos.length > 0 ? (
                  <LineChart
                    data={chartData}
                    width={screenWidth - 80}
                    height={200}
                    yAxisLabel="$"
                    chartConfig={chartConfig}
                    bezier
                    style={{ marginVertical: 10, borderRadius: 16, alignSelf: 'center' }}
                  />
                ) : (
                  <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#ff0000" />
                    ) : (
                      <Text style={styles.cardText}>Sin datos para este periodo</Text>
                    )}
                  </View>
                )}
              </View>
            </AnimatedView>

            {/* Gráfica de Comparativa Semanal (Custom) */}
            {visibleCharts.weekly && (
              <AnimatedView delay={400}>
                <View style={[styles.card, { backgroundColor: isDark ? '#1e1e1e' : '#ffffff' }]}>
                  <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#333' }]}>Comparativa Semanal</Text>
                  {!loading && weeklyComparisonData.data.length > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 5, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff0000', marginRight: 5 }} />
                          <Text style={{ fontSize: 12, color: isDark ? '#fff' : '#333', fontWeight: 'bold' }}>Esta Semana</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: isDark ? '#ffffff' : '#000000', marginRight: 5 }} />
                          <Text style={{ fontSize: 12, color: isDark ? '#fff' : '#333', fontWeight: 'bold' }}>Semana Pasada</Text>
                        </View>
                      </View>

                      {/* Custom Overlapping Bar Chart */}
                      <View style={{ height: 220, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 5, paddingBottom: 30, paddingTop: 10 }}>
                        {weeklyComparisonData.labels.map((label, index) => {
                          const thisWeek = weeklyComparisonData.data[index][0];
                          const lastWeek = weeklyComparisonData.data[index][1];
                          // Obtener el valor máximo para escalar las barras, si no hay usar 1
                          const allValues = weeklyComparisonData.data.flat();
                          const maxVal = Math.max(...allValues, 1);

                          const thisWeekHeight = (thisWeek / maxVal) * 160;
                          const lastWeekHeight = (lastWeek / maxVal) * 160;

                          // Lógica de solapamiento: la barra más alta va atrás (más ancha)
                          const isThisWeekTaller = thisWeek >= lastWeek;

                          return (
                            <TouchableOpacity
                              key={index}
                              onPress={() => setSelectedComparisonDay(index === selectedComparisonDay ? null : index)}
                              activeOpacity={0.7}
                              style={{ alignItems: 'center', width: 35, height: 160, justifyContent: 'flex-end' }}
                            >
                              <View style={{
                                width: 28,
                                height: 160,
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                borderWidth: selectedComparisonDay === index ? 2 : 0,
                                borderColor: '#ff0000',
                                borderRadius: 8,
                                paddingBottom: 2
                              }}>
                                {/* Barra Trasera (La mayor) */}
                                <View style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  width: 24,
                                  height: isThisWeekTaller ? thisWeekHeight : lastWeekHeight,
                                  backgroundColor: isThisWeekTaller ? '#ff0000' : (isDark ? '#ffffff' : '#000000'),
                                  borderRadius: 4,
                                  opacity: 0.9
                                }} />
                                {/* Barra Frontal (La menor) */}
                                <View style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  width: 14,
                                  height: isThisWeekTaller ? lastWeekHeight : thisWeekHeight,
                                  backgroundColor: isThisWeekTaller ? (isDark ? '#ffffff' : '#000000') : '#ff0000',
                                  borderRadius: 4,
                                  zIndex: 10,
                                  elevation: 5,
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.2,
                                  shadowRadius: 2
                                }} />
                              </View>
                              <Text style={{
                                position: 'absolute',
                                bottom: -25,
                                fontSize: 11,
                                color: selectedComparisonDay === index ? '#ff0000' : '#666',
                                fontWeight: selectedComparisonDay === index ? 'bold' : '600'
                              }}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Detalle de la Diferencia */}
                      {selectedComparisonDay !== null && (
                        <View key={`detail-${selectedComparisonDay}`}>
                          <View style={styles.comparisonDetailBox}>
                            <View style={styles.comparisonDetailHeader}>
                              <Text style={styles.comparisonDetailTitle}>
                                Detalle: {weeklyComparisonData.labels[selectedComparisonDay]}
                              </Text>
                              <TouchableOpacity onPress={() => setSelectedComparisonDay(null)}>
                                <Ionicons name="close-circle" size={20} color={isDark ? '#888' : '#999'} />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.comparisonDetailRow}>
                              <View>
                                <Text style={styles.comparisonDetailLabel}>Esta Semana</Text>
                                <Text style={[styles.comparisonDetailValue, { color: '#ff0000' }]}>
                                  ${weeklyComparisonData.data[selectedComparisonDay][0].toFixed(2)}
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.comparisonDetailLabel}>Semana Pasada</Text>
                                <Text style={[styles.comparisonDetailValue, { color: isDark ? '#ffffff' : '#000000' }]}>
                                  ${weeklyComparisonData.data[selectedComparisonDay][1].toFixed(2)}
                                </Text>
                              </View>
                            </View>

                            {(() => {
                              const diff = weeklyComparisonData.data[selectedComparisonDay][0] - weeklyComparisonData.data[selectedComparisonDay][1];
                              const percent = weeklyComparisonData.data[selectedComparisonDay][1] > 0
                                ? ((diff / weeklyComparisonData.data[selectedComparisonDay][1]) * 100).toFixed(1)
                                : '100';
                              const isPositive = diff >= 0;

                              return (
                                <View style={[styles.comparisonDiffBadge, { backgroundColor: isDark ? (isPositive ? 'rgba(0,166,80,0.15)' : 'rgba(255,0,0,0.15)') : (isPositive ? '#E6F6ED' : '#FFE5E5') }]}>
                                  <Ionicons
                                    name={isPositive ? "trending-up" : "trending-down"}
                                    size={16}
                                    color={isPositive ? '#00a650' : '#ff0000'}
                                  />
                                  <Text style={[styles.comparisonDiffText, { color: isPositive ? '#00a650' : '#ff0000' }]}>
                                    {isPositive ? '+' : ''}${Math.abs(diff).toFixed(2)} ({isPositive ? '+' : ''}{percent}%)
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                      {loading ? (
                        <ActivityIndicator size="small" color="#ff0000" />
                      ) : (
                        <Text style={styles.cardText}>Sin datos para comparar</Text>
                      )}
                    </View>
                  )}
                </View>
              </AnimatedView>
            )}

            {/* Gráfica de Productos Estrella */}
            {visibleCharts.products && (
              <AnimatedView delay={500}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowAllProductsModal(true)}
                  style={styles.card}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Productos Estrella</Text>
                    <Ionicons name="list-outline" size={20} color="#FF0000" />
                  </View>
                  {!loading && pieChartData && pieChartData.length > 0 ? (
                    <PieChart
                      data={pieChartData}
                      width={screenWidth - 80}
                      height={180}
                      chartConfig={chartConfig}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"10"}
                      absolute
                    />
                  ) : (
                    <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={styles.cardText}>{loading ? 'Cargando...' : 'Sin datos'}</Text>
                    </View>
                  )}
                  <Text style={{ textAlign: 'center', color: '#FF0000', fontSize: 11, fontWeight: 'bold', marginTop: 5 }}>Ver lista completa →</Text>
                </TouchableOpacity>
              </AnimatedView>
            )}

            {/* Gráfica de Horas Pico */}
            {visibleCharts.hours && (
              <AnimatedView delay={600}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Horas de Mayor Venta</Text>
                  {!loading && barChartData.labels[0] !== '-' ? (
                    <BarChart
                      data={barChartData}
                      width={screenWidth - 80}
                      height={200}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={chartConfig}
                      style={{ marginVertical: 10, borderRadius: 16 }}
                    />
                  ) : (
                    <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={styles.cardText}>{loading ? 'Cargando...' : 'Sin datos'}</Text>
                    </View>
                  )}
                </View>
              </AnimatedView>
            )}

            {/* Gráfica de Formas de Pago */}
            {visibleCharts.payments && (
              <AnimatedView delay={700}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Métodos de Pago</Text>
                  {!loading && paymentChartData && paymentChartData.length > 0 ? (
                    <PieChart
                      data={paymentChartData}
                      width={screenWidth - 80}
                      height={180}
                      chartConfig={chartConfig}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"15"}
                      absolute
                    />
                  ) : (
                    <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={styles.cardText}>{loading ? 'Cargando...' : 'Sin datos'}</Text>
                    </View>
                  )}
                </View>
              </AnimatedView>
            )}

            {/* Lista de Pedidos */}
            {visibleCharts.orders && (
              <AnimatedView delay={800}>
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={styles.cardTitle}>Últimos Pedidos</Text>
                    <TouchableOpacity onPress={fetchPedidos}>
                      <Text style={{ color: '#ff0000', fontSize: 12, fontWeight: 'bold' }}>Actualizar</Text>
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <ActivityIndicator size="small" color="#ff0000" style={{ marginVertical: 20 }} />
                  ) : !pedidos || pedidos.length === 0 ? (
                    <Text style={styles.cardText}>No hay pedidos recientes.</Text>
                  ) : (
                    (() => {
                      const latest5 = pedidos.slice(0, 5);
                      const groups = latest5.reduce((acc, orden) => {
                        const d = new Date(orden.time);
                        const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(orden);
                        return acc;
                      }, {});

                      return Object.keys(groups).map((date) => (
                        <View key={date}>
                          <View style={styles.dateHeader}>
                            <Text style={styles.dateHeaderText}>{date}</Text>
                          </View>
                          {groups[date].map((orden) => (
                            <View key={orden.clientid || Math.random().toString()} style={styles.pedidoItem}>
                              <View style={styles.pedidoHeader}>
                                <Text style={styles.pedidoName}>{orden.clientname || '?'}</Text>
                                <Text style={styles.pedidoPrice}>${orden.total || 0}</Text>
                              </View>

                              {orden.items && Array.isArray(orden.items) ? orden.items.map((item, index) => (
                                <Text key={index} style={styles.pedidoDetails}>
                                  • {item?.name} {item?.details ? `(${item.details})` : ''}
                                </Text>
                              )) : null}

                              <Text style={styles.pedidoTime}>
                                {orden.time ? new Date(orden.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {orden.paymentmethod?.toUpperCase()}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ));
                    })()
                  )}

                  {!loading && pedidos.length > 5 && (
                    <TouchableOpacity
                      style={styles.verTodosButton}
                      onPress={() => setShowHistorialModal(true)}
                    >
                      <Text style={styles.verTodosText}>Ver todos los pedidos ({pedidos.length}) →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AnimatedView>
            )}
          </View>
        )}

        {activeTab === 'IA' && (
          <AnimatedView key="ia-content" delay={100}>
            {/* Header de Predicciones */}
            <View style={{ paddingHorizontal: 5, marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#fff' : '#1a1a1a' }}>IA Predicciones</Text>
              <Text style={{ fontSize: 13, color: isDark ? '#888' : '#666' }}>Análisis predictivo basado en tendencias actuales</Text>
            </View>

            {!aiResponse ? (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 60, borderStyle: 'dashed', borderWidth: 2, borderColor: '#8E54E9', backgroundColor: 'transparent' }]}>
                <ActivityIndicator color="#8E54E9" size="large" style={{ marginBottom: 20 }} />
                <Text style={[styles.cardText, { textAlign: 'center', fontWeight: '600', color: '#8E54E9' }]}>
                  {analyzing ? 'Ryu IA está analizando tus datos...' : 'Preparando análisis predictivo...'}
                </Text>
              </View>
            ) : (
              <View>
                {/* Header Dinámico */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 24, fontWeight: 'bold' }}>Dashboard Predictivo</Text>
                  <Text style={{ color: '#666', fontSize: 13 }}>Análisis basado en tendencias actuales de Ryu Sushi</Text>
                </View>

                {/* Card Principal: Próxima Jornada */}
                <LinearGradient
                  colors={['#FF0000', '#8B0000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 20, padding: 25, marginBottom: 20, elevation: 8, shadowColor: '#FF0000', shadowOpacity: 0.4, shadowRadius: 10 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' }}>Próxima Jornada ({aiResponse?._nextJornadaDay || '...'})</Text>
                      <Text style={{ color: '#fff', fontSize: 42, fontWeight: 'bold', marginVertical: 5 }}>
                        ${(aiResponse && aiResponse.nextSessionEstimate ? aiResponse.nextSessionEstimate : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                        Hoy {aiResponse?._todayDay}: ${aiResponse?._todaySales || 0}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15 }}>
                      <Ionicons name="trending-up" size={24} color="#fff" />
                    </View>
                  </View>

                  {/* Gráfica de Crecimiento Visual */}
                  <View style={{ marginTop: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ color: '#fff', fontSize: 12 }}>Crecimiento Proyectado</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{aiResponse && aiResponse.growthPercentage ? aiResponse.growthPercentage : 0}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(Math.max(aiResponse?.growthPercentage || 0, 10), 100)}%`, height: '100%', backgroundColor: '#fff' }} />
                    </View>
                  </View>
                </LinearGradient>

                {/* Grid de Proyecciones Temporales */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopWidth: 3, borderTopColor: '#FF0000' }]}>
                    <Text style={{ color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Próx. 3 Días</Text>
                    <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>
                      ${(aiResponse && aiResponse.next3DaysEstimate ? aiResponse.next3DaysEstimate : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </Text>
                  </View>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopWidth: 3, borderTopColor: '#FF0000' }]}>
                    <Text style={{ color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Semana</Text>
                    <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>
                      ${(aiResponse && aiResponse.weeklyForecast ? aiResponse.weeklyForecast : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </Text>
                  </View>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15, backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopWidth: 3, borderTopColor: '#FF0000' }]}>
                    <Text style={{ color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Mes</Text>
                    <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>
                      ${(aiResponse && aiResponse.monthlyForecast ? aiResponse.monthlyForecast : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </Text>
                  </View>
                </View>

                {/* Justificación de la IA */}
                <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa', padding: 15, marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="analytics-outline" size={18} color="#FF0000" style={{ marginRight: 8 }} />
                    <Text style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>Justificación Analítica</Text>
                  </View>
                  <View style={{ backgroundColor: isDark ? '#252525' : '#fff3f3', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: '#FF0000', fontWeight: 'bold' }}>
                      📍 {aiResponse?._jornadaStatus || 'Calculando...'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', lineHeight: 18 }}>
                    {aiResponse && aiResponse.reasoning ? aiResponse.reasoning : 'Calculando lógica de negocio...'}
                  </Text>
                </View>

                {/* Insights y Confianza */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 15 }}>
                  <View style={[styles.card, { flex: 1.2, marginBottom: 0, padding: 15 }]}>
                    <Text style={{ color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 }}>CONFIDENCIA DE LA IA</Text>
                    <View style={{ height: 8, backgroundColor: isDark ? '#333' : '#eee', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${aiResponse?.confidenceScore || 0}%`, height: '100%', backgroundColor: '#00a650' }} />
                    </View>
                    <Text style={{ color: '#00a650', fontSize: 14, fontWeight: 'bold', marginTop: 5 }}>{aiResponse?.confidenceScore || 0}% de precisión</Text>
                  </View>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15 }]}>
                    <Ionicons name="time-outline" size={20} color="#FF0000" style={{ marginBottom: 5 }} />
                    <Text style={{ color: '#666', fontSize: 9, fontWeight: 'bold' }}>HORA PICO</Text>
                    <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 14, fontWeight: 'bold' }}>{aiResponse?.bestHourPrediction || '...'}</Text>
                    <Text style={{ color: '#888', fontSize: 8, marginTop: 2 }}>{aiResponse?.peakHourReason || ''}</Text>
                  </View>
                </View>

                {/* Estrategia y Promo (Estilo Rojo) */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15, borderLeftWidth: 4, borderLeftColor: '#FF0000' }]}>
                    <Text style={{ color: '#FF0000', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>ESTRATEGIA</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#ddd' : '#444' }}>{aiResponse?.strategy || '...'}</Text>
                  </View>
                  <View style={[styles.card, { flex: 1, marginBottom: 0, padding: 15, borderLeftWidth: 4, borderLeftColor: isDark ? '#fff' : '#000' }]}>
                    <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>PROMOCIÓN SUGERIDA</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#ddd' : '#444' }}>{aiResponse?.promotionSuggestion || '...'}</Text>
                  </View>
                </View>

                {/* Análisis Estratégico Final */}
                <View style={[styles.card, { backgroundColor: isDark ? '#252525' : '#f0f4ff', borderWidth: 0, padding: 20 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="bulb-outline" size={18} color="#FF0000" style={{ marginRight: 8 }} />
                    <Text style={{ fontWeight: 'bold', color: '#FF0000' }}>Análisis Ejecutivo</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? '#eee' : '#333', fontStyle: 'italic', lineHeight: 22 }}>
                    "{aiResponse && aiResponse.shortAnalysis ? aiResponse.shortAnalysis : 'Analizando tendencias...'}"
                  </Text>
                </View>

                {/* Botón para Abrir Chat Full Screen */}
                <TouchableOpacity
                  onPress={() => setIsChatVisible(true)}
                  style={[styles.card, {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    backgroundColor: '#FF0000',
                    marginTop: 10,
                    marginBottom: 30
                  }]}
                >
                  <Ionicons name="chatbubbles" size={24} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Abrir Consultor Ryu IA</Text>
                </TouchableOpacity>

                {/* Modal de Chat Full Screen */}
                <Modal
                  visible={isChatVisible}
                  animationType="slide"
                  onRequestClose={() => setIsChatVisible(false)}
                >
                  <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#fff' }}>
                    {/* Header del Chat */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 20,
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? '#333' : '#eee',
                      backgroundColor: isDark ? '#1a1a1a' : '#fff'
                    }}>
                      <TouchableOpacity onPress={() => setIsChatVisible(false)} style={{ marginRight: 15 }}>
                        <Ionicons name="chevron-back" size={28} color="#FF0000" />
                      </TouchableOpacity>
                      <View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>Consultor Ryu IA</Text>
                        <Text style={{ fontSize: 12, color: '#00a650' }}>● En línea - Experto en tu negocio</Text>
                      </View>
                    </View>

                    {/* Cuerpo del Chat */}
                    <ScrollView
                      ref={chatScrollRef}
                      onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                      style={{ flex: 1, padding: 15 }}
                      contentContainerStyle={{ paddingBottom: 20 }}
                    >
                      {chatMessages.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 100, padding: 40 }}>
                          <LinearGradient
                            colors={['#FF0000', '#8B0000']}
                            style={{ width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
                          >
                            <Ionicons name="bulb" size={40} color="#fff" />
                          </LinearGradient>
                          <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>¿En qué puedo ayudarte hoy?</Text>
                          <Text style={{ color: '#999', textAlign: 'center', marginTop: 10, fontSize: 14 }}>
                            Puedes preguntarme sobre ventas, tendencias, qué productos mejorar o estrategias para el fin de semana.
                          </Text>

                          <View style={{ marginTop: 30, width: '100%' }}>
                            <TouchableOpacity
                              onPress={() => { setChatInput('¿Cuál es mi producto menos vendido?'); }}
                              style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', padding: 15, borderRadius: 12, marginBottom: 10 }}
                            >
                              <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 13 }}>📉 ¿Cuál es mi producto menos vendido?</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => { setChatInput('Sugiéreme una promoción para este fin de semana'); }}
                              style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', padding: 15, borderRadius: 12 }}
                            >
                              <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 13 }}>🚀 Sugerencia para el fin de semana</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <AnimatedChatMessage key={idx} msg={msg} isDark={isDark} />
                        ))
                      )}
                      {sendingChat && <TypingIndicator isDark={isDark} />}
                    </ScrollView>

                    {/* Input del Chat */}
                    <KeyboardAvoidingView
                      behavior={Platform.OS === "ios" ? "padding" : "height"}
                      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                    >
                      <View style={{
                        flexDirection: 'row',
                        padding: 15,
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#333' : '#eee',
                        alignItems: 'center',
                        backgroundColor: isDark ? '#1a1a1a' : '#fff'
                      }}>
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: isDark ? '#252525' : '#f0f0f0',
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 25,
                            color: isDark ? '#fff' : '#333',
                            marginRight: 10,
                            fontSize: 16
                          }}
                          placeholder="Escribe tu duda..."
                          placeholderTextColor="#999"
                          value={chatInput}
                          onChangeText={setChatInput}
                          multiline
                        />
                        <TouchableOpacity
                          onPress={handleSendMessage}
                          disabled={sendingChat || !chatInput.trim()}
                          style={{
                            backgroundColor: '#FF0000',
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            justifyContent: 'center',
                            alignItems: 'center',
                            elevation: 4,
                            opacity: (sendingChat || !chatInput.trim()) ? 0.5 : 1
                          }}
                        >
                          <Ionicons name="send" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </KeyboardAvoidingView>
                  </SafeAreaView>
                </Modal>

              </View>
            )}
          </AnimatedView>
        )}

        {activeTab === 'Configuracion' && (
          <View key="config-content">
            <AnimatedView delay={100}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Configuración</Text>
                <Text style={[styles.cardText, { marginTop: 10, marginBottom: 15 }]}>Tamaño de Letra:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5 }}>
                  {[
                    { label: 'A', mult: 0.85, title: 'Pequeño' },
                    { label: 'A', mult: 1, title: 'Normal' },
                    { label: 'A', mult: 1.15, title: 'Grande' },
                    { label: 'A', mult: 1.30, title: 'Extra G.' },
                    { label: 'A', mult: 1.45, title: 'Gigante' }
                  ].map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleFontSizeChange(option.mult)}
                      style={{
                        width: 85,
                        paddingVertical: 12,
                        marginRight: 10,
                        alignItems: 'center',
                        backgroundColor: fontSizeMult === option.mult ? '#ff0000' : (isDark ? '#333' : '#f0f0f0'),
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: fontSizeMult === option.mult ? '#ff0000' : (isDark ? '#444' : '#e0e0e0')
                      }}
                    >
                      <Text style={{
                        fontSize: Math.round(16 * option.mult),
                        color: fontSizeMult === option.mult ? '#fff' : (isDark ? '#fff' : '#333'),
                        fontWeight: 'bold'
                      }}>
                        {option.label}
                      </Text>
                      <Text style={{
                        fontSize: 10,
                        marginTop: 4,
                        color: fontSizeMult === option.mult ? 'rgba(255,255,255,0.8)' : (isDark ? '#aaa' : '#666')
                      }}>
                        {option.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Visibilidad de Módulos */}
                <Text style={[styles.cardText, { marginTop: 25, marginBottom: 15 }]}>Módulos del Dashboard:</Text>
                {[
                  { key: 'weekly', label: 'Comparativa Semanal', icon: 'stats-chart' },
                  { key: 'products', label: 'Productos Estrella', icon: 'pie-chart' },
                  { key: 'hours', label: 'Horas Pico', icon: 'bar-chart' },
                  { key: 'payments', label: 'Métodos de Pago', icon: 'card' },
                  { key: 'orders', label: 'Últimos Pedidos', icon: 'list' },
                ].map((item, idx, arr) => (
                  <View key={item.key} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                    borderBottomColor: isDark ? '#333' : '#eee'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={item.icon} size={20} color={isDark ? '#aaa' : '#666'} style={{ marginRight: 10 }} />
                      <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 14 }}>{item.label}</Text>
                    </View>
                    <Switch
                      value={visibleCharts[item.key]}
                      onValueChange={() => toggleChart(item.key)}
                      trackColor={{ false: '#767577', true: '#ff0000' }}
                      thumbColor={Platform.OS === 'ios' ? undefined : (visibleCharts[item.key] ? '#fff' : '#f4f3f4')}
                    />
                  </View>
                ))}

                {/* Reportes Ejecutivos */}
                <Text style={[styles.cardText, { marginTop: 25, marginBottom: 15 }]}>Reportes Ejecutivos:</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => generatePDFReport('7D')}
                    style={{
                      flex: 1,
                      backgroundColor: '#ff0000',
                      padding: 15,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Semanal (PDF)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => generatePDFReport('30D')}
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? '#333' : '#1a1a1a',
                      padding: 15,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name="calendar" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mensual (PDF)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedView>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Barra de Navegación Premium */}
      <LimelightNav activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} />

      {/* Modal Todos los Productos */}
      <Modal
        visible={showAllProductsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllProductsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            height: '70%',
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            padding: 20
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>Rendimiento de Productos</Text>
              <TouchableOpacity onPress={() => setShowAllProductsModal(false)}>
                <Ionicons name="close-circle" size={30} color="#FF0000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {fullProductList?.map((prod, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#333' : '#eee'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: prod.color, marginRight: 10 }} />
                    <Text style={{ color: isDark ? '#fff' : '#333', fontSize: 16 }}>{prod.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', color: '#FF0000', fontSize: 16 }}>{prod.population}</Text>
                    <Text style={{ color: '#999', fontSize: 12, marginLeft: 5 }}>ventas</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalle de Ventas */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showVentasDetalle}
        onRequestClose={() => setShowVentasDetalle(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ventas por Día</Text>
              <TouchableOpacity onPress={() => setShowVentasDetalle(false)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {dailyBreakdown.map((item, index) => (
                <View key={index} style={styles.modalItem}>
                  <Text style={styles.modalDate}>{item.dateStr}</Text>
                  <Text style={styles.modalTotal}>${item.total}</Text>
                </View>
              ))}
              {dailyBreakdown.length === 0 && (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: isDark ? '#888' : '#999' }}>No hay datos disponibles</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Historial Completo */}
      <Modal
        animationType="slide"
        visible={showHistorialModal}
        onRequestClose={() => setShowHistorialModal(false)}
      >
        <SafeAreaView style={styles.historialContainer}>
          <View style={styles.historialHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowHistorialModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.historialTitle}>Historial de Pedidos</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Filtros por fecha real */}
          <View style={{ maxHeight: 60, paddingVertical: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 15 }} contentContainerStyle={{ alignItems: 'center', paddingRight: 30 }}>
              <TouchableOpacity
                style={[styles.dateFilterPill, selectedHistorialDate === 'All' && styles.dateFilterPillActive]}
                onPress={() => setSelectedHistorialDate('All')}
              >
                <Text style={[styles.dateFilterPillText, selectedHistorialDate === 'All' && styles.dateFilterPillTextActive]}>Todo</Text>
              </TouchableOpacity>
              {(() => {
                const dates = [];
                pedidos.forEach(orden => {
                  if (orden.time) {
                    const d = new Date(orden.time);
                    const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    if (!dates.includes(dateStr)) dates.push(dateStr);
                  }
                });
                return dates.map((dateStr) => (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dateFilterPill, selectedHistorialDate === dateStr && styles.dateFilterPillActive]}
                    onPress={() => setSelectedHistorialDate(dateStr)}
                  >
                    <Text style={[styles.dateFilterPillText, selectedHistorialDate === dateStr && styles.dateFilterPillTextActive]}>{dateStr}</Text>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>

          <ScrollView style={styles.historialContent} contentContainerStyle={{ paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#ff0000" style={{ marginTop: 50 }} />
            ) : (
              (() => {
                const filtered = (pedidos || []).filter(orden => {
                  if (selectedHistorialDate === 'All') return true;
                  const d = new Date(orden.time);
                  const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  return dateStr === selectedHistorialDate;
                });

                const totalForSelected = filtered.reduce((sum, p) => sum + (p.total || 0), 0);

                const groups = filtered.reduce((acc, orden) => {
                  const d = new Date(orden.time);
                  const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(orden);
                  return acc;
                }, {});

                return (
                  <View style={{ flex: 1 }}>
                    {/* Resumen de Total */}
                    <View style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      marginHorizontal: 15,
                      marginBottom: 15,
                      padding: 20,
                      borderRadius: 15,
                      borderLeftWidth: 5,
                      borderLeftColor: '#ff0000',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 5
                    }}>
                      <View>
                        <Text style={{ fontSize: 12, color: isDark ? '#888' : '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {selectedHistorialDate === 'All' ? 'Total Histórico' : `Total del día (${selectedHistorialDate})`}
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ff0000' }}>
                          ${totalForSelected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: isDark ? '#252525' : '#fff5f5', padding: 10, borderRadius: 12 }}>
                        <Ionicons name="stats-chart" size={24} color="#ff0000" />
                      </View>
                    </View>

                    {Object.keys(groups).length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Ionicons name="receipt-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyStateText}>No hay pedidos en esta fecha</Text>
                      </View>
                    ) : (
                      Object.keys(groups).map((date) => (
                        <View key={date} style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                          <View style={styles.dateHeaderPremium}>
                            <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={styles.dateHeaderPremiumText}>{date}</Text>
                          </View>
                          {groups[date].map((orden) => {
                            const isCard = orden.paymentmethod?.toLowerCase().includes('tarjeta') || orden.paymentmethod?.toLowerCase().includes('card');
                            const paymentColor = isCard ? '#4A90E2' : '#00a650';
                            const paymentBg = isCard ? (isDark ? '#1e3a5f' : '#EAF3FC') : (isDark ? '#064e3b' : '#E6F6ED');
                            
                            return (
                              <View key={orden.clientid || Math.random().toString()} style={styles.pedidoCard}>
                                <View style={styles.pedidoCardHeader}>
                                  <View style={styles.pedidoAvatar}>
                                    <Text style={styles.pedidoAvatarText}>
                                      {orden.clientname ? orden.clientname.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                  </View>
                                  <View style={styles.pedidoClientInfo}>
                                    <Text style={styles.pedidoClientName} numberOfLines={1}>{orden.clientname || 'Cliente sin nombre'}</Text>
                                    <Text style={styles.pedidoTimePremium}>
                                      {orden.time ? new Date(orden.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </Text>
                                  </View>
                                  <View style={styles.pedidoAmountContainer}>
                                    <Text style={styles.pedidoTotalAmount}>${orden.total || 0}</Text>
                                  </View>
                                </View>

                                <View style={styles.pedidoItemsContainer}>
                                  {orden.items && Array.isArray(orden.items) ? orden.items.map((item, index) => (
                                    <View key={index} style={styles.pedidoItemRow}>
                                      <Text style={styles.pedidoItemDot}>•</Text>
                                      <Text style={styles.pedidoItemText}>
                                        {item?.name?.toLowerCase().includes('combo') 
                                          ? item.name.split(/[:(]/)[0].trim() 
                                          : item?.name} <Text style={styles.pedidoItemDetails}>{item?.details ? `(${item.details})` : ''}</Text>
                                      </Text>
                                    </View>
                                  )) : null}
                                </View>

                                <View style={styles.pedidoCardFooter}>
                                  <View style={[styles.paymentBadge, { backgroundColor: paymentBg }]}>
                                    <Ionicons
                                      name={isCard ? "card-outline" : "cash-outline"}
                                      size={14}
                                      color={paymentColor}
                                      style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.paymentBadgeText, { color: paymentColor }]}>
                                      {orden.paymentmethod?.toUpperCase() || 'EFECTIVO'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </View>
                );
              })()
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (isDark, fontMult = 1) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#121212' : '#f5f7fa',
  },
  notificationBanner: {
    position: 'absolute',
    top: 0,
    left: 15,
    right: 15,
    backgroundColor: '#28a745', // Verde de confirmación
    borderRadius: 12,
    padding: 15,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Math.round(16 * fontMult),
  },
  notificationMessage: {
    color: '#fff',
    fontSize: Math.round(14 * fontMult),
    marginTop: 2,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  filterButtonText: {
    fontSize: Math.round(12 * fontMult),
    color: isDark ? '#aaa' : '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  headerTitle: {
    fontSize: Math.round(28 * fontMult),
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: Math.round(18 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  cardText: {
    fontSize: Math.round(14 * fontMult),
    color: isDark ? '#aaa' : '#666',
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: Math.round(12 * fontMult),
    color: isDark ? '#888' : '#999',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: Math.round(18 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  pedidoItem: {
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333' : '#f0f0f0',
    paddingVertical: 12,
  },
  dateHeader: {
    backgroundColor: isDark ? '#333' : '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 15,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  dateHeaderText: {
    fontSize: Math.round(12 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#ddd' : '#555',
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pedidoName: {
    fontSize: Math.round(16 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  pedidoPrice: {
    fontSize: Math.round(16 * fontMult),
    fontWeight: 'bold',
    color: '#00a650',
  },
  pedidoDetails: {
    fontSize: Math.round(14 * fontMult),
    color: isDark ? '#aaa' : '#666',
    marginLeft: 5,
    marginBottom: 4,
    lineHeight: 20,
  },
  pedidoTime: {
    fontSize: Math.round(12 * fontMult),
    color: isDark ? '#888' : '#999',
    marginTop: 6,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333' : '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: Math.round(20 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  closeButton: {
    fontSize: Math.round(30 * fontMult),
    color: isDark ? '#888' : '#999',
    paddingHorizontal: 10,
  },
  modalList: {
    marginBottom: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#222' : '#f9f9f9',
  },
  modalDate: {
    fontSize: Math.round(16 * fontMult),
    color: isDark ? '#e0e0e0' : '#444',
  },
  modalTotal: {
    fontSize: Math.round(16 * fontMult),
    fontWeight: 'bold',
    color: '#00a650',
  },
  verTodosButton: {
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333' : '#f0f0f0',
    alignItems: 'center',
  },
  verTodosText: {
    color: '#ff0000',
    fontWeight: 'bold',
    fontSize: Math.round(13 * fontMult),
  },
  historialContainer: {
    flex: 1,
    backgroundColor: isDark ? '#121212' : '#F8F9FB',
  },
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 5,
  },
  historialTitle: {
    fontSize: Math.round(20 * fontMult),
    fontWeight: '700',
    color: isDark ? '#fff' : '#1A1A1A',
    letterSpacing: -0.5,
  },
  historialContent: {
    flex: 1,
  },
  dateFilterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateFilterPillActive: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  dateFilterPillText: {
    fontSize: Math.round(14 * fontMult),
    color: isDark ? '#9ca3af' : '#6B7280',
    fontWeight: '600',
  },
  dateFilterPillTextActive: {
    color: '#fff',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyStateText: {
    marginTop: 15,
    fontSize: Math.round(16 * fontMult),
    color: isDark ? '#6b7280' : '#9CA3AF',
    fontWeight: '500',
  },
  dateHeaderPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  dateHeaderPremiumText: {
    fontSize: Math.round(14 * fontMult),
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pedidoCard: {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  pedidoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pedidoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pedidoAvatarText: {
    fontSize: Math.round(18 * fontMult),
    fontWeight: 'bold',
    color: '#ff0000',
  },
  pedidoClientInfo: {
    flex: 1,
  },
  pedidoClientName: {
    fontSize: Math.round(16 * fontMult),
    fontWeight: '700',
    color: isDark ? '#fff' : '#111827',
    marginBottom: 2,
  },
  pedidoTimePremium: {
    fontSize: Math.round(12 * fontMult),
    color: isDark ? '#9ca3af' : '#6B7280',
    fontWeight: '500',
  },
  pedidoAmountContainer: {
    alignItems: 'flex-end',
  },
  pedidoTotalAmount: {
    fontSize: Math.round(18 * fontMult),
    fontWeight: '800',
    color: isDark ? '#fff' : '#111827',
  },
  pedidoItemsContainer: {
    backgroundColor: isDark ? '#2a2a2a' : '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pedidoItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  pedidoItemDot: {
    fontSize: Math.round(14 * fontMult),
    color: isDark ? '#6b7280' : '#9CA3AF',
    marginRight: 6,
    marginTop: -1,
  },
  pedidoItemText: {
    fontSize: Math.round(14 * fontMult),
    color: isDark ? '#e5e7eb' : '#374151',
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  pedidoItemDetails: {
    color: isDark ? '#6b7280' : '#9CA3AF',
    fontWeight: '400',
    fontSize: Math.round(13 * fontMult),
  },
  pedidoCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#F3F4F6',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentBadgeText: {
    fontSize: Math.round(12 * fontMult),
    fontWeight: '700',
  },
  comparisonDetailBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: isDark ? '#121212' : '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#eee',
  },
  comparisonDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  comparisonDetailTitle: {
    fontSize: Math.round(14 * fontMult),
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#333',
  },
  comparisonDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  comparisonDetailLabel: {
    fontSize: Math.round(10 * fontMult),
    color: isDark ? '#888' : '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  comparisonDetailValue: {
    fontSize: Math.round(16 * fontMult),
    fontWeight: 'bold',
  },
  comparisonDiffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  comparisonDiffText: {
    fontSize: Math.round(14 * fontMult),
    fontWeight: 'bold',
    marginLeft: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333' : '#f0f0f0',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
    fontSize: Math.round(15 * fontMult),
    color: isDark ? '#fff' : '#333',
    fontWeight: '500',
  },
});
