// =============================================================
// Utilidades compartidas para la app Parte de Horas
// =============================================================

/**
 * Devuelve el rango de semana como string "DD/MM al DD/MM" 
 * para un dateString dado (ISO o Date-compatible).
 */
export const getWeekRange = (dateString) => {
  const d = new Date(dateString);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options = { day: '2-digit', month: '2-digit' };
  return `${monday.toLocaleDateString('es-ES', options)} al ${sunday.toLocaleDateString('es-ES', options)}`;
};

/**
 * Devuelve { monday, sunday } como objetos Date para la semana actual.
 */
export const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
};

/**
 * Devuelve string legible del rango de semana actual: "27 abr - 03 may"
 */
export const getCurrentWeekDisplayRange = () => {
  const { monday, sunday } = getCurrentWeekDates();
  const fmt = (d) =>
    d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return `${fmt(monday)} - ${fmt(sunday)}`;
};

/**
 * Lista de analíticas (códigos de proyecto) disponibles.
 */
export const ANALITICAS = [
  'MX0010000', 'MX0011000', 'MX0012000', 'MX0013000', 'MX0014000', 'MX0015000',
  'MX0016000', 'MX0017000', 'MX0020000', 'MX0031000', 'MX0032000', 'MX0057400',
  'MX0078800', 'MX0081400', 'MX0085600', 'MX0090100', 'MX0091600', 'MX0093100',
  'MX0094200', 'MX0096100', 'MX0096200', 'MX0096300', 'MX0097100', 'MX0097200',
  'MX0097300', 'MX0098400', 'MX00OYMPA', 'MX00REPEJ'
];

/**
 * Formatea un ISO string a hora HH:MM local.
 */
export const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Texto y estilo para el status de un registro.
 */
export const getStatusLabel = (status) => {
  switch (status) {
    case 'approved': return 'Aprobado';
    case 'rejected': return 'Rechazado';
    default: return 'Pendiente';
  }
};

/**
 * Agrupa time entries por trabajador + semana.
 * Retorna un array de objetos group con métricas calculadas.
 */
export const groupEntriesByWorkerWeek = (timeEntries) => {
  const weeklyGroupsMap = {};

  timeEntries.forEach(entry => {
    const weekKey = getWeekRange(entry.date);
    const groupKey = `${entry.workerId}_${weekKey}`;

    if (!weeklyGroupsMap[groupKey]) {
      weeklyGroupsMap[groupKey] = {
        id: groupKey,
        workerId: entry.workerId,
        workerName: entry.workerName,
        workerArea: entry.workerArea,
        weekKey: weekKey,
        entries: [],
        totalHours: 0,
        extraHours: 0,
        specialHours: 0,
        totalFestivos: 0,
        totalDietas: 0,
        analiticas: new Set(),
      };
    }

    const group = weeklyGroupsMap[groupKey];
    group.entries.push(entry);

    if (entry.analitica) group.analiticas.add(entry.analitica);
    if (entry.isFestivo) group.totalFestivos += 1;
    if (entry.dieta) group.totalDietas = 1;

    if (entry.clockIn && entry.clockOut) {
      const hrs = (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
      const d = new Date(entry.date);
      if (d.getDay() === 0) {
        group.specialHours += hrs;
      } else {
        group.totalHours += Math.min(hrs, 8);
        group.extraHours += Math.max(0, hrs - 8);
      }
    }
  });

  return Object.values(weeklyGroupsMap).map(group => {
    let overallStatus = 'approved';
    if (group.entries.some(e => e.status === 'rejected')) overallStatus = 'rejected';
    else if (group.entries.some(e => e.status === 'pending')) overallStatus = 'pending';
    return {
      ...group,
      overallStatus,
      analiticaJoin: Array.from(group.analiticas).join(', ') || 'N/A'
    };
  });
};

/**
 * Ordena las semanas disponibles de más reciente a más antigua.
 */
export const getSortedWeeks = (groupedList, currentWeek) => {
  const weeks = Array.from(new Set(groupedList.map(g => g.weekKey))).sort((a, b) => {
    const parseDate = (str) => {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      return 0;
    };
    return parseDate(b) - parseDate(a);
  });
  if (!weeks.includes(currentWeek)) {
    weeks.unshift(currentWeek);
  }
  return weeks;
};

/**
 * Obtiene la geolocalización actual del dispositivo.
 * Devuelve { lat, lng } o null si no está disponible/permitida.
 */
export const getCurrentPosition = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada por este navegador.');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Error obteniendo geolocalización:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};
