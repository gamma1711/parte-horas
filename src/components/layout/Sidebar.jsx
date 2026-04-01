import React from 'react';
import { useMockData } from '../../context/MockDataContext';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, FileText, CheckSquare, ClipboardList, Settings, Lock } from 'lucide-react';

const Sidebar = () => {
  const { currentUser } = useMockData();
  
  if (!currentUser) return null;

  // Link activo tiene un fondo gris oscuro y texto blanco (como "Panel Global" en la imagen)
  // Normal tiene fondo transparente y texto gris oscuro.
  const baseClass = "flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors w-full text-left";
  const activeClass = `${baseClass} bg-slate-600 text-white`;
  const inactiveClass = `${baseClass} text-slate-700 hover:bg-slate-200`;

  return (
    <aside className="w-64 bg-[#f8f9fa] border-r border-slate-200 h-[calc(100vh-56px)] flex flex-col flex-shrink-0 hidden md:flex font-sans">
      
      {/* Sección Gestión */}
      <div className="py-2">
        <div className="px-4 py-3 flex items-center gap-2 text-slate-600 font-semibold text-sm">
          <LayoutGrid size={16} /> Gestión
        </div>
        <nav className="flex flex-col">
          <NavLink 
            to={`/${currentUser.role}`} 
            end
            className={({isActive}) => isActive ? activeClass : inactiveClass}
          >
            Panel Global
          </NavLink>
          {currentUser.role === 'manager' && (
            <button className={inactiveClass}>
               Validar Entradas
            </button>
          )}
          {currentUser.role === 'hr' && (
            <button className={inactiveClass}>
               Nuevo Reporte
            </button>
          )}
        </nav>
      </div>

      <div className="h-px bg-slate-200 w-full my-1"></div>

      {/* Sección Mis Tareas */}
      <div className="py-2">
        <div className="px-4 py-3 flex items-center gap-2 text-slate-600 font-semibold text-sm">
          <Lock size={16} /> Mis Tareas
        </div>
        <nav className="flex flex-col gap-1">
          <button className={inactiveClass}>
            Acciones Pendientes
          </button>
          <button className={inactiveClass}>
            Seguimientos Asignados
          </button>
          <button className={inactiveClass}>
            Cierres Asignados
          </button>
        </nav>
      </div>

    </aside>
  );
};

export default Sidebar;
