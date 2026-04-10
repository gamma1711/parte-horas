import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Filter, Search, Eye, Check, Calendar, Clock, FileText, ChevronLeft, X } from 'lucide-react';

// Helper to get ISO Week string like "2024-W12"
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

const ManagerDashboard = () => {
  const { timeEntries, approveWeek } = useData();
  const [filterState, setFilterState] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

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
        specialHours: 0, // Domingos
        totalFestivos: 0,
        totalDietas: 0,  // Nuevo campo
        analiticas: new Set(),
      };
    }

    const group = weeklyGroupsMap[groupKey];
    group.entries.push(entry);

    if (entry.analitica) group.analiticas.add(entry.analitica);
    if (entry.isFestivo) group.totalFestivos += 1;
    if (entry.dieta) group.totalDietas = 1; // Máximo 1 por semana

    if (entry.clockIn && entry.clockOut) {
      const hrs = (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
      group.totalHours += hrs;
    }
  });

  // 2. Process Grouped List
  const groupedList = Object.values(weeklyGroupsMap).map(group => {
    let overallStatus = 'approved';
    if (group.entries.some(e => e.status === 'rejected')) overallStatus = 'rejected';
    else if (group.entries.some(e => e.status === 'pending')) overallStatus = 'pending';

    group.extraHours = Math.max(0, group.totalHours - 48); // Asumiendo 48h base
    return { ...group, overallStatus, analiticaJoin: Array.from(group.analiticas).join(', ') || 'N/A' };
  });

  const currentWeek = getWeekRange(new Date().toISOString());

  // 3. Filter
  const filteredGroups = groupedList.filter(g =>
    g.weekKey === currentWeek && // Solo semana actual por solicitud
    (filterState === 'todos' || g.overallStatus === filterState) &&
    (g.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || g.weekKey.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">Aprobado</span>;
      case 'rejected': return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">Rechazado</span>;
      default: return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">Pendiente</span>;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Handlers Modal ---
  const handleApproveWeek = () => {
    const ids = selectedGroup.entries.map(e => e.id);
    approveWeek(ids, 'approved');
    setSelectedGroup({ ...selectedGroup, overallStatus: 'approved' });
    closeModal();
  };

  const handleRejectWeek = () => {
    const ids = selectedGroup.entries.map(e => e.id);
    approveWeek(ids, 'rejected', rejectComments);
    setSelectedGroup({ ...selectedGroup, overallStatus: 'rejected' });
    closeModal();
  };

  const closeModal = () => {
    setSelectedGroup(null);
    setIsRejecting(false);
    setRejectComments('');
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4 font-sans text-slate-700 relative">

      {selectedGroup ? (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4 animate-fade-in">

          {/* Header Detalle */}
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 transition-colors bg-white border border-slate-200 p-1.5 rounded-sm shadow-sm">
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Revisión de Semana: {selectedGroup.weekKey}</h2>
                <p className="text-sm text-slate-500">Empleado: <span className="font-semibold text-slate-700">{selectedGroup.workerName}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Total Horas</p>
                <p className="font-bold text-slate-800">{selectedGroup.totalHours.toFixed(1)} hrs</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-500 mb-0.5">H. Extras</p>
                {selectedGroup.extraHours > 0 ? (
                  <p className="font-bold text-blue-700">{selectedGroup.extraHours.toFixed(1)}</p>
                ) : (
                  <p className="font-bold text-slate-300">--</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-orange-500 mb-0.5">Especiales</p>
                {selectedGroup.specialHours > 0 ? (
                  <p className="font-bold text-orange-600">{selectedGroup.specialHours.toFixed(1)}</p>
                ) : (
                  <p className="font-bold text-slate-300">--</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-purple-500 mb-0.5">Festivos</p>
                <p className="font-bold text-purple-700">{selectedGroup.totalFestivos}</p>
              </div>
              {getStatusBadge(selectedGroup.overallStatus)}
            </div>
          </div>

          {/* Body Detalle (Lista de Días) */}
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
                    <th className="px-4 py-3 font-semibold text-slate-800">Evidencia OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {selectedGroup.entries.map(entry => {
                    let dayHrs = 0;
                    let normalHrs = 0;
                    let extraHrs = 0;
                    if (entry.clockIn && entry.clockOut) {
                      dayHrs = (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
                      normalHrs = Math.min(dayHrs, 8);
                      extraHrs = Math.max(0, dayHrs - 8);
                    }

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-100">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-blue-500" />
                            <span className={`font-semibold capitalize ${entry.isFestivo ? 'text-purple-700' : 'text-blue-600'}`}>
                              {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {entry.isFestivo && <span className="text-[10px] font-bold text-purple-600 uppercase mt-1 block">Día Festivo</span>}
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
                          {dayHrs.toFixed(1)} h
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Detalle (Accionables) */}
          <div className="border-t border-slate-200 px-6 py-4 bg-white flex flex-col gap-4">
            {isRejecting ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full animate-fade-in bg-red-50 p-4 rounded border border-red-100">
                <span className="text-sm font-semibold text-red-700 whitespace-nowrap">Motivo del rechazo:</span>
                <input
                  type="text"
                  className="bg-white border border-red-200 rounded-sm px-3 py-1.5 text-[13px] w-full focus:outline-none focus:border-red-400"
                  value={rejectComments}
                  onChange={e => setRejectComments(e.target.value)}
                  placeholder="Ej. Faltan OTs del Lunes y Martes..."
                  autoFocus
                />
                <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                  <button onClick={handleRejectWeek} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-[12px] rounded-sm font-bold shadow-sm whitespace-nowrap w-full sm:w-auto">Confirmar Rechazo</button>
                  <button onClick={() => setIsRejecting(false)} className="bg-white border text-slate-600 px-4 py-1.5 text-[12px] rounded-sm font-medium whitespace-nowrap w-full sm:w-auto">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                  <Clock size={16} /> Esta acción cambiará el estado de los {selectedGroup.entries.length} registros.
                </p>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 px-6 py-2 rounded-sm text-[13px] font-bold transition-colors shadow-sm w-full sm:w-auto"
                  >
                    Rechazar Semana
                  </button>
                  <button
                    onClick={handleApproveWeek}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-sm text-[13px] font-bold transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Check size={16} /> Aprobar Semana Completa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4 animate-fade-in">

          {/* Header con Título y Buscador */}
          <div className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
            <h2 className="text-[15px] font-semibold text-slate-800 tracking-tight">Consolidado Semanal por Empleado</h2>
          </div>

          {/* Rows per page y Filtro Extra */}
          <div className="px-4 py-3 flex items-center justify-between text-[13px] text-slate-500 border-b border-slate-100">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="border-b-2 border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-800">Período (Semana)</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Empleado</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Analítica</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 text-center">H. Normales</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 text-center text-blue-700">H. Extras</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 text-center text-orange-600">H. Especiales (Dom)</th>
                  <th className="px-4 py-3 font-semibold text-slate-800 text-center text-purple-700">Festivos</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Estado</th>
                  <th className="px-4 py-3 font-semibold text-slate-800">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" /> {group.weekKey}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{group.workerName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[12px]">{group.analiticaJoin}</td>
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
                        <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                          {group.specialHours.toFixed(1)} hrs
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-700">
                      {group.totalFestivos || 0}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(group.overallStatus)}</td>
                    <td className="px-4 py-3">
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
                      No se encontraron grupos semanales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador Inferior */}
        </div>

      )}
    </div>
  );
};

export default ManagerDashboard;
