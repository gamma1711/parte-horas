import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const HOLIDAYS = ['01-01', '05-01', '12-25', '04-01', '04-02'];

const isHoliday = (dateString) => {
  const d = new Date(dateString);
  const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return HOLIDAYS.includes(monthDay);
};

export const DataProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: usersData, error: usersError } = await supabase.from('users').select('*');
    if (!usersError && usersData) {
      setUsers(usersData);
    } else {
      console.error("Error cargando usuarios:", usersError);
    }
    
    const { data: entriesData, error: entriesError } = await supabase
      .from('time_entries')
      .select(`*, users ( name )`)
      .order('date', { ascending: false });

    if (!entriesError && entriesData) {
      const formattedEntries = entriesData.map(e => ({
        id: e.id,
        workerId: e.worker_id,
        workerName: e.users?.name?.split(' (')[0] || 'Desconocido',
        date: e.date,
        clockIn: e.clock_in,
        clockOut: e.clock_out,
        status: e.status,
        comments: e.comments || '',
        otImage: e.ot_image_url,
        analitica: e.analitica || 'N/A',
        dieta: e.dieta || 0,
        isFestivo: e.is_festivo,
        clockInLat: e.clock_in_lat,
        clockInLng: e.clock_in_lng,
        clockOutLat: e.clock_out_lat,
        clockOutLng: e.clock_out_lng
      }));
      setTimeEntries(formattedEntries);
    } else {
      console.error("Error cargando time entries:", entriesError);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const login = (role) => {
    const user = users.find(u => u.role === role);
    setCurrentUser(user);
    if (!loading) fetchData(); 
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const clockIn = async (explicitDate, analitica = 'N/A', dieta = 0, coords = null) => {
    if (!currentUser) return;
    const now = explicitDate ? new Date(explicitDate) : new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const newEntry = {
      worker_id: currentUser.id,
      date: dateStr,
      clock_in: now.toISOString(),
      status: 'pending',
      analitica,
      dieta,
      is_festivo: isHoliday(dateStr),
      clock_in_lat: coords?.lat || null,
      clock_in_lng: coords?.lng || null
    };
    
    const { data, error } = await supabase.from('time_entries').insert([newEntry]).select('*, users(name)').single();
    if (error) {
      console.error("Error en clockIn:", error);
      alert("Error al registrar entrada: " + error.message);
    } else if (data) {
        const formatted = {
          id: data.id,
          workerId: data.worker_id,
          workerName: data.users?.name?.split(' (')[0] || currentUser.name.split(' (')[0],
          date: data.date,
          clockIn: data.clock_in,
          clockOut: data.clock_out,
          status: data.status,
          comments: data.comments || '',
          otImage: data.ot_image_url,
          analitica: data.analitica || 'N/A',
          dieta: data.dieta || 0,
          isFestivo: data.is_festivo,
          clockInLat: data.clock_in_lat,
          clockInLng: data.clock_in_lng,
          clockOutLat: data.clock_out_lat,
          clockOutLng: data.clock_out_lng
        };
        setTimeEntries([formatted, ...timeEntries]);
    }
  };

  const clockOut = async (entryId, explicitDate, coords = null) => {
    const now = explicitDate ? new Date(explicitDate) : new Date();
    
    const updateData = {
      clock_out: now.toISOString(),
      clock_out_lat: coords?.lat || null,
      clock_out_lng: coords?.lng || null
    };
    
    const { data, error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', entryId)
        .select()
        .single();
        
    if (error) {
       console.error("Error en clockOut:", error);
       alert("Error al registrar salida: " + error.message);
    } else if (data) {
       setTimeEntries(entries => 
         entries.map(entry => 
           entry.id === entryId ? { ...entry, clockOut: data.clock_out, clockOutLat: data.clock_out_lat, clockOutLng: data.clock_out_lng } : entry
         )
       );
    }
  };

  const updateEntryStatus = async (entryId, newStatus, comments = '') => {
      const { error } = await supabase
          .from('time_entries')
          .update({ status: newStatus, comments: comments })
          .eq('id', entryId);
      
      if (!error) {
         setTimeEntries(entries =>
           entries.map(entry =>
             entry.id === entryId ? { ...entry, status: newStatus, comments: comments } : entry
           )
         );
      }
  };

  const uploadOT = async (entryId, fileObj) => {
    if (!fileObj || !(fileObj instanceof File)) {
       console.error("Para Supabase se requiere el objeto File real.");
       return;
    }
    
    const fileExt = fileObj.name.split('.').pop() || 'jpg';
    const fileName = `${entryId}_${Date.now()}.${fileExt}`;
    
    // Subir a bucket "ot_images"
    const { error: uploadError } = await supabase.storage.from('ot_images').upload(fileName, fileObj, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (uploadError) {
      console.error("Error subiendo OT al bucket:", uploadError);
      alert("Error subiendo imagen. Verifica que el bucket 'ot_images' exista en Supabase y sea público.");
      return;
    }
    
    const { data: publicURLData } = supabase.storage.from('ot_images').getPublicUrl(fileName);
    const imageUrl = publicURLData.publicUrl;
    
    // Actualizar registro
    const { error: dbError } = await supabase.from('time_entries').update({ ot_image_url: imageUrl }).eq('id', entryId);
    
    if (!dbError) {
       setTimeEntries(entries =>
         entries.map(entry =>
           entry.id === entryId ? { ...entry, otImage: imageUrl } : entry
         )
       );
    } else {
        console.error("Error actualizando url en db:", dbError);
    }
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
          alert("No se pudo revisar la semana en la BD: " + error.message);
      }
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
      alert("Error al actualizar analítica: " + error.message);
    }
  };

  return (
    <DataContext.Provider
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
        uploadOT,
        updateEntryAnalitica,
        loading
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
