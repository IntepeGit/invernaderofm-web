import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ setSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // 🌟 NUEVO: Estado para capturar el error visual

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null); // Limpia errores anteriores al intentar entrar de nuevo
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 🌟 Traduce el error nativo de Supabase a un mensaje amigable en español
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('El correo o la contraseña son incorrectos. Verifique e intente de nuevo.');
      } else {
        setErrorMsg(error.message);
      }
    } else {
      setSession(data.session);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-900 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-green-900">INVERNADERO FM</h2>
          <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mt-2">Acceso al Sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* 🚨 NUEVO: Alerta llamativa de alto impacto visual para el operario */}
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

          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="w-full border-2 p-3 rounded-xl outline-none focus:border-green-500 font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="w-full border-2 p-3 rounded-xl outline-none focus:border-green-500 font-medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            disabled={loading}
            className="w-full bg-green-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}