import React from 'react';
import { useData } from '../../context/DataContext';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { currentUser, logout } = useData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <nav className="bg-[#f8f9fa] border-b border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sticky top-0 z-50 h-14 flex-shrink-0">
      <div className="flex justify-between h-full items-center px-4">
        
        {/* LOGO */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/${currentUser.role}`)}>
          <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <span className="font-bold text-[15px] text-slate-800 tracking-tight">
            Reporte de Horas (Beta)
          </span>
        </div>
        
        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <span className="hidden sm:inline-block truncate max-w-[150px]">
              {currentUser.name}
            </span>
          </div>

          <div className="w-px h-5 bg-slate-300"></div>

          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
