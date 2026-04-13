import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Clock, CheckCircle, ImagePlus, Check, LogIn, LogOut, Search } from 'lucide-react';

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

  // Lista fija de analíticas del proyecto
  const ANALITICAS = [
    'MX0010000','MX0011000','MX0012000','MX0013000','MX0014000','MX0015000',
    'MX0016000','MX0017000','MX0020000','MX0031000','MX0032000','MX0057400',
    'MX0078800','MX0081400','MX0085600','MX0090100','MX0091600','MX0093100',
    'MX0094200','MX0096100','MX0096200','MX0096300','MX0097100','MX0097200',
    'MX0097300','MX0098400','MX00OYMPA','MX00REPEJ'
  ];

  // Combobox state
  const [comboSearch, setComboSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef(null);

  const filteredAnaliticas = ANALITICAS.filter(a =>
    a.toLowerCase().includes(comboSearch.toLowerCase())
  );

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setComboOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Solo entradas de la semana actual
  const currentWeekEntries = myEntries.filter(entry => getWeekRange(entry.date) === currentWeek);
  const weekHasDieta = currentWeekEntries.some(e => e.dieta === 1);

  const [locating, setLocating] = useState(false);

  // Obtener ubicación del dispositivo
  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null), // Si el usuario deniega, continuar sin ubicación
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleAction = async () => {
    if (!todayEntry) {
      if (!analitica.trim()) {
        alert("Por favor seleccione la Analítica del proyecto.");
        return;
      }
      setLocating(true);
      const coords = await getLocation();
      await clockIn(null, analitica, hasDieta ? 1 : 0, coords);
      setLocating(false);
    } else if (isWorking) {
      setLocating(true);
      const coords = await getLocation();
      await clockOut(todayEntry.id, null, coords);
      setLocating(false);
    }
  };

  const handleFileUpload = async (e, entryId) => {
    const file = e.target.files[0];
    if (file) {
      await uploadOT(entryId, file);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col mx-auto max-w-3xl w-full pb-12">

      {/* ====== RELOJ CENTRAL ====== */}
      <div className="flex flex-col items-center pt-6 pb-8">

        {/* Fecha */}
        <p className="text-[13px] text-slate-400 mb-2 capitalize">
          {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Reloj grande */}
        <div className="text-[64px] font-light text-slate-800 tabular-nums leading-none tracking-tight mb-1">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
        <span className="text-[28px] font-light text-slate-300 tabular-nums">
          :{String(currentTime.getSeconds()).padStart(2, '0')}
        </span>

        {/* Estado actual */}
        {todayEntry && isWorking && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-[#0e7490] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#0e7490] animate-pulse"></span>
            Turno activo desde {new Date(todayEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        {todayEntry && !isWorking && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
            <CheckCircle size={14} className="text-slate-400" />
            Jornada completada ({formatTime(todayEntry.clockIn)} – {formatTime(todayEntry.clockOut)})
          </div>
        )}

        {/* ====== CONTROLES ====== */}
        {!todayEntry ? (
          <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-xs">

            {/* Selector de analítica buscable */}
            <div className="w-full" ref={comboRef}>
              <label className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1 block">Analítica</label>
              <div className="relative">
                <div className="flex items-center border border-slate-200 bg-white focus-within:border-[#0e7490] transition-colors">
                  <Search size={14} className="text-slate-400 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={comboOpen ? comboSearch : analitica || comboSearch}
                    onChange={(e) => {
                      setComboSearch(e.target.value);
                      setAnalitica('');
                      setComboOpen(true);
                    }}
                    onFocus={() => setComboOpen(true)}
                    placeholder="Buscar analítica..."
                    className="w-full bg-transparent text-slate-800 text-[14px] px-2 py-2.5 focus:outline-none"
                  />
                  {analitica && (
                    <button
                      onClick={() => { setAnalitica(''); setComboSearch(''); }}
                      className="text-slate-400 hover:text-slate-600 pr-3 flex-shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
                {comboOpen && (
                  <div className="absolute z-20 mt-px w-full bg-white border border-slate-200 shadow-lg max-h-[200px] overflow-y-auto">
                    {filteredAnaliticas.length === 0 ? (
                      <div className="px-3 py-2 text-[13px] text-slate-400">Sin resultados</div>
                    ) : (
                      filteredAnaliticas.map(a => (
                        <button
                          key={a}
                          onClick={() => {
                            setAnalitica(a);
                            setComboSearch(a);
                            setComboOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${
                            analitica === a ? 'bg-slate-100 font-medium text-[#0e7490]' : 'text-slate-700'
                          }`}
                        >
                          {a}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dieta checkbox */}
            <div className="w-full flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="dieta"
                checked={hasDieta || weekHasDieta}
                disabled={weekHasDieta}
                onChange={(e) => setHasDieta(e.target.checked)}
                className="w-4 h-4 text-[#0e7490] border-slate-300 rounded-sm"
              />
              <label htmlFor="dieta" className={`text-[13px] select-none cursor-pointer ${weekHasDieta ? 'text-slate-400' : 'text-slate-600'}`}>
                {weekHasDieta ? 'Dieta semanal ya aplicada' : 'Aplicar dieta'}
              </label>
            </div>

            {/* Botón de entrada */}
            <button
              onClick={handleAction}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 bg-[#0e7490] hover:bg-[#0c5f73] disabled:bg-slate-400 text-white py-3.5 text-[15px] font-medium transition-colors mt-1"
            >
              {locating ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Obteniendo ubicación...</>
              ) : (
                <><LogIn size={18} /> Registrar Entrada</>
              )}
            </button>
          </div>
        ) : isWorking ? (
          <div className="mt-6 w-full max-w-xs">
            <button
              onClick={handleAction}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white py-3.5 text-[15px] font-medium transition-colors"
            >
              {locating ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Obteniendo ubicación...</>
              ) : (
                <><LogOut size={18} /> Registrar Salida</>
              )}
            </button>
          </div>
        ) : null}

      </div>

      {/* ====== SEPARADOR ====== */}
      <div className="border-t border-slate-200 mb-0"></div>

      {/* Lines tab - semana actual */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-0 text-[13px] mt-0">
        <span className="text-slate-800 font-semibold border-b-2 border-[#0e7490] pb-2 -mb-px">Líneas</span>
        <span className="text-slate-400 pb-2 -mb-px text-[12px]">Semana: {currentWeek}</span>
      </div>

      {/* Tabla de la semana */}
      <div className="overflow-x-auto">
        {currentWeekEntries.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-slate-400">
            No hay registros esta semana.
          </div>
        ) : (
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-3 py-2.5 font-medium border-r border-slate-100">Día / Fecha</th>
                <th className="px-3 py-2.5 font-medium border-r border-slate-100">Proyecto</th>
                <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Entrada</th>
                <th className="px-3 py-2.5 font-medium border-r border-slate-100 text-center">Salida</th>
                <th className="px-3 py-2.5 font-medium">Evidencia (OT)</th>
              </tr>
            </thead>
            <tbody>
              {currentWeekEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2 border-r border-slate-100">
                    <span className="text-slate-700 capitalize">
                      {new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 text-slate-500">
                    {entry.analitica && entry.analitica !== 'N/A' ? entry.analitica : '—'}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockIn)}</td>
                  <td className="px-3 py-2 border-r border-slate-100 text-center font-mono text-slate-500">{formatTime(entry.clockOut)}</td>
                  <td className="px-3 py-2">
                    {entry.otImage ? (
                      <div className="flex items-center gap-2">
                        <a href={entry.otImage} target="_blank" rel="noreferrer" className="text-[#0e7490] hover:underline text-[11px]">Ver OT</a>
                        <label className="text-[11px] text-slate-400 hover:text-[#0e7490] cursor-pointer transition-colors">
                          <ImagePlus size={11} className="inline mr-0.5" />Cambiar
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                        </label>
                      </div>
                    ) : (
                      <label className="text-[11px] text-slate-400 hover:text-[#0e7490] cursor-pointer flex items-center gap-1 transition-colors w-fit">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, entry.id)} />
                        <ImagePlus size={12} /> Subir OT
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default WorkerDashboard;
