import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Search, Check, ChevronLeft, X, MapPin, Pencil } from 'lucide-react';
import { 
  getWeekRange, 
  ANALITICAS, 
  formatTime, 
  getStatusLabel, 
  groupEntriesByWorkerWeek, 
  getSortedWeeks,
  roundToHalfHour,
  parseLocalDate
} from '../../lib/utils';

const ManagerDashboard = () => {
  const { timeEntries, approveWeek, updateEntryAnalitica } = useData();
  const [filterState, setFilterState] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState(getWeekRange(new Date().toISOString()));

  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);

  // Editar analítica inline
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editSearch, setEditSearch] = useState('');
  const [editDropdownPos, setEditDropdownPos] = useState({ top: 0, left: 0 });

  const filteredEditAnaliticas = ANALITICAS.filter(a =>
    a.toLowerCase().includes(editSearch.toLowerCase())
  );

  useEffect(() => {
    if (editingEntryId) {
      const handleClickOutside = () => {
        setEditingEntryId(null);
        setEditSearch('');
      };
      // Delay to avoid closing immediately on the same click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingEntryId]);

  // Use shared grouping utility
  const groupedList = groupEntriesByWorkerWeek(timeEntries);
  const currentWeek = getWeekRange(new Date().toISOString());
  const availableWeeks = getSortedWeeks(groupedList, currentWeek);

  // Filter
  const filteredGroups = groupedList.filter(g =>
    (filterWeek === 'todas' || g.weekKey === filterWeek) &&
    (filterState === 'todos' || g.overallStatus === filterState) &&
    (g.workerName.toLowerCase().includes(searchTerm.toLowerCase()) || g.weekKey.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusText = (status) => {
    return <span className="text-[12px] text-slate-600">{getStatusLabel(status)}</span>;
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
    <div className="max-w-7xl mx-auto flex flex-col font-sans text-slate-700 relative">

      {selectedGroup ? (
        <div className="flex flex-col flex-1 animate-fade-in">

          {/* Sub-header with back arrow */}
          <div className="flex items-center gap-3 mb-1">
            <button onClick={closeModal} className="text-[#0e7490] hover:text-[#0c5f73] transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-[13px] text-slate-500">Time Sheet</span>
          </div>

          {/* Big Title */}
          <h1 className="text-[22px] font-normal text-slate-800 mb-3">
            Revisión Semana: {selectedGroup.weekKey}
          </h1>

          {/* Action bar */}
          <div className="flex items-center gap-1 text-[13px] text-slate-600 border-b border-slate-200 pb-3 mb-5">
            <button
              onClick={handleApproveWeek}
              className="flex items-center gap-1.5 px-3 py-1 hover:bg-slate-100 rounded transition-colors"
            >
              <Check size={14} className="text-[#0e7490]" />
              <span>Aprobar</span>
            </button>
            <button
              onClick={() => setIsRejecting(!isRejecting)}
              className="flex items-center gap-1.5 px-3 py-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={14} className="text-slate-500" />
              <span>Rechazar</span>
            </button>
          </div>

          {/* Reject input */}
          {isRejecting && (
            <div className="flex items-center gap-3 mb-4 animate-fade-in">
              <span className="text-[13px] text-slate-500 whitespace-nowrap">Motivo:</span>
              <input
                type="text"
                className="flex-1 border-b border-slate-300 bg-transparent text-[13px] py-1 focus:outline-none focus:border-[#0e7490] transition-colors"
                value={rejectComments}
                onChange={e => setRejectComments(e.target.value)}
                placeholder="Ej. Faltan OTs del Lunes..."
                autoFocus
              />
              <button onClick={handleRejectWeek} className="text-[13px] text-red-600 hover:text-red-800 font-medium whitespace-nowrap">Confirmar</button>
              <button onClick={() => setIsRejecting(false)} className="text-[13px] text-slate-400 hover:text-slate-600 whitespace-nowrap">Cancelar</button>
            </div>
          )}

          {/* General info section with dotted lines */}
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-1.5">General</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-0 text-[13px]">
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Empleado</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800 font-medium">{selectedGroup.workerName}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Analítica</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800 font-mono text-[12px]">{selectedGroup.analiticaJoin}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Período</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800">{selectedGroup.weekKey}</span>
              </div>
              <div className="flex items-baseline py-1.5">
                <span className="text-slate-500 min-w-[140px]">Estado</span>
                <span className="flex-1 border-b border-dotted border-slate-300 mx-2"></span>
                <span className="text-slate-800">{getStatusText(selectedGroup.overallStatus)}</span>
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
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Ubicación</th>
                  <th className="px-3 py-2.5 font-medium">Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroup.entries.map(entry => {
                  let dayHrs = 0;
                  let normalHrs = 0;
                  let extraHrs = 0;
                  const d = parseLocalDate(entry.date);
                  const isSunday = d.getDay() === 0;
                  if (entry.clockIn && entry.clockOut) {
                    dayHrs = roundToHalfHour((new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000);
                    normalHrs = isSunday ? 0 : Math.min(dayHrs, 8);
                    extraHrs = isSunday ? 0 : Math.max(0, dayHrs - 8);
                  }

                  return (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-100">
                        <span className={`capitalize ${isSunday ? 'text-orange-700' : entry.isFestivo ? 'text-purple-700' : 'text-slate-700'}`}>
                          {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        {entry.isFestivo && <span className="text-[10px] text-purple-600 uppercase ml-1">Festivo</span>}
                        {isSunday && !entry.isFestivo && <span className="text-[10px] text-orange-600 uppercase ml-1">Dom</span>}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100">
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setEditDropdownPos({ top: rect.bottom + 2, left: rect.left });
                            setEditingEntryId(entry.id);
                            setEditSearch('');
                          }}
                          className="flex items-center gap-1 text-slate-500 hover:text-[#0e7490] transition-colors group"
                          title="Click para editar analítica"
                        >
                          <span className="text-[12px]">{entry.analitica || 'N/A'}</span>
                          <Pencil size={10} className="text-slate-300 group-hover:text-[#0e7490] transition-colors flex-shrink-0" />
                        </button>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockIn)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockOut)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{normalHrs.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center">{extraHrs > 0 ? <span className="text-slate-700">{extraHrs.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-semibold text-slate-800">{dayHrs.toFixed(1)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {entry.clockInLat && entry.clockInLng ? (
                            <button
                              onClick={() => setMapLocation({ lat: entry.clockInLat, lng: entry.clockInLng, label: `Entrada — ${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}` })}
                              className="text-[#0e7490] hover:text-[#0c5f73] transition-colors" title="Ver ubicación de entrada"
                            >
                              <MapPin size={14} />
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                          {entry.clockOutLat && entry.clockOutLng ? (
                            <button
                              onClick={() => setMapLocation({ lat: entry.clockOutLat, lng: entry.clockOutLng, label: `Salida — ${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}` })}
                              className="text-orange-500 hover:text-orange-700 transition-colors" title="Ver ubicación de salida"
                            >
                              <MapPin size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {entry.otImage ? (
                          <a href={entry.otImage} target="_blank" rel="noreferrer" className="text-[#0e7490] hover:underline text-[11px]">Ver</a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan="4" className="px-3 py-2 text-right text-slate-500 font-medium text-[11px]">Total</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{selectedGroup.totalHours.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{selectedGroup.extraHours.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900">{(selectedGroup.totalHours + selectedGroup.extraHours + selectedGroup.specialHours).toFixed(1)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right-panel style summary at the bottom */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-[14px] font-semibold text-slate-800 mb-3">Resumen de Horas</h3>
            <div className="text-[12px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">H. Normales</span>
                <span className="text-slate-800 tabular-nums">{selectedGroup.totalHours.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">H. Extras</span>
                <span className="text-slate-800 tabular-nums">{selectedGroup.extraHours.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">H. Domingo</span>
                <span className="text-slate-800 tabular-nums">{selectedGroup.specialHours.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Festivos</span>
                <span className="text-slate-800 tabular-nums">{selectedGroup.totalFestivos}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5">
                <span className="text-slate-800 font-semibold">Total</span>
                <span className="text-slate-900 font-bold tabular-nums">{(selectedGroup.totalHours + selectedGroup.extraHours + selectedGroup.specialHours).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      ) : (
        <div className="flex flex-col flex-1 animate-fade-in">

          {/* Big Title */}
          <h1 className="text-[22px] font-normal text-slate-800 mb-1">
            Consolidado Semanal
          </h1>
          <p className="text-[13px] text-slate-500 mb-4">Panel de aprobación de horas por empleado y período.</p>

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
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100">Analítica</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Normal</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Extra</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">H. Domingo</th>
                  <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Festivos</th>
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
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-500 font-mono text-[11px]">{group.analiticaJoin}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{group.totalHours.toFixed(1)}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center">{group.extraHours > 0 ? <span className="text-slate-700">{group.extraHours.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center">{group.specialHours > 0 ? <span className="text-slate-700">{group.specialHours.toFixed(1)}</span> : <span className="text-slate-300">0</span>}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-700">{group.totalFestivos || 0}</td>
                    <td className="px-3 py-2 border-r border-slate-100">{getStatusText(group.overallStatus)}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-800">{(group.totalHours + group.extraHours + group.specialHours).toFixed(1)}</td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-3 py-8 text-center text-slate-400 text-[12px]">
                      No se encontraron registros para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      )}

      {/* ====== MAPA MODAL ====== */}
      {mapLocation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMapLocation(null)}>
          <div className="bg-white w-full max-w-2xl rounded shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[14px] text-slate-800 font-medium">
                <MapPin size={16} className="text-[#0e7490]" />
                {mapLocation.label}
              </div>
              <button onClick={() => setMapLocation(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            {/* Map iframe */}
            <div className="w-full h-[400px]">
              <iframe
                title="Ubicación del registro"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLocation.lng - 0.005}%2C${mapLocation.lat - 0.003}%2C${mapLocation.lng + 0.005}%2C${mapLocation.lat + 0.003}&layer=mapnik&marker=${mapLocation.lat}%2C${mapLocation.lng}`}
                allowFullScreen
              />
            </div>
            {/* Footer coords */}
            <div className="px-4 py-2 border-t border-slate-200 text-[12px] text-slate-500 flex items-center justify-between">
              <span>Lat: {mapLocation.lat.toFixed(6)}, Lng: {mapLocation.lng.toFixed(6)}</span>
              <a
                href={`https://www.google.com/maps?q=${mapLocation.lat},${mapLocation.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#0e7490] hover:underline"
              >
                Abrir en Google Maps ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ====== EDITAR ANALÍTICA POPUP (FIXED) ====== */}
      {editingEntryId && (
        <div
          className="fixed z-50 bg-white border border-slate-200 shadow-xl w-[180px]"
          style={{ top: editDropdownPos.top, left: editDropdownPos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            type="text"
            value={editSearch}
            onChange={e => setEditSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full border-b border-slate-200 text-[12px] px-3 py-2 focus:outline-none"
            autoFocus
          />
          <div className="max-h-[180px] overflow-y-auto">
            {filteredEditAnaliticas.map(a => (
              <button
                key={a}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  updateEntryAnalitica(editingEntryId, a);
                  setSelectedGroup(prev => ({
                    ...prev,
                    entries: prev.entries.map(ent =>
                      ent.id === editingEntryId ? { ...ent, analitica: a } : ent
                    )
                  }));
                  setEditingEntryId(null);
                  setEditSearch('');
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 transition-colors ${selectedGroup?.entries.find(e => e.id === editingEntryId)?.analitica === a
                  ? 'bg-slate-100 font-medium text-[#0e7490]'
                  : 'text-slate-700'
                  }`}
              >
                {a}
              </button>
            ))}
            {filteredEditAnaliticas.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-slate-400">Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
