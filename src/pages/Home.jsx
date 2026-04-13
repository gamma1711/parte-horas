import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Home = () => {
  const { login, currentUser, users } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate(`/${currentUser.role}`);
    }
  }, [currentUser, navigate]);

  const handleLogin = (role) => {
    login(role);
    navigate(`/${role}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar mimicking BC */}
      <div className="bg-[#1e293b] h-[48px] flex items-center px-5">
        <span className="text-white/90 font-normal text-[14px] tracking-wide">Parte de Horas</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-start max-w-xl mx-auto w-full px-6 py-16">
        <h1 className="text-[28px] font-normal text-slate-800 mb-2">
          Parte de Horas
        </h1>
        <p className="text-[14px] text-slate-500 mb-8">
          Selecciona la vista a la que deseas ingresar para la demostración.
        </p>

        <div className="w-full space-y-0 text-[14px]">
          <div
            className="flex items-baseline py-3 cursor-pointer group"
            onClick={() => handleLogin('worker')}
          >
            <span className="text-[#0e7490] group-hover:text-[#0c5f73] transition-colors min-w-[240px]">Vista Trabajador (Móvil)</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mx-3"></span>
            <span className="text-slate-400 text-[12px]">worker</span>
          </div>
          <div
            className="flex items-baseline py-3 cursor-pointer group"
            onClick={() => handleLogin('manager')}
          >
            <span className="text-[#0e7490] group-hover:text-[#0c5f73] transition-colors min-w-[240px]">Panel de Encargado (Aprobaciones)</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mx-3"></span>
            <span className="text-slate-400 text-[12px]">manager</span>
          </div>
          <div
            className="flex items-baseline py-3 cursor-pointer group"
            onClick={() => handleLogin('hr')}
          >
            <span className="text-[#0e7490] group-hover:text-[#0c5f73] transition-colors min-w-[240px]">Panel Consolidado RRHH (Nóminas)</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mx-3"></span>
            <span className="text-slate-400 text-[12px]">hr</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;