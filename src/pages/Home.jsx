import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

import logoRevergy from '../assets/7-revergy_horizontal.png';

const Home = () => {
  const { login, currentUser } = useData();
  const navigate = useNavigate();

  const [rfc, setRfc] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const role = currentUser.role.toLowerCase();
      if (role.includes('manager') || role === 'hsqe') navigate('/manager');
      else if (role === 'rrhh') navigate('/hr');
      else navigate('/worker');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!rfc || !password) {
      setError('Por favor completa todos los campos.');
      setIsSubmitting(false);
      return;
    }

    const result = await login(rfc, password);
    if (!result.success) {
      setError(result.error || 'Credenciales inválidas. Verifica tu RFC e intenta de nuevo.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-center items-center p-4 font-sans antialiased">
      
      <div className="w-full max-w-[400px]">
        
        {/* Logo container */}
        <div className="flex justify-center mb-10">
          <img src={logoRevergy} alt="Revergy Group" className="h-10 object-contain" />
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          
          <div className="px-8 pt-8 pb-4">
            <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Iniciar sesión</h1>
            <p className="text-[13px] text-slate-500 mt-1">Ingresa tus credenciales para acceder al sistema.</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">RFC</label>
                <input
                  type="text"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  placeholder="Ej. ABCD123456"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded text-[14px] text-slate-900 focus:border-[#5b7a9d] focus:ring-1 focus:ring-[#5b7a9d]/20 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Contraseña</label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded text-[14px] text-slate-900 focus:border-[#5b7a9d] focus:ring-1 focus:ring-[#5b7a9d]/20 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[13px] flex items-start gap-2">
                  <span className="font-bold">Error:</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 bg-[#1e293b] hover:bg-[#334155] text-white font-semibold rounded text-[14px] transition-colors shadow-sm ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Autenticando...' : 'Acceder'}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center">
            <a href="#" className="text-[12px] text-[#5b7a9d] hover:underline">Soporte técnico</a>
            <span className="text-[11px] text-slate-400">v2.4.0</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-slate-400 font-medium">
            &copy; 2026 Revergy Group S.A. de C.V.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;