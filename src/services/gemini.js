export const getAIPredictions = async (data) => {
  const API_KEY = "sk-7e8b822df4424f0caf108ac34c08acf6";
  const url = "https://api.deepseek.com/chat/completions";

  const prompt = `
    Eres un experto en análisis predictivo financiero para restaurantes de Sushi. 
    FECHA ACTUAL: ${data.localDate} (${data.localDay})
    HORA ACTUAL: ${data.currentHour}:00 hrs
    PERIODO DEL DASHBOARD: ${data.timeRange}
    
    ════════════════════════════════════════
    ESTADO DE JORNADA (PRE-CALCULADO, NO MODIFIQUES):
    ════════════════════════════════════════
    PRÓXIMA JORNADA: ${data.jornadaStatus}
    DÍA DE LA PRÓXIMA JORNADA: ${data.nextJornadaDay}
    
    HORARIO DE RYU SUSHI:
    - Lunes, Martes, Jueves, Viernes, Domingo: 16:30 - 23:00
    - Sábado: 18:00 - 23:00
    - Miércoles: CERRADO
    
    VENTA DE HOY (${data.todayDay}): $${data.todaySales}
    
    ════════════════════════════════════════
    REGLAS DE NEGOCIO CRÍTICAS:
    ════════════════════════════════════════
    1. USA el campo "PRÓXIMA JORNADA" tal cual está arriba. NO lo recalcules. Si dice "CERRADO ahora", el negocio está cerrado. Si dice "JORNADA EN CURSO", está abierto.
    2. REALISMO: Las predicciones deben ser LÓGICAS y conservadoras. Pegadas a los datos reales.
    3. DIFERENCIACIÓN: Las "Ventas totales del periodo" ($${data.stats.totalSales}) corresponden a "${data.timeRange}". La "Venta de hoy" es SOLO $${data.todaySales}.
    4. HISTORIAL vs HOY: Los datos en "HISTORIAL" son de DÍAS ANTERIORES. NO incluyen hoy. No uses la venta de hoy ($${data.todaySales}) como referencia histórica del ${data.todayDay}.
    5. MIÉRCOLES: Ryu Sushi NO abre los miércoles. Si la próxima jornada cae en jueves, menciona que viene de un día de descanso.
    
    CATÁLOGO OFICIAL RYU SUSHI:
    - Rollos ($100-$110): Torrelo, Vaquero, Mar y tierra, Camaron, Surimi, Costeño, Gallinazo, Res, Vegetariano, Ryu burro, Flamin, Goliat.
    - Alitas/Boneless: Natural, BBQ, Búfalo, Mango Habanero, Infierno. (Orden, Media, Kilo).
    - Papas: Francesa ($50), Gajo ($60).
    - Combos: 
      * Combo 1 ($100): 200g Boneless + Papas.
      * Combo 2 ($130): 1 Sushi + Papas.
      * Combo 3 ($100): 200g Alitas + Papas.
      * Combo 4 ($140): 200g Boneless + 200g Alitas.
      * Combo 5 ($200): Alitas + Boneless + Sushi.
      * Combo 6 ($600): 3 Rollos + 1 Boneless + 1 Alitas + Papas + Refresco.
    
    DATOS DE VENTAS:
    - Ventas totales del periodo (${data.timeRange}): $${data.stats.totalSales}
    - Venta de HOY (${data.todayDay}): $${data.todaySales}
    - Lo más vendido recientemente: ${JSON.stringify(data.topProducts)}
    - HISTORIAL de días ANTERIORES (NO incluye hoy): ${JSON.stringify(data.dailyBreakdown)}
    - Distribución por horas: ${JSON.stringify(data.hourlyData)}
    
    REGLAS DE PRODUCTOS:
    - Usa EXCLUSIVAMENTE los nombres del Catálogo Oficial.
    - Sugiere promociones basadas en los Combos existentes.
    
    ESTRUCTURA JSON REQUERIDA (Responde SOLO el JSON):
    {
      "nextSessionEstimate": 0,       
      "next3DaysEstimate": 0,        
      "weeklyForecast": 0,           
      "monthlyForecast": 0,          
      "growthPercentage": 0,         
      "confidenceScore": 0,          
      "busiestDayPrediction": "",    
      "bestHourPrediction": "",      
      "peakHourReason": "Breve explicación de por qué esa hora",
      "reasoning": "IMPORTANTE: Menciona que la próxima jornada es ${data.nextJornadaDay}. Explica tu estimación.",
      "strategy": "Estrategia de ventas para la PRÓXIMA jornada (${data.nextJornadaDay})",
      "promotionSuggestion": "Una promoción específica para aumentar el ticket",
      "shortAnalysis": "Análisis ejecutivo corto. La venta de hoy ${data.todayDay} cerró/va en $${data.todaySales}."
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a senior business analyst. Output ONLY valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    let aiText = result.choices[0].message.content;
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(aiText);

  } catch (error) {
    console.error("DeepSeek Error:", error);
    return {
      nextSessionEstimate: 0,
      next3DaysEstimate: 0,
      weeklyForecast: 0,
      monthlyForecast: 0,
      growthPercentage: 0,
      confidenceScore: 0,
      busiestDayPrediction: "Error",
      bestHourPrediction: "Error",
      shortAnalysis: `No se pudo conectar: ${error.message}`
    };
  }
};

export const sendAIChatMessage = async (messages, businessData) => {
  const API_KEY = "sk-7e8b822df4424f0caf108ac34c08acf6";
  const url = "https://api.deepseek.com/chat/completions";

  const systemContext = `
    Eres el Consultor Inteligente de "Ryu Sushi". Tienes acceso a los datos reales del negocio.
    
    FECHA Y HORA ACTUAL: ${businessData.localDate} (${businessData.localDay})
    HORA ISO: ${businessData.currentTimestamp}
    
    HORARIO DE RYU SUSHI:
    - Lunes, Martes, Jueves, Viernes, Domingo: 16:30 - 23:00
    - Sábado: 18:00 - 23:00
    - Miércoles: CERRADO
    
    CATÁLOGO:
    - Rollos: Torrelo, Vaquero, Mar y tierra, Camaron, Surimi, Costeño, Gallinazo, Res, Vegetariano, Ryu burro, Flamin, Goliat.
    - Alitas/Boneless: Natural, BBQ, Búfalo, Mango Habanero, Infierno.
    - Combos 1 al 6 (Precios $100 a $600).
    
    ════════════════════════════════════════
    DATOS REALES — PERIODO: ${businessData.timeRange} (Filtro activo: ${businessData.dateFilter})
    ════════════════════════════════════════
    
    IMPORTANTE: Si el filtro es "Today", SOLO tienes datos de HOY. Si el usuario pregunta por "ayer" o "la semana pasada" y el filtro es "Today", dile que debe cambiar el filtro del Dashboard a "7 días" para que tú puedas ver esos datos. No inventes ventas de ayer si no las ves en el desglose.
    
    VENTAS TOTALES DEL PERIODO (${businessData.timeRange}): $${businessData.stats.totalSales}
    VENTA DE HOY (${businessData.localDay}): $${businessData.todaySales}
    
    DESGLOSE EXACTO POR FECHA (cada fecha con su venta real):
    ${JSON.stringify(businessData.salesByExactDate, null, 0)}
    
    COMPARATIVA SEMANAL (Esta Semana vs Semana Pasada, por día):
    ${JSON.stringify(businessData.weekComparison, null, 0)}
    
    CONTEO EXACTO DE PRODUCTOS VENDIDOS (TOTAL del periodo): ${JSON.stringify(businessData.productStats)}
    PRODUCTOS SIN VENTAS EN EL PERIODO: ${JSON.stringify(businessData.unsoldProducts)}
    
    DESGLOSE DE PRODUCTOS POR DÍA (qué se vendió cada fecha):
    ${JSON.stringify(businessData.productsByDate || {}, null, 0)}
    
    ════════════════════════════════════════
    REGLAS ABSOLUTAS — CERO TOLERANCIA A INVENTAR
    ════════════════════════════════════════
    
    1. SOLO CITA NÚMEROS QUE APARECEN ARRIBA. Si una fecha dice total: 965, responde 965. NO 1020, NO 970, NO "aproximadamente 1000". EL NÚMERO EXACTO.
    2. NUNCA redondees, interpoles, promedies ni "ajustes" cifras. Copia y pega el número tal cual aparece en los datos.
    3. Si el usuario pregunta "¿cuánto vendimos hoy?", usa ÚNICAMENTE el valor de "VENTA DE HOY": $${businessData.todaySales}.
    4. Si el usuario pregunta por un día específico (ej. "viernes pasado"), busca la FECHA exacta en "DESGLOSE EXACTO POR FECHA" y da ese número. Si no existe esa fecha, di "No tengo datos de esa fecha en el periodo actual".
    5. Si el usuario pregunta "¿cuántos Torrelos se vendieron ayer?", busca en "DESGLOSE DE PRODUCTOS POR DÍA" la fecha de ayer y da ese número.
    6. Las "VENTAS TOTALES" ($${businessData.stats.totalSales}) son del periodo "${businessData.timeRange}", NO de un solo día.
    7. Si el usuario menciona una cifra y no coincide con tus datos, corrige amablemente citando tu fuente exacta.
    8. NUNCA sumes números por tu cuenta. Si necesitas dar un total, solo cita los totales pre-calculados que ya tienes.
    ${businessData.aiPredictions ? `
    ════════════════════════════════════════
    PREDICCIONES DEL DASHBOARD (generadas por ti previamente)
    ════════════════════════════════════════
    
    Estado de jornada: ${businessData.aiPredictions.jornadaStatus}
    Próxima jornada: ${businessData.aiPredictions.nextJornadaDay}
    Estimación próxima jornada: $${businessData.aiPredictions.nextSessionEstimate}
    Estimación próximos 3 días: $${businessData.aiPredictions.next3DaysEstimate}
    Pronóstico semanal: $${businessData.aiPredictions.weeklyForecast}
    Pronóstico mensual: $${businessData.aiPredictions.monthlyForecast}
    Crecimiento proyectado: ${businessData.aiPredictions.growthPercentage}%
    Confianza: ${businessData.aiPredictions.confidenceScore}%
    Día más fuerte: ${businessData.aiPredictions.busiestDayPrediction}
    Hora pico: ${businessData.aiPredictions.bestHourPrediction}
    Estrategia sugerida: ${businessData.aiPredictions.strategy}
    Promoción sugerida: ${businessData.aiPredictions.promotionSuggestion}
    Razonamiento: ${businessData.aiPredictions.reasoning}
    Análisis ejecutivo: ${businessData.aiPredictions.shortAnalysis}
    
    REGLA: Si el usuario te pregunta sobre predicciones, pronósticos, estimaciones o estrategias, usa ESTOS datos. Son las predicciones que tú generaste en el panel de IA del dashboard. Puedes explicarlas, defenderlas o ampliarlas.
    ` : `
    NOTA: El usuario aún no ha generado predicciones en el Dashboard de IA. Si pregunta por predicciones, indícale que primero vaya a la pestaña "IA" y presione "Generar Predicciones".
    `}
    INSTRUCCIONES DE FORMATO (ESTRICTO JSON A2UI):
    DEBES responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
    {
      "text": "Tu respuesta en texto plano (SIN asteriscos, breve, profesional, con emojis 🍣).",
      "ui": null // O un objeto UI si el usuario pide ver datos visualmente
    }
    
    SI EL USUARIO PIDE GRÁFICAS O VER DATOS DE FORMA VISUAL (Ej: "muéstrame gráfica", "estadísticas visuales", "top productos", "cómo nos fue"):
    El campo "ui" debe ser:
    {
      "type": "bar_chart",
      "title": "Título del gráfico",
      "labels": ["Item 1", "Item 2", "Item 3", "Item 4"], // Máximo 5 items
      "data": [10, 25, 5, 12] // Valores numéricos
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemContext },
          ...messages
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    let aiText = result.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(aiText);
      // Limpiar texto de asteriscos por si acaso
      if (parsed.text) {
        parsed.text = parsed.text.replace(/\*\*/g, '');
      }
      return JSON.stringify(parsed); // Devolvemos el JSON validado como string
    } catch (e) {
      // Fallback si la IA no devuelve JSON válido
      return JSON.stringify({ text: aiText.replace(/\*\*/g, ''), ui: null });
    }
  } catch (error) {
    console.error("Chat AI Error:", error);
    return "Lo siento, tuve un problema al procesar tu mensaje. 🍣";
  }
};


