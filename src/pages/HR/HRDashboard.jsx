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

      {/* Caja de Filtros */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Panel de Consolidación RRHH</h2>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-600">Buscar por Empleado o Período</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. Juan o 01/04..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="text-[13px] border border-slate-300 rounded px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 w-full"
              />
              <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1.5">
              Solo se muestran las semanas aprobadas del período: <strong className="text-blue-600 font-mono">{currentWeek}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Panel Global de Tabla Semanal */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-[15px] font-semibold text-slate-800 tracking-tight">Reporte de Nómina Semanal</h2>
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
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded text-[12px] font-medium transition-colors shadow-sm"
                    >
                      <Eye size={14} /> Detalle
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
      </div>

      {/* MODAL DETALLE RRHH */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
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
                {/* Etiqueta eliminada por solicitud */}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
              <div className="space-y-3">
                {selectedGroup.entries.map(entry => {
                  const d = new Date(entry.date);
                  const isSunday = d.getDay() === 0;
                  const entryHrs = entry.clockIn && entry.clockOut ? (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000 : 0;
                  const normalHrs = Math.min(entryHrs, 8);
                  const extraHrs = Math.max(0, entryHrs - 8);

                  return (
                    <div key={entry.id} className={`bg-white border rounded-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${entry.isFestivo ? 'border-purple-200 bg-purple-50/10' : isSunday ? 'border-orange-200 bg-orange-50/10' : 'border-slate-200'}`}>
                      <div className="flex flex-col gap-1 w-40 shrink-0">
                        <span className={`font-semibold text-slate-800 capitalize text-[13px] ${entry.isFestivo ? 'text-purple-700' : isSunday ? 'text-orange-700' : ''}`}>
                          {d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        {entry.isFestivo && <span className="text-[10px] font-bold text-purple-600 uppercase">Día Festivo</span>}
                        {isSunday && !entry.isFestivo && <span className="text-[10px] font-bold text-orange-600 uppercase">Día Especial (Dom)</span>}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center hidden sm:block">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Proyecto</p>
                          <p className="text-[12px] font-mono text-slate-700">{entry.analitica}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Normales</p>
                          <p className="text-[12px] font-bold text-slate-700">{normalHrs.toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-blue-500 uppercase">Extras</p>
                          {extraHrs > 0 ? (
                            <p className="text-[12px] font-bold text-blue-700">{extraHrs.toFixed(1)}h</p>
                          ) : (
                            <p className="text-[12px] font-bold text-slate-300">--</p>
                          )}
                        </div>
                        <div className="text-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total</p>
                          <p className={`text-[12px] font-bold ${isSunday ? 'text-orange-700' : 'text-slate-800'}`}>{entryHrs.toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">Dietas</p>
                          <p className="text-[12px] font-bold text-green-700">{entry.dieta || 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end w-32">
                        {entry.otImage ? (
                          <a href={entry.otImage} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline text-[12px] font-medium">
                            <FileText size={14} /> Ver Evidencia
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sin OT</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-white">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded border border-slate-200">
                <div className="flex gap-8">
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
                <button onClick={closeModal} className="bg-slate-800 text-white px-6 py-2 rounded-sm text-[13px] font-bold hover:bg-slate-700 transition-colors">Cerrar Auditoría</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HRDashboard;