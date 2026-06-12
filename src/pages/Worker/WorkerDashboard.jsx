import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Clock, 
  Search, 
  LogOut, 
  ChevronRight, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  ArrowRight,
  Loader2
} from 'lucide-react';
import logoRevergy from '../../assets/7-revergy_horizontal.png';
import { ANALITICAS, getCurrentWeekDisplayRange, getCurrentPosition } from '../../lib/utils';

const WorkerDashboard = () => {
  const { timeEntries, currentUser, logout, clockIn, clockOut } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAnalitica, setSelectedAnalitica] = useState('');
  const [tipoJornada, setTipoJornada] = useState('Jornada Activa');
  const [applyDieta, setApplyDieta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geoStatus, setGeoStatus] = useState(''); // '', 'loading', 'success', 'error'

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if there is an active shift (clockIn but no clockOut)
  const activeShift = timeEntries.find(e => e.workerId === currentUser?.id && !e.clockOut);

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return { hours, minutes, seconds };
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = date.toLocaleDateString('es-ES', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleShiftAction = async () => {
    setIsSubmitting(true);
    setGeoStatus('loading');
    
    // Obtener ubicación real del dispositivo
    const position = await getCurrentPosition();
    
    if (!position) {
      setGeoStatus('error');
      const confirmContinue = window.confirm(
        'No se pudo obtener tu ubicación GPS. ¿Deseas continuar sin geolocalización?\n\nAsegúrate de dar permiso de ubicación al navegador.'
      );
      if (!confirmContinue) {
        setIsSubmitting(false);
        setGeoStatus('');
        return;
      }
    } else {
      setGeoStatus('success');
    }

    const lat = position?.lat || null;
    const lng = position?.lng || null;

    if (activeShift) {
      await clockOut(activeShift.id, lat, lng);
    } else {
      if (!selectedAnalitica) {
        alert("Por favor selecciona una analítica antes de empezar.");
        setIsSubmitting(false);
        setGeoStatus('');
        return;
      }
      await clockIn(selectedAnalitica, tipoJornada, applyDieta, lat, lng);
    }
    
    setIsSubmitting(false);
    // Reset geo status after 3 seconds
    setTimeout(() => setGeoStatus(''), 3000);
  };

  const { hours, minutes, seconds } = formatTime(currentTime);

  const filteredAnaliticas = ANALITICAS.filter(a => 
    a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Rango de semana dinámico
  const weekDisplayRange = getCurrentWeekDisplayRange();

  return (
    <div className="max-w-md mx-auto bg-[#f8fbff] min-h-screen flex flex-col font-sans pb-10">
      
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100/50">
        <div className="flex items-center gap-2">
          <img src={logoRevergy} alt="Revergy" className="h-8 object-contain" />
        </div>
        <button 
          onClick={logout}
          className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 px-6 pt-2 space-y-6">
        
        {/* Clock Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-50 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-100 via-blue-400 to-blue-100 opacity-20"></div>
          <p className="text-[#64748b] text-[15px] font-medium mb-4">
            {formatDate(currentTime)}
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[64px] font-light text-[#1e293b] tracking-tighter leading-none">
              {hours}:{minutes}
            </span>
            <span className="text-[24px] font-light text-[#94a3b8] tracking-tighter">
              :{seconds}
            </span>
          </div>
        </div>

        {/* Project Selection */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.1em] px-1">
            Asignación de Proyecto
          </h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={18} className="text-[#0ea5e9]" />
            </div>
            <select
              value={selectedAnalitica}
              onChange={(e) => setSelectedAnalitica(e.target.value)}
              disabled={!!activeShift}
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm text-[15px] text-[#1e293b] focus:ring-2 focus:ring-[#0ea5e9]/20 outline-none appearance-none disabled:bg-slate-50 disabled:text-slate-400 transition-all mb-4"
            >
              <option value="">Selecciona o busca analítica</option>
              {ANALITICAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <h3 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.1em] px-1">
            Tipo de Jornada
          </h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Clock size={18} className="text-[#0ea5e9]" />
            </div>
            <select
              value={tipoJornada}
              onChange={(e) => setTipoJornada(e.target.value)}
              disabled={!!activeShift}
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm text-[15px] text-[#1e293b] focus:ring-2 focus:ring-[#0ea5e9]/20 outline-none appearance-none disabled:bg-slate-50 disabled:text-slate-400 transition-all"
            >
              <option value="Jornada Activa">Jornada Activa</option>
              <option value="Jornada Inactiva">Jornada Inactiva</option>
            </select>
          </div>
        </div>

        {/* Dieta Toggle */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between border border-transparent hover:border-blue-50 transition-all">
          <div>
            <h4 className="text-[15px] font-semibold text-[#1e293b]">Aplicar Dieta</h4>
            <p className="text-[12px] text-[#94a3b8]">Reclamar dieta por jornada</p>
          </div>
          <button 
            onClick={() => !activeShift && setApplyDieta(!applyDieta)}
            disabled={!!activeShift}
            className={`w-12 h-6 rounded-full transition-colors relative ${applyDieta ? 'bg-[#0ea5e9]' : 'bg-slate-200'} ${activeShift ? 'opacity-50' : ''}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${applyDieta ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {/* GPS Status Indicator */}
        {geoStatus && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
            geoStatus === 'loading' ? 'bg-blue-50 text-blue-600' :
            geoStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
            'bg-amber-50 text-amber-600'
          }`}>
            {geoStatus === 'loading' && <><Loader2 size={16} className="animate-spin" /> Obteniendo ubicación GPS...</>}
            {geoStatus === 'success' && <><MapPin size={16} /> Ubicación registrada correctamente</>}
            {geoStatus === 'error' && <><AlertCircle size={16} /> No se pudo obtener la ubicación</>}
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={handleShiftAction}
          disabled={isSubmitting}
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-[16px] tracking-wide shadow-lg transition-all transform active:scale-[0.98] ${
            activeShift 
              ? 'bg-[#ef4444] shadow-red-200' 
              : 'bg-[#0ea5e9] shadow-blue-200'
          } ${isSubmitting ? 'opacity-70' : ''}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Procesando...</span>
            </>
          ) : activeShift ? (
            <>
              <LogOut size={22} className="rotate-180" />
              <span>TERMINAR TURNO</span>
            </>
          ) : (
            <>
              <ArrowRight size={22} />
              <span>EMPEZAR TURNO</span>
            </>
          )}
        </button>

        {/* Weekly Shifts */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[15px] font-bold text-[#1e293b]">
              Turnos de la Semana
            </h3>
            <span className="text-[12px] font-medium text-[#0ea5e9] bg-blue-50 px-3 py-1 rounded-full">
              {weekDisplayRange}
            </span>
          </div>

          <div className="space-y-3">
            {timeEntries.filter(e => e.workerId === currentUser?.id).length > 0 ? (
              timeEntries
                .filter(e => e.workerId === currentUser?.id)
                .slice(0, 5)
                .map((entry) => (
                  <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.clockOut ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-[#1e293b]">
                          {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-[12px] text-[#94a3b8] flex items-center gap-1">
                          {new Date(entry.clockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          {entry.clockOut && ` - ${new Date(entry.clockOut).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                          {entry.clockInLat && (
                            <MapPin size={10} className="text-emerald-400 ml-1" title={`GPS: ${entry.clockInLat.toFixed(4)}, ${entry.clockInLng.toFixed(4)}`} />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-mono font-bold text-[#1e293b]">
                        {entry.analitica}
                      </div>
                      <div className={`text-[11px] font-bold uppercase ${
                        entry.status === 'approved' ? 'text-emerald-500' : 
                        entry.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {entry.status === 'approved' ? 'Aprobado' : 
                         entry.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="bg-white/50 rounded-3xl border-2 border-dashed border-slate-100 p-10 flex flex-col items-center justify-center text-center">
                <Clock size={40} className="text-slate-100 mb-3" />
                <p className="text-slate-300 text-[14px] font-medium">Sin actividad esta semana</p>
              </div>
            )}
          </div>
        </div>

      </main>

    </div>
  );
};

export default WorkerDashboard;
