import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Clock, CheckCircle, ImagePlus, Check, FileText, CreditCard, Search } from 'lucide-react';

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

      {/* Resumen Semanal y Carga de OT agrupado - Panel NC */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col font-sans overflow-hidden">
        
        {/* Header con Título y Buscador */}
        <div className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
          <h2 className="text-[15px] font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText size={16} className="text-slate-500" />
            Mi Historial de Actividades
          </h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar fecha o proyecto..." 
              className="text-[13px] border border-slate-300 rounded px-3 py-1.5 w-full sm:w-64 text-slate-700 focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
          </div>
        </div>

        {/* Rows per page */}
        <div className="px-4 py-3 flex items-center justify-between text-[13px] text-slate-500 border-b border-slate-100">
           <div className="flex items-center gap-2">
             <span>Showing últimos registros</span>
             <div className="flex items-center gap-1.5 ml-2 hidden sm:flex">
               <select className="border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none bg-white">
                 <option>25</option>
                 <option>50</option>
                 <option>100</option>
               </select>
               <span>rows per page</span>
             </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          {groupedList.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-400">
              No hay registros para mostrar.
            </div>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Día / Fecha</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Proyecto</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Entrada</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Salida</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Estado</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Evidencia (OT)</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {groupedList.flatMap((weekGroup) => [
                  <tr key={`week-${weekGroup.weekKey}`} className="bg-slate-50/80 border-y border-slate-200">
                    <td colSpan="5" className="px-4 py-2 text-[12px] uppercase text-slate-600 font-bold tracking-wider">
                      Semana: {weekGroup.weekKey} <span className="ml-4 font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 normal-case">Total: {weekGroup.totalHours.toFixed(1)} hrs</span>
                    </td>
                  </tr>,
                  ...weekGroup.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3 border-r border-slate-100">
                        <span className="font-semibold text-slate-800 capitalize">
                          {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 font-medium">
                        {entry.analitica && entry.analitica !== 'N/A' ? entry.analitica : '---'}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center">
                        <span className="font-mono text-slate-500">{formatTime(entry.clockIn)}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center">
                        <span className="font-mono text-slate-500">{formatTime(entry.clockOut)}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.otImage ? (
                          <div className="flex items-center gap-3">
                            <a href={entry.otImage} target="_blank" rel="noreferrer" className="block w-10 h-10 rounded border border-slate-300 overflow-hidden shadow-sm hover:border-blue-500">
                              <img src={entry.otImage} alt="OT" className="w-full h-full object-cover" />
                            </a>
                            <label className="text-[11px] text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                              <ImagePlus size={12}/> Actualizar
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 rounded-sm cursor-pointer transition-colors w-fit text-[12px] font-medium">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                            <ImagePlus size={14} /> Subir OT
                          </label>
                        )}
                      </td>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginador Inferior */}
        <div className="flex items-center justify-between px-4 py-4 font-sans text-[13px] border-t border-slate-200 mt-2">
          <div className="text-slate-500">
            Showing records
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 border border-slate-300 bg-white text-slate-400 rounded-l-md hover:bg-slate-50 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1.5 border-t border-b border-r border-blue-600 bg-blue-600 text-white font-medium hover:bg-blue-700">1</button>
            <button className="px-3 py-1.5 border-t border-b border-r border-slate-300 bg-white text-slate-400 rounded-r-md hover:bg-slate-50 cursor-not-allowed">Next</button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default WorkerDashboard;
