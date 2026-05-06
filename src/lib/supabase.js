import { createClient } from '@supabase/supabase-js'

// Leemos las variables usando import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación de seguridad para el desarrollador
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: No se cargaron las credenciales. Revisa tu archivo .env")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)