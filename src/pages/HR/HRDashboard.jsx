import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Filter, Search, Eye, Calendar, Clock, FileText, ChevronLeft, CreditCard } from 'lucide-react';

// Helper function updated to date range
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

const HRDashboard = () => {
  const { timeEntries } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);

  // 1. Group by Worker + Week
  const weeklyGroupsMap = {};
  timeEntries.forEach(entry => {
    const weekKey = getWeekRange(entry.date);
    const groupKey = `${entry.workerId}_${weekKey}`;

    if (!weeklyGroupsMap[groupKey]) {
      weeklyGroupsMap[groupKey] = {
        id: groupKey,
        workerId: entry.workerId,
        workerName: entry.workerName,
        weekKey: weekKey,
        entries: [],
        totalHours: 0,
        extraHours: 0,
        specialHours: 0, // Horas en domingo
        totalDietas: 0,  // Contador de dietas
        analiticas: new Set(),
      };
    }

    const group = weeklyGroupsMap[groupKey];
    group.entries.push(entry);

    if (entry.analitica) group.analiticas.add(entry.analitica);
    if (entry.dieta) group.totalDietas = 1; // Máximo 1 dieta por semana

    if (entry.clockIn && entry.clockOut) {
      const hrs = (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;

      const d = new Date(entry.date);
      if (d.getDay() === 0) {
        group.specialHours += hrs;
      } else {
        group.totalHours += hrs;
      }
    }
  });

  // 2. Process Grouped List
  const groupedList = Object.values(weeklyGroupsMap).map(group => {
    let overallStatus = 'approved';
    if (group.entries.some(e => e.status === 'rejected')) overallStatus = 'rejected';
    else if (group.entries.some(e => e.status === 'pending')) overallStatus = 'pending';

    // Asumimos 40h de jornada normal (sin contar domingos) para RRHH
    group.extraHours = Math.max(0, group.totalHours - 40);

    return { ...group, overallStatus, analiticaJoin: Array.from(group.analiticas).join(', ') || 'N/A' };
  });

  const currentWeek = getWeekRange(new Date().toISOString());

  // 3. Filter: solo mostrar la semana actual y aprobados
  const filteredGroups = groupedList.filter(g =>
    g.weekKey === currentWeek &&
    g.overallStatus === 'approved' &&
    (g.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || g.weekKey.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const closeModal = () => {
    setSelectedGroup(null);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4 font-sans text-slate-700 relative">

      {selectedGroup ? (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4 animate-fade-in">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 transition-colors bg-white border border-slate-200 p-1.5 rounded-sm shadow-sm">
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Auditoría Nómina Especial</h2>
                <p className="text-sm text-slate-500">Empleado: <span className="font-semibold text-slate-700">{selectedGroup.workerName}</span> | Período: <span className="font-mono">{selectedGroup.weekKey}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Espacio reservado para acciones top-right si las hay */}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-4 sm:p-6 bg-white">
            <div className="w-full font-sans border border-slate-200 mb-4 rounded-sm">
              <table className="w-full text-left text-[13px] whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Día / Fecha</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Proyecto / Analítica</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Entrada</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Salida</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">H. Normales</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">H. Extras</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Total</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Dietas</th>
                    <th className="px-4 py-3 font-semibold text-slate-800">Evidencia OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {selectedGroup.entries.map(entry => {
                    const d = new Date(entry.date);
                    const isSunday = d.getDay() === 0;
                    const entryHrs = entry.clockIn && entry.clockOut ? (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000 : 0;
                    const normalHrs = Math.min(entryHrs, 8);
                    const extraHrs = Math.max(0, entryHrs - 8);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className={`
                              ${entry.isFestivo ? 'text-purple-500' : isSunday ? 'text-orange-500' : 'text-blue-500'}
                            `} />
                            <span className={`font-semibold capitalize ${entry.isFestivo ? 'text-purple-700' : isSunday ? 'text-orange-700' : 'text-blue-600'}`}>
                              {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {entry.isFestivo && <span className="text-[10px] font-bold text-purple-600 uppercase mt-1 block">Día Festivo</span>}
                          {isSunday && !entry.isFestivo && <span className="text-[10px] font-bold text-orange-600 uppercase mt-1 block">Día Especial (Dom)</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 border-r border-slate-100">
                          {entry.analitica || 'N/A'}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          <span className="font-mono text-slate-600">{formatTime(entry.clockIn)}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          <span className="font-mono text-slate-600">{formatTime(entry.clockOut)}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-700 font-medium">
                          {normalHrs.toFixed(1)} h
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          {extraHrs > 0 ? (
                            <span className="font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded border border-[#fde68a]">
                              {extraHrs.toFixed(1)} h
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-800 font-bold">
                          {entryHrs.toFixed(1)} h
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                          {entry.dieta > 0 ? (
                            <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                              {entry.dieta}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {entry.otImage ? (
                            <div className="flex items-center gap-2">
                              <a 
                                href={entry.otImage} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-[12px] font-medium"
                              >
                                Ver Evidencia
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[12px] font-medium opacity-70">
                              Sin Evidencia
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-200 px-6 py-4 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded border border-slate-200 gap-4">
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Suma H. Normales</p>
                  <p className="text-lg font-bold text-slate-800">{selectedGroup.totalHours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-orange-500 uppercase">Suma H. Especiales</p>
                  <p className="text-lg font-bold text-orange-700">{selectedGroup.specialHours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-purple-500 uppercase">Días Festivos</p>
                  <p className="text-lg font-bold text-purple-700">{selectedGroup.totalFestivos}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-green-500 uppercase">Total Dietas</p>
                  <p className="text-lg font-bold text-green-700">{selectedGroup.totalDietas}</p>
                </div>
              </div>
              <button onClick={closeModal} className="bg-slate-800 text-white px-6 py-2 rounded-sm text-[13px] font-bold hover:bg-slate-700 transition-colors w-full sm:w-auto">Cerrar Auditoría</button>
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4 animate-fade-in">

        {/* Header con Título y Buscador */}
        <div className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
          <h2 className="text-[15px] font-semibold text-slate-800 tracking-tight">Reporte de Nómina Semanal</h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar Empleado o Período..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-[13px] border border-slate-300 rounded px-3 py-1.5 w-full sm:w-64 text-slate-700 focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
          </div>
        </div>

        {/* Rows per page */}
        <div className="px-4 py-3 flex items-center justify-between text-[13px] text-slate-500 border-b border-slate-100">
           <div className="flex items-center gap-2">
             <span>Showing 1 to {filteredGroups.length} of {filteredGroups.length} rows</span>
             <div className="flex items-center gap-1.5 ml-2 hidden sm:flex">
               <select className="border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none bg-white">
                 <option>25</option>
                 <option>50</option>
                 <option>100</option>
               </select>
               <span>rows per page</span>
             </div>
           </div>
           {/* Removido el Período badge de HR solicitado por el usuario */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="border-b-2 border-slate-200 bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-800">Período</th>
                <th className="px-4 py-3 font-semibold text-slate-800">Empleado</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center">H. Normales</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center text-blue-700">H. Extras</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center text-orange-700">H. Especiales (Dom)</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center text-purple-700">Festivos</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center text-green-700">Dietas</th>
                <th className="px-4 py-3 font-semibold text-slate-800 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGroups.map(group => (
                <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> {group.weekKey}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{group.workerName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-800">{group.totalHours.toFixed(1)} hrs</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {group.extraHours > 0 ? (
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {group.extraHours.toFixed(1)} hrs
                      </span>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {group.specialHours > 0 ? (
                      <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        {group.specialHours.toFixed(1)} hrs
                      </span>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-purple-700">
                    {group.totalFestivos}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-700 tabular-nums">
                      {group.totalDietas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="text-blue-600 hover:text-blue-800 underline font-medium text-[13px] transition-colors"
                    >
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 text-[13px]">
                    No hay registros de nómina aprobados para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador Inferior */}
        <div className="flex items-center justify-between px-4 py-4 font-sans text-[13px] border-t border-slate-200 mt-2">
          <div className="text-slate-500">
            Showing 1 to {filteredGroups.length} of {filteredGroups.length} rows
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 border border-slate-300 bg-white text-slate-400 rounded-l-md hover:bg-slate-50 cursor-not-allowed">
              Previous
            </button>
            <button className="px-3 py-1.5 border-t border-b border-r border-blue-600 bg-blue-600 text-white font-medium hover:bg-blue-700">
              1
            </button>
            <button className="px-3 py-1.5 border-t border-b border-r border-slate-300 bg-white text-slate-400 rounded-r-md hover:bg-slate-50 cursor-not-allowed">
              Next
            </button>
          </div>
        </div>

      </div>
      )}
    </div>
  );
};
export default HRDashboard;