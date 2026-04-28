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
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
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

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return <span className="text-[12px] text-slate-600">Aprobado</span>;
      case 'rejected': return <span className="text-[12px] text-slate-600">Rechazado</span>;
      default: return <span className="text-[12px] text-slate-600">Pendiente</span>;
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
    <div className="max-w-7xl mx-auto flex flex-col font-sans text-slate-700 relative">

      {selectedGroup ? (
        <div className="flex flex-col flex-1 animate-fade-in">

          {/* Sub-header */}
          <div className="flex items-center gap-3 mb-1">
            <button onClick={closeModal} className="text-[#0e7490] hover:text-[#0c5f73] transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-[13px] text-slate-500">Time Sheet</span>
          </div>

          {/* Big Title */}
          <h1 className="text-[22px] font-normal text-slate-800 mb-3">
            Auditoría Nómina: {selectedGroup.workerName}
          </h1>

          {/* General section */}
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1.5">General</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0 text-[13px]">
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Empleado</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800 font-medium">{selectedGroup.workerName}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Período</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800">{selectedGroup.weekKey}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Analítica</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800 font-mono text-[12px]">{selectedGroup.analiticaJoin}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Estado</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                {getStatusText(selectedGroup.overallStatus)}
              </div>
            </div>
          </div>

          {/* Lines tabs */}
          <div className="flex items-center gap-6 border-b border-slate-200 mb-0 text-[13px]">
            <span className="text-slate-800 font-semibold border-b-2 border-[#0e7490] pb-2 -mb-px">Líneas</span>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Día / Fecha</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Proyecto</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Entrada</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Salida</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Normal</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Extra</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Total</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Dietas</th>
                  <th className="px-3 py-2.5 font-medium">Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroup.entries.map(entry => {
                  const d = new Date(entry.date);
                  const isSunday = d.getDay() === 0;
                  const entryHrs = entry.clockIn && entry.clockOut ? (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000 : 0;
                  const normalHrs = isSunday ? 0 : Math.min(entryHrs, 8);
                  const extraHrs = isSunday ? 0 : Math.max(0, entryHrs - 8);

                  return (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-100">
                        <span className={`capitalize ${isSunday ? 'text-orange-700' : entry.isFestivo ? 'text-purple-700' : 'text-slate-700'}`}>
                          {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        {entry.isFestivo && <span className="text-[10px] text-purple-600 uppercase ml-1">Festivo</span>}
                        {isSunday && !entry.isFestivo && <span className="text-[10px] text-orange-600 uppercase ml-1">Dom</span>}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-slate-500">{entry.analitica || 'N/A'}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockIn)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockOut)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{normalHrs.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center">{extraHrs > 0 ? <span className="text-slate-700">{extraHrs.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-semibold text-slate-800">{entryHrs.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{entry.dieta > 0 ? entry.dieta : <span className="text-slate-300">0</span>}</td>
                      <td className="px-3 py-2">
                        {entry.otImage ? (
                          <a href={entry.otImage} target="_blank" rel="noreferrer" className="text-[#0e7490] hover:underline text-[11px]">Ver</a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan="4" className="px-3 py-2 text-right text-slate-500 font-medium text-[11px]">Total</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{selectedGroup.totalHours.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{selectedGroup.extraHours.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900 border-r border-slate-100">{(selectedGroup.totalHours + selectedGroup.extraHours + selectedGroup.specialHours).toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{selectedGroup.totalDietas}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-[14px] font-semibold text-slate-800 mb-3">Resumen de Horas</h3>
            <div className="text-[12px] space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">H. Normales</span><span className="text-slate-800 tabular-nums">{selectedGroup.totalHours.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">H. Extras</span><span className="text-slate-800 tabular-nums">{selectedGroup.extraHours.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">H. Domingo</span><span className="text-slate-800 tabular-nums">{selectedGroup.specialHours.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Festivos</span><span className="text-slate-800 tabular-nums">{selectedGroup.totalFestivos || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Dietas</span><span className="text-slate-800 tabular-nums">{selectedGroup.totalDietas}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                <span className="text-slate-800 font-semibold">Total</span>
                <span className="text-slate-900 font-bold tabular-nums">{(selectedGroup.totalHours + selectedGroup.extraHours + selectedGroup.specialHours).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button onClick={closeModal} className="text-[13px] text-slate-500 hover:text-slate-700 transition-colors">← Volver al listado</button>
          </div>
        </div>

      ) : (
        <div className="flex flex-col flex-1 animate-fade-in">

          {/* Big Title */}
          <h1 className="text-[22px] font-normal text-slate-800 mb-1">
            Reporte de Nómina Semanal
          </h1>
          <p className="text-[13px] text-slate-500 mb-4">Consolidado de horas por empleado para revisión de nóminas.</p>

          {/* Action bar / Filters */}
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-slate-600 border-b border-slate-200 pb-3 mb-0">
            <div className="relative flex items-center gap-1.5">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none border-b border-transparent focus:border-[#0e7490] transition-colors w-48 pb-0.5"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Período:</span>
              <select
                className="bg-transparent text-slate-700 focus:outline-none border-b border-transparent hover:border-slate-300 focus:border-[#0e7490] pb-0.5 max-w-[200px]"
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
              >
                <option value="todas">Todas las semanas</option>
                {availableWeeks.map(w => (
                  <option key={w} value={w}>{w === currentWeek ? `${w} (Actual)` : w}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Estado:</span>
              <select
                className="bg-transparent text-slate-700 focus:outline-none border-b border-transparent hover:border-slate-300 focus:border-[#0e7490] pb-0.5"
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

          {/* Main table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Período</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Empleado</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Normal</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Extra</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Domingo</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Festivos</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Dietas</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Estado</th>
                  <th className="px-3 py-2.5 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(group => (
                  <tr
                    key={group.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-700">{group.weekKey}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-700 font-medium">{group.workerName}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{group.totalHours.toFixed(1)}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center">{group.extraHours > 0 ? <span className="text-slate-700">{group.extraHours.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center">{group.specialHours > 0 ? <span className="text-slate-700">{group.specialHours.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{group.totalFestivos || 0}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{group.totalDietas}</td>
                    <td className="px-3 py-2 border-r border-slate-100">{getStatusText(group.overallStatus)}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-800">{(group.totalHours + group.extraHours + group.specialHours).toFixed(1)}</td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-3 py-8 text-center text-slate-400 text-[12px]">
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