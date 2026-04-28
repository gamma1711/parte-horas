import { supabase } from './src/lib/supabase.js';

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Users in DB:");
        data.forEach(u => console.log(`- ${u.name} (${u.role})`));
    }
}

checkUsers();
