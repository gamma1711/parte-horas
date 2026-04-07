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
    <div className="p-10 font-sans">
      <h1 className="text-xl font-bold mb-4">Demo: Parte de Horas (Enlaces Internos)</h1>
      <p className="mb-6 text-sm text-gray-600">
        Selecciona la vista a la que deseas ingresar para la demostración:
      </p>

      <ul className="space-y-4 list-disc pl-5 text-blue-600 underline cursor-pointer">
        <li onClick={() => handleLogin('worker')}>
          Ir a Vista Web App Trabajador (Móvil)
        </li>
        <li onClick={() => handleLogin('manager')}>
          Ir a Panel de Encargado (Aprobaciones)
        </li>
        <li onClick={() => handleLogin('hr')}>
          Ir a Panel Consolidado RRHH (Métricas)
        </li>
      </ul>
    </div>
  );
};

export default Home;
