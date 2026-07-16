import { useState } from 'react';
import { supabase } from '../lib/supabase'; //[cite: 2]

export default function Login({ setSession }) {
  const [email, setEmail] = useState(''); //[cite: 2]
  const [password, setPassword] = useState(''); //[cite: 2]
  const [loading, setLoading] = useState(false); //[cite: 2]
  const [errorMsg, setErrorMsg] = useState(null); //[cite: 2]

  const handleLogin = async (e) => {
    e.preventDefault(); //[cite: 2]
    setLoading(true); //[cite: 2]
    setErrorMsg(null); //[cite: 2]
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }); //[cite: 2]

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('El correo o la contraseña son incorrectos. Verifique e intente de nuevo.'); //[cite: 2]
      } else {
        setErrorMsg(error.message); //[cite: 2]
      }
    } else {
      setSession(data.session); //[cite: 2]
    }
    setLoading(false); //[cite: 2]
  };

  return (
    /* 🫐 1. Fondo de pantalla cambiado de bg-green-900 a tu azul océano exacto (#3B4E38) */
    <div className="min-h-screen flex items-center justify-center bg-[#3B4E38] p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          {/* 🫐 2. Título de la app cambiado a tu azul océano exacto (#3B4E38) */}
          <h2 className="text-3xl font-black text-[#3B4E38]">INVERNADERO FM</h2>
          <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mt-2">Acceso al Sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* 🚨 Alerta de error original intacta */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="text-left">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none">
                  Fallo de Seguridad
                </p>
                <p className="text-xs font-bold text-red-800 mt-1 uppercase leading-tight">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}

          {/* 🫐 3. Bordes al dar click (focus) cambiados de focus:border-green-500 a focus:border-[#3B4E38] */}
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="w-full border-2 p-3 rounded-xl outline-none focus:border-[#3B4E38] font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="w-full border-2 p-3 rounded-xl outline-none focus:border-[#3B4E38] font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* 🫐 4. Botón unificado a tu azul exacto (#3B4E38) con hover en un tono más oscuro (#0a4c68) */}
          <button 
            disabled={loading}
            className="w-full bg-[#3B4E38] text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-[#0a4c68] transition-all disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}