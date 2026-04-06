import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
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
  const { timeEntries, approveWeek } = useMockData();
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
      
      {/* Caja de Filtros */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <Filter size={16} className="text-slate-500"/>
          <h2 className="text-sm font-semibold text-slate-800">Filtros de Validación</h2>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-600">Estado de Semana</label>
            <select 
              className="text-[13px] border border-slate-300 rounded px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pending">Pendientes de Revisión</option>
              <option value="approved">Semanas Aprobadas</option>
              <option value="rejected">Semanas Rechazadas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
             <label className="text-[12px] font-medium text-slate-600">Buscar</label>
             <div className="relative">
              <input 
                type="text" 
                placeholder="Empleado o Semana..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="text-[13px] border border-slate-300 rounded px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 w-full"
              />
              <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Panel Global de Tabla Semanal */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col flex-1 pb-4">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-[15px] font-semibold text-slate-800 tracking-tight">Consolidado Semanal por Empleado</h2>
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
                <th className="px-4 py-3 font-semibold text-slate-800">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGroups.map(group => (
                <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-800 font-medium flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400"/> {group.weekKey}
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
                      className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded text-[12px] font-medium transition-colors shadow-sm"
                    >
                      <Eye size={14} /> Revisar Detalle
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
      </div>

      {/* MODAL / PANTALLA DE DETALLE EXPANSIVA */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header Modal */}
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

            {/* Body Modal (Lista de Días) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="space-y-4">
                {selectedGroup.entries.map(entry => {
                  let dayHrs = 0;
                  let normalHrs = 0;
                  let extraHrs = 0;
                  if(entry.clockIn && entry.clockOut) {
                    dayHrs = (new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000;
                    normalHrs = Math.min(dayHrs, 8);
                    extraHrs = Math.max(0, dayHrs - 8);
                  }
                  
                  return (
                    <div key={entry.id} className={`bg-white border rounded-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm ${entry.isFestivo ? 'border-purple-200 bg-purple-50/10' : 'border-slate-200'}`}>
                      <div className="flex flex-col gap-1 w-48 shrink-0">
                         <span className={`font-semibold text-slate-800 capitalize text-[14px] ${entry.isFestivo ? 'text-purple-700' : ''}`}>
                           {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                         </span>
                         {entry.isFestivo && <span className="text-[10px] font-bold text-purple-600 uppercase">Día Festivo</span>}
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center hidden sm:block">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Analítica</p>
                          <p className="text-[14px] font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{entry.analitica || '---'}</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Entrada</p>
                          <p className="text-[14px] font-mono text-slate-700">{formatTime(entry.clockIn)}</p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Salida</p>
                          <p className="text-[14px] font-mono text-slate-700">{formatTime(entry.clockOut)}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Normales</p>
                           <p className="text-[14px] font-bold text-slate-700">{normalHrs.toFixed(1)}h</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[11px] font-semibold text-blue-500 uppercase mb-1">Extras</p>
                           {extraHrs > 0 ? (
                             <p className="text-[14px] font-bold text-blue-700">{extraHrs.toFixed(1)}h</p>
                           ) : (
                             <p className="text-[14px] font-bold text-slate-300">--</p>
                           )}
                        </div>
                        <div className="text-center bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                           <p className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">Total</p>
                           <p className="text-[14px] font-bold text-slate-800">{dayHrs.toFixed(1)}h</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 pl-4">
                        {entry.otImage ? (
                           <a href={entry.otImage} target="_blank" rel="noreferrer" className="flex items-center gap-2 group cursor-pointer">
                             <img src={entry.otImage} className="w-12 h-12 object-cover border border-slate-300 rounded shadow-sm group-hover:border-blue-500 transition-colors" />
                             <span className="text-[12px] text-blue-600 font-medium group-hover:underline flex items-center gap-1"><Eye size={14}/> Ver OT</span>
                           </a>
                        ) : (
                           <span className="text-[12px] text-slate-400 italic flex items-center gap-1.5"><FileText size={14}/> Sin OT adjunta</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer Modal (Accionables) */}
            <div className="border-t border-slate-200 px-6 py-4 bg-white flex flex-col gap-4">
              {isRejecting ? (
                 <div className="flex items-center gap-3 w-full animate-fade-in bg-red-50 p-3 rounded border border-red-100">
                   <span className="text-sm font-semibold text-red-700 whitespace-nowrap">Motivo del rechazo de la semana:</span>
                   <input 
                     type="text" 
                     className="bg-white border border-red-200 rounded-sm px-3 py-1.5 text-[13px] w-full focus:outline-none focus:border-red-400"
                     value={rejectComments}
                     onChange={e => setRejectComments(e.target.value)}
                     placeholder="Ej. Faltan OTs del Lunes y Martes..."
                     autoFocus
                   />
                   <button onClick={handleRejectWeek} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-[12px] rounded-sm font-bold shadow-sm whitespace-nowrap">Confirmar Rechazo</button>
                   <button onClick={() => setIsRejecting(false)} className="bg-white border text-slate-600 px-4 py-1.5 text-[12px] rounded-sm font-medium whitespace-nowrap">Cancelar</button>
                 </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                    <Clock size={16}/> Esta acción cambiará el estado de los {selectedGroup.entries.length} registros.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsRejecting(true)}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 px-6 py-2 rounded-sm text-[13px] font-bold transition-colors shadow-sm"
                    >
                      Rechazar Semana
                    </button>
                    <button 
                      onClick={handleApproveWeek}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-sm text-[13px] font-bold transition-colors shadow-sm flex items-center gap-2"
                    >
                      <Check size={16}/> Aprobar Semana Completa
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerDashboard;
