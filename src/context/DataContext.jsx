import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const getRoleFromEmail = (email) => {
  if (!email) return 'worker';
  const cleanEmail = email.trim().toLowerCase();
  
  const hrEmails = (import.meta.env.VITE_HR_EMAILS || '').toLowerCase().split(',').map(e => e.trim());
  const hsqeEmails = (import.meta.env.VITE_HSQE_EMAILS || '').toLowerCase().split(',').map(e => e.trim());
  const managerEmails = (import.meta.env.VITE_MANAGER_EMAILS || '').toLowerCase().split(',').map(e => e.trim());
  
  if (hrEmails.includes(cleanEmail)) return 'rrhh';
  if (hsqeEmails.includes(cleanEmail)) return 'hsqe';
  if (managerEmails.includes(cleanEmail)) return 'manager';
  return 'worker';
};

const normalizeUserProfile = (profile) => {
  if (!profile) return null;
  const email = profile.email_empresa || profile.email_personal || '';
  const derivedRole = getRoleFromEmail(email);
  return {
    id: profile.id,
    name: profile.nombre,
    role: derivedRole,
    area: profile.departamento,
    email: email,
    rfc: profile.rfc,
    estatus: profile.estatus
  };
};

export const DataProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      let mappedUsers = [];
      if (!usersError && usersData) {
        mappedUsers = usersData.map(normalizeUserProfile);
        setUsers(mappedUsers);
      } else if (usersError) {
        console.error("Error cargando usuarios:", usersError);
      }
      
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`*`)
        .order('date', { ascending: false });

      if (!entriesError && entriesData) {
        const formattedEntries = entriesData.map(e => {
          const user = mappedUsers.find(u => u.id === e.worker_id) || {};
          return {
            id: e.id,
            workerId: e.worker_id,
            workerName: user.name || 'Desconocido',
            workerArea: user.area || 'N/A',
            date: e.date,
            clockIn: e.clock_in,
            clockOut: e.clock_out,
            status: e.status,
            comments: e.comments || '',
            otImage: e.ot_image_url,
            analitica: e.analitica || 'N/A',
            tipoJornada: e.tipo_jornada || 'Jornada Activa',
            dieta: e.dieta || 0,
            isFestivo: e.is_festivo,
            clockInLat: e.clock_in_lat,
            clockInLng: e.clock_in_lng,
            clockOutLat: e.clock_out_lat,
            clockOutLng: e.clock_out_lng
          };
        });
        setTimeEntries(formattedEntries);
      } else if (entriesError) {
        console.error("Error cargando time entries:", entriesError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Persistencia de sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        getUserProfile(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getUserProfile(session.user.email);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserProfile = async (email) => {
    // Buscar en email_empresa primero
    let { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_empresa', email)
      .maybeSingle();

    // Si no se encuentra, buscar en email_personal
    if (!profile) {
      const { data: personalProfile, error: personalError } = await supabase
        .from('users')
        .select('*')
        .eq('email_personal', email)
        .maybeSingle();

      if (personalProfile) {
        profile = personalProfile;
        error = null;
      }
    }

    if (!error && profile) {
      setCurrentUser(normalizeUserProfile(profile));
    }
  };

  const login = async (rawRfc, password) => {
    const rfc = rawRfc.trim().toUpperCase();
    console.log("Iniciando proceso de login para RFC:", rfc);
    
    try {
      // 1. Buscar el correo asociado al RFC en la tabla 'users' (caso-insensible)
      const { data: userProfile, error: searchError } = await supabase
        .from('users')
        .select('email_empresa, email_personal, rfc')
        .ilike('rfc', rfc)
        .maybeSingle();

      console.log("Resultado de búsqueda de RFC:", { userProfile, searchError });

      if (searchError || !userProfile) {
        throw new Error("No se encontró ningún usuario con ese RFC.");
      }

      const email = userProfile.email_empresa || userProfile.email_personal;
      if (!email) {
        throw new Error("El usuario no tiene un correo electrónico registrado.");
      }
      console.log("Correo encontrado:", email, ". Intentando login en Supabase...");

      // 2. Intentar login con el correo encontrado
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // 3. Volver a buscar el perfil completo por el RFC verificado (ahora ya autenticado)
        const { data: fullProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .ilike('rfc', rfc)
          .single();

        if (profileError) throw profileError;

        setCurrentUser(normalizeUserProfile(fullProfile));
        return { success: true };
      }
    } catch (err) {
      console.error("Error en login:", err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const approveWeek = async (entryIdsToApprove, status, comments = '') => {
    const { error } = await supabase
      .from('time_entries')
      .update({ status, comments })
      .in('id', entryIdsToApprove);
        
    if (!error) {
      setTimeEntries(entries =>
        entries.map(entry =>
          entryIdsToApprove.includes(entry.id)
            ? { ...entry, status, comments }
            : entry
        )
      );
    } else {
      console.error("Error en approveWeek:", error);
    }
  };

  const clockIn = async (analitica, tipoJornada, dieta, lat, lng) => {
    const newEntry = {
      worker_id: currentUser.id,
      date: new Date().toISOString().split('T')[0],
      clock_in: new Date().toISOString(),
      status: 'pending',
      analitica,
      tipo_jornada: tipoJornada,
      dieta: dieta ? 1 : 0,
      clock_in_lat: lat,
      clock_in_lng: lng
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert([newEntry])
      .select()
      .single();

    if (!error && data) {
      const formatted = {
        id: data.id,
        workerId: data.worker_id,
        workerName: currentUser.name,
        workerArea: currentUser.area,
        date: data.date,
        clockIn: data.clock_in,
        clockOut: data.clock_out,
        status: data.status,
        comments: data.comments || '',
        analitica: data.analitica,
        dieta: data.dieta,
        clockInLat: data.clock_in_lat,
        clockInLng: data.clock_in_lng
      };
      setTimeEntries(prev => [formatted, ...prev]);
      return { success: true, entry: formatted };
    }
    return { success: false, error: error?.message };
  };

  const clockOut = async (entryId, lat, lng) => {
    const clockOutTime = new Date().toISOString();
    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_out: clockOutTime,
        clock_out_lat: lat,
        clock_out_lng: lng
      })
      .eq('id', entryId);

    if (!error) {
      setTimeEntries(prev =>
        prev.map(e => e.id === entryId ? { ...e, clockOut: clockOutTime, clockOutLat: lat, clockOutLng: lng } : e)
      );
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const updateEntryAnalitica = async (entryId, newAnalitica) => {
    const { error } = await supabase
      .from('time_entries')
      .update({ analitica: newAnalitica })
      .eq('id', entryId);

    if (!error) {
      setTimeEntries(entries =>
        entries.map(entry =>
          entry.id === entryId ? { ...entry, analitica: newAnalitica } : entry
        )
      );
    } else {
      console.error("Error actualizando analítica:", error);
    }
  };

  const filteredTimeEntries = React.useMemo(() => {
    if (!currentUser) return [];
    
    const role = currentUser.role.toLowerCase();
    
    // RRHH ve todo
    if (role === 'rrhh') return timeEntries;
    
    // Managers ven su área (comparación case-insensitive)
    if (role.includes('manager') || role === 'hsqe') {
      const managerArea = (currentUser.area || '').toLowerCase().trim();
      return timeEntries.filter(e => {
        const workerArea = (e.workerArea || '').toLowerCase().trim();
        return workerArea === managerArea;
      });
    }
    
    // Todos los demás (Trabajadores, IT, etc.) ven sus propios registros
    return timeEntries.filter(e => e.workerId === currentUser.id);
  }, [timeEntries, currentUser]);

  return (
    <DataContext.Provider
      value={{
        currentUser,
        users,
        timeEntries: filteredTimeEntries,
        allTimeEntries: timeEntries,
        login,
        logout,
        approveWeek,
        updateEntryAnalitica,
        clockIn,
        clockOut,
        loading
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
