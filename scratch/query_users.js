import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkgjimqcimffcwircsdl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZ2ppbXFjaW1mZmN3aXJjc2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjg3MzgsImV4cCI6MjA4ODc0NDczOH0.WccFfXw46LM8SnUdvzoeNcfLCugCYi3Dj5xMMr1HT6Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Searching user JACG031117UN1...");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('rfc', 'JACG031117UN1')
    .maybeSingle();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("User details:", data);
  }
}

run();
