import React from 'react';
import { useData } from '../../context/DataContext';
import { LogOut, User, Search, Settings, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { currentUser, logout } = useData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) return null;

  const roleLabel = {
    worker: 'Parte de Horas',
    manager: 'Parte de Horas - Encargado',
    hr: 'Parte de Horas - RRHH',
  };

  return (
    <nav className="bg-[#1e293b] sticky top-0 z-50 h-[48px] flex-shrink-0 select-none">
      <div className="flex justify-between h-full items-center px-5">

        {/* LEFT - Logo + Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/${currentUser.role}`)}>
          <div className="flex items-center gap-1.5">
            <div className="w-[18px] h-[18px] bg-white/20 rounded-[3px] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">≡</span>
            </div>
          </div>
          <span className="text-white/90 font-normal text-[14px] tracking-wide">
            {roleLabel[currentUser.role] || 'Parte de Horas'}
          </span>
        </div>

        {/* RIGHT - User + Actions */}
        <div className="flex items-center gap-5 text-[13px]">
          <Search size={16} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors" />
          <HelpCircle size={16} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors hidden sm:block" />
          <Settings size={16} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors hidden sm:block" />

          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-full bg-[#0e7490] flex items-center justify-center text-white text-[11px] font-bold uppercase">
              {currentUser.name?.charAt(0) || 'U'}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white/90 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
