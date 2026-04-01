import React, { createContext, useContext, useState, useEffect } from 'react';

const MockDataContext = createContext();

export const useMockData = () => useContext(MockDataContext);

// Días festivos estáticos para la demo (Formato MM-DD)
const HOLIDAYS = ['01-01', '05-01', '12-25', '04-01', '04-02']; // Incluimos hoy y mañana para la demo

const isHoliday = (dateString) => {
  const d = new Date(dateString);
  const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return HOLIDAYS.includes(monthDay);
};

// Datos iniciales de prueba
const initialUsers = [
  { id: '1', name: 'Juan Pérez (Trabajador)', role: 'worker' },
  { id: '4', name: 'María García (Trabajador)', role: 'worker' },
  { id: '5', name: 'Luis Hernández (Trabajador)', role: 'worker' },
  { id: '6', name: 'Sofía Rodríguez (Trabajador)', role: 'worker' },
  { id: '2', name: 'Ana Gómez (Encargada)', role: 'manager' },
  { id: '3', name: 'Carlos López (RRHH)', role: 'hr' },
];

// Generar historial falso
const generateInitialEntries = () => {
  const entries = [];
  const today = new Date();
  
  const workers = initialUsers.filter(u => u.role === 'worker');

  workers.forEach((worker, wIndex) => {
    // Generar historial de 14 días para cada trabajador
    for (let i = 0; i <= 14; i++) {
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - i);
        
        // Domingos
        const isSunday = entryDate.getDay() === 0;
        if (isSunday && Math.random() > 0.3) continue; 
        
        // Hora de entrada variable: entre 7:00 am y 8:30 am
        entryDate.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0, 0); 
        
        const outDate = new Date(entryDate);
        
        // Las horas extras son frecuentes (20% de probabilidad de salir muy tarde)
        const isExtra = Math.random() > 0.7;
        const outHour = isExtra ? 19 + Math.floor(Math.random() * 3) : 16 + Math.floor(Math.random() * 2);
        outDate.setHours(outHour, Math.floor(Math.random() * 59), 0, 0);

        // Mocks variados de status
        let status = 'approved';
        if (i < 5) {
             if (worker.id === '1' || worker.id === '4') {
                status = 'approved';
             } else {
                status = 'pending';
             }
        } else {
             status = Math.random() > 0.95 ? 'rejected' : 'approved'; 
        }

        const proyectos = ['PRJ-24-OXR', 'PRJ-24-SUR', 'PRJ-NOR-102'];
        const p = proyectos[wIndex % proyectos.length];

        const dateStr = entryDate.toISOString().split('T')[0];

        entries.push({
          id: `entry_${worker.id}_${i}`,
          workerId: worker.id,
          workerName: worker.name.split(' (')[0],
          date: dateStr,
          clockIn: entryDate.toISOString(),
          clockOut: outDate.toISOString(),
          status: status, 
          comments: status === 'rejected' ? 'Favor de adjuntar la evidencia correcta en OT.' : '',
          otImage: null, 
          analitica: isExtra ? 'PRJ-EXT-URG' : p,
          dieta: Math.random() > 0.3 ? 1 : 0,
          isFestivo: isHoliday(dateStr)
        });
    }
  });

  return entries.sort((a,b) => new Date(b.date) - new Date(a.date));
};

export const MockDataProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users] = useState(initialUsers);
  const [timeEntries, setTimeEntries] = useState(generateInitialEntries());

  const clockIn = (explicitDate, analitica = 'N/A', dieta = 0) => {
    if (!currentUser) return;
    const now = explicitDate ? new Date(explicitDate) : new Date();
    const dateStr = now.toISOString().split('T')[0];
    const newEntry = {
      id: `entry_${Date.now()}`,
      workerId: currentUser.id,
      workerName: currentUser.name.split(' (')[0],
      date: dateStr,
      clockIn: now.toISOString(),
      clockOut: null,
      status: 'pending',
      comments: '',
      otImage: null,
      analitica,
      dieta,
      isFestivo: isHoliday(dateStr)
    };
    setTimeEntries([newEntry, ...timeEntries]);
  };

  const clockOut = (entryId, explicitDate) => {
    const now = explicitDate ? new Date(explicitDate) : new Date();
    setTimeEntries(entries => 
      entries.map(entry => 
        entry.id === entryId 
          ? { ...entry, clockOut: now.toISOString() } 
          : entry
      )
    );
  };

  const updateEntryStatus = (entryId, newStatus, comments = '') => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? { ...entry, status: newStatus, comments: comments }
          : entry
      )
    );
  };

  const uploadOT = (entryId, imageURL) => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? { ...entry, otImage: imageURL }
          : entry
      )
    );
  };

  const approveWeek = (entryIdsToApprove, status, comments = '') => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entryIdsToApprove.includes(entry.id)
          ? { ...entry, status, comments }
          : entry
      )
    );
  };

  const login = (role) => {
    const user = users.find(u => u.role === role);
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <MockDataContext.Provider
      value={{
        currentUser,
        users,
        timeEntries,
        login,
        logout,
        clockIn,
        clockOut,
        updateEntryStatus,
        approveWeek,
        uploadOT
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
};
