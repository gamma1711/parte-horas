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
  const [filterState, setFilterState] = useState('approved');
  const [filterWeek, setFilterWeek] = useState(getWeekRange(new Date().toISOString()));

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
        group.totalHours += Math.min(hrs, 8);
        group.extraHours += Math.max(0, hrs - 8);
      }
    }
  });

  // 2. Process Grouped List
  const groupedList = Object.values(weeklyGroupsMap).map(group => {
    let overallStatus = 'approved';
    if (group.entries.some(e => e.status === 'rejected')) overallStatus = 'rejected';
    else if (group.entries.some(e => e.status === 'pending')) overallStatus = 'pending';

    return { ...group, overallStatus, analiticaJoin: Array.from(group.analiticas).join(', ') || 'N/A' };
  });

  const currentWeek = getWeekRange(new Date().toISOString());

  const availableWeeks = Array.from(new Set(groupedList.map(g => g.weekKey))).sort((a, b) => {
    const parseDate = (str) => {
      const parts = str.split(' ')[0].split('/'); // DD/MM/YYYY
      if (parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]).getTime();
      return 0;
    };
    return parseDate(b) - parseDate(a); // descendente
  });
  if (!availableWeeks.includes(currentWeek)) {
    availableWeeks.unshift(currentWeek);
  }

  // 3. Filter: aplicar filtros dinámicos
  const filteredGroups = groupedList.filter(g =>
    (filterWeek === 'todas' || g.weekKey === filterWeek) &&
    (filterState === 'todos' || g.overallStatus === filterState) &&
    (g.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || g.weekKey.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="font-semibold text-[12px] text-green-700">Aprobado</span>;
      case 'rejected': return <span className="font-semibold text-[12px] text-red-600">Rechazado</span>;
      default: return <span className="font-semibold text-[12px] text-orange-600">Pendiente</span>;
    }
  };

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
                    const normalHrs = isSunday ? 0 : Math.min(entryHrs, 8);
                    const extraHrs = isSunday ? 0 : Math.max(0, entryHrs - 8);

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
                            <span className="font-bold text-[#b45309]">
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
                            <span className="font-bold text-green-700">
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

          {/* Filtros */}
          <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[13px] text-slate-500 border-b border-slate-100 gap-3">
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Período:</span>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none bg-white max-w-[200px] truncate"
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(e.target.value)}
                >
                  <option value="todas">Todas las semanas</option>
                  {availableWeeks.map(w => (
                    <option key={w} value={w}>{w === currentWeek ? `${w} (Actual)` : w}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Estado:</span>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none bg-white"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobados</option>
                  <option value="rejected">Rechazados</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="border-b-2 border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Período</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100">Empleado</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">H. Normales</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center text-blue-700">H. Extras</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center text-orange-700">H. Especiales (Dom)</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center text-purple-700">Festivos</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center text-green-700">Dietas</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-100 text-center">Estado</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800 font-medium flex items-center gap-2 border-r border-slate-100">
                      <Calendar size={14} className="text-slate-400" /> {group.weekKey}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium border-r border-slate-100">{group.workerName}</td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <span className="font-semibold text-slate-800">{group.totalHours.toFixed(1)} hrs</span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      {group.extraHours > 0 ? (
                        <span className="font-bold text-blue-700">
                          {group.extraHours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      {group.specialHours > 0 ? (
                        <span className="font-bold text-orange-700">
                          {group.specialHours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-700 border-r border-slate-100">
                      {group.totalFestivos}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <span className="font-bold text-green-700 tabular-nums">
                        {group.totalDietas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-100">{getStatusBadge(group.overallStatus)}</td>
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
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-500 text-[13px]">
                      No hay registros de nómina para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default HRDashboard;