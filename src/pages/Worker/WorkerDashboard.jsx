import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Clock, CheckCircle, ImagePlus, Check, FileText, CreditCard } from 'lucide-react';

const getWeekRange = (dateString) => {
  const d = new Date(dateString);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options = { day: '2-digit', month: '2-digit' };
  return `${monday.toLocaleDateString('es-ES', options)} al ${sunday.toLocaleDateString('es-ES', options)}`;
};

const WorkerDashboard = () => {
  const { currentUser, timeEntries, clockIn, clockOut, uploadOT } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [analitica, setAnalitica] = useState('');
  const [hasDieta, setHasDieta] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const myEntries = timeEntries.filter(entry => entry.workerId === currentUser.id);
  const todayEntry = myEntries.find(entry => entry.date === new Date().toISOString().split('T')[0]);

  const isWorking = todayEntry && !todayEntry.clockOut;

  const currentWeek = getWeekRange(new Date().toISOString());

  // Agrupar historial por semana
  const weeklyGroups = {};
  myEntries.forEach(entry => {
    const week = getWeekRange(entry.date);
    if (!weeklyGroups[week]) {
      weeklyGroups[week] = {
        weekKey: week,
        entries: [],
        totalHours: 0,
        totalDietas: 0,
        analiticas: new Set()
      };
    }
    const g = weeklyGroups[week];
    g.entries.push(entry);
    if (entry.analitica && entry.analitica !== 'N/A') g.analiticas.add(entry.analitica);
    if (entry.dieta) g.totalDietas = 1; // Máximo 1 por semana

    if (entry.clockIn && entry.clockOut) {
      g.totalHours += (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
    }
  });

  // Mostrar todo el historial disponible ordenado por semana descendente
  const groupedList = Object.values(weeklyGroups)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));

  // Verificar si ya tiene una dieta aplicada en la semana actual
  const currentWeekObj = weeklyGroups[currentWeek];
  const weekHasDieta = currentWeekObj && currentWeekObj.entries.some(e => e.dieta === 1);

  const handleAction = () => {
    if (!todayEntry) {
      if (!analitica.trim()) {
        alert("Por favor ingrese la Analítica (Homoclave) del proyecto.");
        return;
      }
      clockIn(null, analitica, hasDieta ? 1 : 0);
    } else if (isWorking) {
      clockOut(todayEntry.id, null);
    }
  };

  const handleFileUpload = async (e, entryId) => {
    const file = e.target.files[0];
    if (file) {
      await uploadOT(entryId, file);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">Validado</span>;
      case 'rejected': return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">Rechazado</span>;
      default: return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">Pendiente</span>;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col mx-auto max-w-2xl w-full gap-6 pb-12">

      {/* Panel de Registro (Reloj) */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col p-6 font-sans">
        <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          Registro de Jornada
        </h2>

        <div className="flex flex-col items-center mb-8">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase mb-1">
            Hora Actual Registrada
          </span>

          <div className="text-4xl font-bold text-slate-800 tabular-nums my-2">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>

          <p className="text-[12px] text-slate-500">
            {currentTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-5 mt-auto">
          {!todayEntry ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-600">Analítica (Homoclave Proyecto):</label>
                <input
                  type="text"
                  value={analitica}
                  onChange={(e) => setAnalitica(e.target.value)}
                  placeholder="Ej. PRJ-2024-OX"
                  className="w-full text-[13px] border border-slate-300 rounded px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 bg-slate-50"
                  required
                />
              </div>
              <div className="flex items-center gap-2 py-1 px-3 bg-slate-50 border border-slate-200 rounded-sm">
                <input
                  type="checkbox"
                  id="dieta"
                  checked={hasDieta || weekHasDieta}
                  disabled={weekHasDieta}
                  onChange={(e) => setHasDieta(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 disabled:opacity-50"
                />
                <label htmlFor="dieta" className={`text-[13px] font-medium cursor-pointer select-none ${weekHasDieta ? 'text-slate-400' : 'text-slate-700'}`}>
                  {weekHasDieta ? 'Dieta semanal ya aplicada' : '¿Aplicar Dieta?'}
                </label>
              </div>
              <button
                onClick={handleAction}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-3 rounded-sm font-semibold text-[14px] transition-colors shadow-sm mt-1"
              >
                Registrar Entrada
              </button>
            </div>
          ) : isWorking ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#dcfce7] border border-[#bbf7d0] text-[#166534] px-4 py-2.5 rounded-sm text-[13px] font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Turno Activo
                </span>
                <span className="font-mono bg-white/60 px-2 py-0.5 rounded border border-green-200/50">
                  IN: {new Date(todayEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={handleAction}
                className="w-full flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 p-3 rounded-sm font-semibold text-[14px] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                Registrar Salida
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm text-slate-600 flex flex-col items-center gap-1">
              <CheckCircle size={24} className="text-green-600 mb-1" />
              <span className="font-semibold text-[13px]">Jornada Reportada Correctamente</span>
            </div>
          )}
        </div>
      </div>

      {/* Resumen Semanal y Carga de OT agrupado*/}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col font-sans overflow-hidden">
        <h2 className="text-base font-semibold text-slate-800 px-5 py-4 flex items-center gap-2 bg-white">
          <FileText size={16} className="text-slate-500" />
          Mi Historial de Actividades
        </h2>

        <div className="flex flex-col">
          {groupedList.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-400 border-t border-slate-100">
              No hay registros para mostrar.
            </div>
          ) : (
            groupedList.map((weekGroup) => (
              <div key={weekGroup.weekKey} className="border-t border-slate-200">

                {/* Cabecera de la Semana */}
                <div className="bg-slate-50/80 px-5 py-3 flex flex-wrap items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-700 text-[13px]">{weekGroup.weekKey}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[12px] font-semibold text-slate-600">
                      Total Horas Semanales: <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ml-1">{weekGroup.totalHours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                </div>

                {/* Dias de la semana */}
                <div className="flex flex-col divide-y divide-slate-100 bg-white">
                  {weekGroup.entries.map((entry) => (
                    <div key={entry.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">

                      {/* Info Basica */}
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-[14px] text-slate-800 capitalize">
                            {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          {getStatusBadge(entry.status)}
                          {entry.analitica && entry.analitica !== 'N/A' && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-mono text-[11px] ml-1">
                              {entry.analitica}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-slate-500">
                          <span className="font-mono">In: {formatTime(entry.clockIn)}</span>
                          <span className="font-mono">Out: {formatTime(entry.clockOut)}</span>
                        </div>
                      </div>

                      {/* Zona Carga de OT */}
                      <div className="flex items-center border border-slate-200 rounded-sm bg-slate-50 p-2 shrink-0 self-start sm:self-auto">
                        {entry.otImage ? (
                          <div className="flex items-center gap-3">
                            <a href={entry.otImage} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded border border-slate-300 w-12 h-12 bg-white flex items-center justify-center">
                              <img src={entry.otImage} alt="OT" className="w-full h-full object-cover" />
                            </a>
                            <div className="flex flex-col">
                              <span className="text-[12px] font-semibold text-slate-700 flex items-center gap-1"><Check size={12} className="text-green-600" /> OT Cargada</span>
                              <label className="text-[11px] text-blue-600 hover:underline cursor-pointer mt-0.5">
                                Acualizar foto
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-36 h-12 border border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50 transition-colors cursor-pointer rounded-sm group relative">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 group-hover:text-blue-600">
                              <ImagePlus size={14} /> Subir OT
                            </span>
                          </label>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default WorkerDashboard;
