/**
 * Chart data transformation helpers for Ryu Admin
 */

export const processSalesData = (pedidos) => {
  const salesByDate = {};
  
  pedidos.forEach(orden => {
    if (orden.time) {
      const dateObj = new Date(orden.time);
      const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      if (!salesByDate[dateStr]) salesByDate[dateStr] = { total: 0, date: dateObj };
      salesByDate[dateStr].total += orden.total || 0;
    }
  });

  // Sort by real date timestamp to avoid "31/01" > "01/02" string issues
  const sortedEntries = Object.entries(salesByDate).sort((a, b) => {
    return a[1].date - b[1].date;
  });

  if (sortedEntries.length === 0) {
    return { labels: ['Sin datos'], datasets: [{ data: [0] }] };
  }

  // Take the last 7 days or all if less
  const recentEntries = sortedEntries.slice(-7);
  
  return {
    labels: recentEntries.map(e => e[0]),
    datasets: [{ data: recentEntries.map(e => e[1].total) }]
  };
};

export const processProductData = (pedidos) => {
  const productCounts = {};
  const pieColors = ['#ff0000', '#ff4d4d', '#ff8080', '#ffb3b3', '#ffe6e6'];
  const catalog = ["Torrelo", "Vaquero", "Mar y tierra", "Camaron", "Surimi", "Costeño", "Gallinazo", "Res", "Vegetariano", "Ryu burro", "Flamin", "Goliat", "Combo 1", "Combo 2", "Combo 3", "Combo 4", "Combo 5", "Combo 6", "Papas Gajo", "Papas Francesa"];
  const flavors = ["Natural", "BBQ", "Búfalo", "Mango Habanero", "Infierno"];

  pedidos.forEach(orden => {
    if (orden.items && Array.isArray(orden.items)) {
      orden.items.forEach(item => {
        if (item.name) {
          const fullName = item.name;
          const lowerName = fullName.toLowerCase();
          let normalizedName = "";

          if (lowerName.includes('combo')) {
            const combos = catalog.filter(c => c.toLowerCase().includes('combo'));
            normalizedName = combos.find(c => lowerName.includes(c.toLowerCase())) || fullName.split(/[\s:(]/)[0].trim();
          } else if (lowerName.includes('alita') || lowerName.includes('boneless')) {
            const isAlita = lowerName.includes('alita');
            const flavor = flavors.find(f => lowerName.includes(f.toLowerCase()));
            normalizedName = `${isAlita ? 'Alitas' : 'Boneless'} ${flavor || '(Sencillo)'}`;
          } else {
            // Para todo lo demás, usar el catálogo o la primera palabra
            normalizedName = catalog.find(c => lowerName.includes(c.toLowerCase())) || fullName.split(/[\s:(]/)[0].trim();
          }
          
          if (!productCounts[normalizedName]) productCounts[normalizedName] = 0;
          productCounts[normalizedName] += 1;
        }
      });
    }
  });

  const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  
  if (sortedProducts.length === 0) return { pieData: [], fullList: [] };

  const fullList = sortedProducts.map((p, index) => ({
    name: p[0],
    population: p[1],
    color: pieColors[index] || '#ccc'
  }));

  const topProducts = sortedProducts.slice(0, 4);
  const pieData = topProducts.map((p, index) => ({
    name: p[0].substring(0, 12),
    population: p[1],
    color: pieColors[index] || '#ccc',
    legendFontColor: '#7F7F7F',
    legendFontSize: 11
  }));

  if (sortedProducts.length > 4) {
    const othersCount = sortedProducts.slice(4).reduce((acc, curr) => acc + curr[1], 0);
    pieData.push({
      name: `Otros (${othersCount})`,
      population: othersCount,
      color: '#ccc',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11
    });
  }
  
  return { pieData, fullList };
};

export const processHourData = (pedidos) => {
  const hourCounts = {};
  
  pedidos.forEach(orden => {
    if (orden.time) {
      const dateObj = new Date(orden.time);
      const hour = dateObj.getHours();
      
      // Grouping in 2-hour ranges for better legibility
      const startHour = Math.floor(hour / 2) * 2;
      const hourStr = `${startHour}:00`;
      
      if (!hourCounts[hourStr]) hourCounts[hourStr] = 0;
      hourCounts[hourStr] += 1;
    }
  });

  const sortedHours = Object.entries(hourCounts).sort((a, b) => {
    return parseInt(a[0]) - parseInt(b[0]);
  });

  if (sortedHours.length === 0) {
    return { labels: ['-'], datasets: [{ data: [0] }] };
  }

  return {
    labels: sortedHours.map(h => h[0]),
    datasets: [{ data: sortedHours.map(h => h[1]) }]
  };
};

export const processPaymentData = (pedidos) => {
  const paymentCounts = { 'EFECTIVO': 0, 'TARJETA': 0 };
  const pieColors = ['#00a650', '#ff0000']; // Green for cash, Red for card (Ryu theme)

  pedidos.forEach(orden => {
    const method = (orden.paymentmethod || '').toUpperCase();
    if (method.includes('EFECTIVO')) paymentCounts['EFECTIVO'] += 1;
    else if (method.includes('TARJETA')) paymentCounts['TARJETA'] += 1;
  });

  return Object.entries(paymentCounts).map(([name, count], index) => ({
    name: name,
    population: count,
    color: pieColors[index],
    legendFontColor: '#7F7F7F',
    legendFontSize: 11
  }));
};

export const calculateStats = (pedidos) => {
  const productCounts = {};
  const hourCounts = {};
  let totalSales = 0;

  pedidos.forEach(orden => {
    totalSales += orden.total || 0;
    
    if (orden.time) {
      const dateObj = new Date(orden.time);
      const hour = dateObj.getHours();
      const hourStr = `${hour}:00 - ${hour+1}:00`;
      if (!hourCounts[hourStr]) hourCounts[hourStr] = 0;
      hourCounts[hourStr] += 1;
    }

    if (orden.items && Array.isArray(orden.items)) {
      orden.items.forEach(item => {
        if (item.name) {
          if (!productCounts[item.name]) productCounts[item.name] = 0;
          productCounts[item.name] += 1;
        }
      });
    }
  });

  const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const averageTicket = pedidos.length > 0 ? (totalSales / pedidos.length).toFixed(2) : 0;

  return {
    topProduct: sortedProducts.length > 0 ? sortedProducts[0][0] : 'N/A',
    worstProduct: sortedProducts.length > 0 ? sortedProducts[sortedProducts.length - 1][0] : 'N/A',
    peakHour: sortedHours.length > 0 ? sortedHours[0][0] : 'N/A',
    averageTicket,
    totalSales: totalSales.toFixed(2)
  };
};

export const getDailyBreakdown = (pedidos) => {
  const salesByDate = {};
  
  pedidos.forEach(orden => {
    if (orden.time) {
      const d = new Date(orden.time);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      if (!salesByDate[dateStr]) salesByDate[dateStr] = { total: 0, date: d };
      salesByDate[dateStr].total += orden.total || 0;
    }
  });

  return Object.entries(salesByDate)
    .sort((a, b) => b[1].date - a[1].date)
    .map(([dateStr, data]) => ({
      dateStr,
      day: data.date.toLocaleDateString('es-MX', { weekday: 'long' }),
      total: data.total.toFixed(2)
    }));
};

export const processWeeklyComparisonData = (pedidos) => {
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  // data format for StackedBarChart: array of arrays [[val1, val2], [val1, val2], ...]
  const stackedData = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]; 
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const currentDayOfWeek = now.getDay(); 
  
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - currentDayOfWeek);
  
  const startOfLastWeek = new Date(startOfCurrentWeek);
  startOfLastWeek.setDate(startOfCurrentWeek.getDate() - 7);

  const endOfLastWeek = new Date(startOfCurrentWeek);

  pedidos.forEach(orden => {
    if (orden.time) {
      const orderDate = new Date(orden.time);
      const dayIndex = orderDate.getDay();
      
      if (orderDate >= startOfCurrentWeek) {
        stackedData[dayIndex][0] += orden.total || 0; // Index 0: Esta Semana
      } else if (orderDate >= startOfLastWeek && orderDate < endOfLastWeek) {
        stackedData[dayIndex][1] += orden.total || 0; // Index 1: Semana Pasada
      }
    }
  });

  return {
    labels: daysOfWeek,
    legend: ["Esta Semana", "Sem Pasada"],
    data: stackedData,
    barColors: ["#00E5FF", "#374151"] // Cyan brillante y Gris oscuro
  };
};
