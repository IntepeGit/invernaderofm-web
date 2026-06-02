import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';

export default function Dashboard({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos, balancesGrafica }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');
  
  // Estados para capturar la cosecha y la nómina desde la base de datos
  const [historicoCosecha, setHistoricoCosecha] = useState([]);
  const [historicoNomina, setHistoricoNomina] = useState([]);

  useEffect(() => {
    cargarDatosExtraDashboard();
  }, []);

  const cargarDatosExtraDashboard = async () => {
    try {
      const [resCosecha, resNomina] = await Promise.all([
        supabase.from('produccion_cosecha').select('*, invernaderos(nombre)'),
        supabase.from('nomina_jornales').select('*, nomina_trabajadores(nombre_completo), invernaderos(nombre)')
      ]);
      setHistoricoCosecha(resCosecha.data || []);
      setHistoricoNomina(resNomina.data || []);
    } catch (err) {
      console.error("Error cargando históricos en Dashboard:", err);
    }
  };

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // --- 🧮 LÓGICA DE SUMATORIAS GLOBALES CON NÓMINA INTEGRADA ---
  const ingresosGlobales = datosDespachos?.reduce((acc, d) => acc + (d.total_venta || 0), 0) || 0;
  const gastosInsumosGlobales = datosEgresos?.reduce((acc, e) => acc + (e.monto || 0), 0) || 0;
  const gastosNominaGlobales = historicoNomina?.reduce((acc, n) => acc + (parseFloat(n.valor_pagar) || 0), 0) || 0;
  
  const gastosTotalesConNomina = gastosInsumosGlobales + gastosNominaGlobales;
  const utilidadRealGlobal = ingresosGlobales - gastosTotalesConNomina;

  // --- 🚜 MATEMÁTICA POR INVERNADERO PARA LOS GRÁFICOS ---
  const datosGraficoProduccion = listaInvernaderos.map(inv => {
    const cosechasLote = historicoCosecha.filter(c => c.invernadero_id === inv.id);
    const canastillas = cosechasLote.filter(c => c.unidad_medida === 'CANASTILLA').reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);
    const bultos = cosechasLote.filter(c => c.unidad_medida === 'BULTO').reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);
    return { name: inv.nombre?.toUpperCase(), Canastillas: canastillas, Bultos: bultos };
  });

  const datosGraficoNomina = listaInvernaderos.map(inv => {
    const costoNominaLote = historicoNomina.filter(n => n.invernadero_id === inv.id).reduce((acc, n) => acc + (parseFloat(n.valor_pagar) || 0), 0);
    return { name: inv.nombre?.toUpperCase(), Costo_Mano_Obra: costoNominaLote };
  });

  // --- 🔍 LÓGICA DE FILTRADO SECCIÓN EXPLORADOR ---
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  const nominaInv = historicoNomina?.filter(n => n.invernadero_id?.toString() === invSeleccionado) || [];
  
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosInv = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString())) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. KPIs GLOBALES SUPERIORES CON NÓMINA INTEGRADA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-blue-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Ingresos Totales</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(ingresosGlobales)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-red-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Gastos Totales (Con Mano Obra)</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(gastosTotalesConNomina)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-green-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Utilidad Neta Real</p>
          <p className="text-2xl font-black text-green-600">{formatoPesos(utilidadRealGlobal)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl shadow-lg">
          <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Eficiencia Financiera</p>
          <p className="text-3xl font-black text-white">
            {ingresosGlobales > 0 ? ((utilidadRealGlobal / ingresosGlobales) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* 2. GRÁFICO PRINCIPAL HISTÓRICO COMERCIAL */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter mb-6">Balance Financiero por Invernadero</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={balancesGrafica}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="Ingresos" fill="#3b82f6" radius={[10, 10, 0, 0]} name="Ventas" />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[10, 10, 0, 0]} name="Insumos/Gastos" />
              <Bar dataKey="Utilidad" fill="#10b981" radius={[10, 10, 0, 0]} name="Margen Comercial" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. NUEVA SECCIÓN DE INTELIGENCIA TÉCNICA Y RENDIMIENTO AGRO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO DE PRODUCCIÓN TOTAL EN BODEGA */}
        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-800 text-sm uppercase italic mb-4">🚜 Volumen Cosechado por Lote</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficoProduccion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '15px' }} />
                <Legend iconType="square" />
                <Bar dataKey="Canastillas" fill="#15803d" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Bultos" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE COSTO DE MANO DE OBRA */}
        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-800 text-sm uppercase italic mb-4">👥 Inversión en Mano de Obra por Lote</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficoNomina}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '15px' }} formatter={(v) => formatoPesos(v)} />
                <Bar dataKey="Costo_Mano_Obra" fill="#6b21a8" radius={[6, 6, 0, 0]} name="Costo Jornales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. TARJETAS DE BALANCES INDIVIDUALES CON MANO DE OBRA INTEGRADA POR LOTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {balancesGrafica.map((inv, idx) => {
          const objetoInvReal = listaInvernaderos.find(i => i.nombre?.toUpperCase() === inv.name?.toUpperCase());
          const nominaEsteLote = objetoInvReal 
            ? historicoNomina.filter(n => n.invernadero_id === objetoInvReal.id).reduce((acc, n) => acc + (parseFloat(n.valor_pagar) || 0), 0)
            : 0;

          const gastosTotalesLote = inv.Gastos + nominaEsteLote;
          const utilidadRealLote = inv.Ingresos - gastosTotalesLote;

          return (
            <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4 border-b pb-2 italic">{inv.name}</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Ventas Brutas</p>
                    <p className="text-lg font-black text-slate-800">{formatoPesos(inv.Ingresos)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[9px] font-black text-amber-700 uppercase italic">Cartera Pendiente (Clientes)</p>
                    <p className={`text-xl font-black ${inv.Cartera > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {formatoPesos(inv.Cartera)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4 mt-4 border-t border-slate-100 text-[10px]">
                <span className="text-red-500 font-bold">Gastos Reales: {formatoPesos(gastosTotalesLote)}</span>
                <span className={`font-black ${utilidadRealLote >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Util: {formatoPesos(utilidadRealLote)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. SECCIÓN DE EXPLORADOR CON DETALLE DE MANO DE OBRA INTEGRADO */}
      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 uppercase italic">Explorador de Detalles</h3>
          <select 
            value={invSeleccionado} 
            onChange={(e) => setInvSeleccionado(e.target.value)}
            className="p-3 rounded-2xl border-2 border-blue-200 font-bold text-sm outline-none focus:border-blue-500 transition-all bg-white"
          >
            <option value="">Seleccione Invernadero...</option>
            {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>

        {invSeleccionado ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tabla Ventas */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-blue-600 p-4 text-white font-black text-xs uppercase tracking-widest">Remisiones</div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <tbody className="divide-y">
                    {despachosInv.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold uppercase">#{d.numero_remision}</td>
                        <td className="p-3 text-right font-black text-blue-700">{formatoPesos(d.total_venta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Abonos */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-amber-500 p-4 text-white font-black text-xs uppercase tracking-widest">Pagos Received</div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <tbody className="divide-y">
                    {pagosInv.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold uppercase">#{p.ventas?.numero_remision}</td>
                        <td className="p-3 text-right font-black text-amber-600">{formatoPesos(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Gastos Insumos */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-red-500 p-4 text-white font-black text-xs uppercase tracking-widest">Gastos Insumos</div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <tbody className="divide-y">
                    {gastosInv.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold uppercase">{g.descripcion}</td>
                        <td className="p-3 text-right font-black text-red-600">{formatoPesos(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla Mano de Obra */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-purple-800 p-4 text-white font-black text-xs uppercase tracking-widest">Mano de Obra</div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <tbody className="divide-y">
                    {nominaInv.map(n => (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="p-3 uppercase">
                          <span className="font-black block text-slate-800">{n.nomina_trabajadores?.nombre_completo}</span>
                          <span className="text-[9px] text-purple-600 font-bold">{n.tipo_labor}</span>
                        </td>
                        <td className="p-3 text-right font-black text-purple-800 whitespace-nowrap">{formatoPesos(n.valor_pagar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase italic text-sm tracking-widest">Seleccione un invernadero para ver el detalle</p>
          </div>
        )}
      </div>

      {/* 5. 🎯 AJUSTADO: TARJETA DE BALANCE DE OPERACIÓN NETO CONSOLIDADO (CON NÓMINA RESTADA) */}
      <div className={`p-8 rounded-[40px] shadow-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${utilidadRealGlobal >= 0 ? 'bg-gradient-to-br from-green-800 to-emerald-950 border-green-600 text-white' : 'bg-gradient-to-br from-red-900 to-rose-950 border-red-600 text-white'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-4 rounded-2xl text-2xl backdrop-blur-sm shadow-inner">
            {utilidadRealGlobal >= 0 ? '💰' : '⚠️'}
          </div>
          <div>
            <h4 className="font-black uppercase italic text-sm tracking-wide">Balance de Operación Real Consolidado</h4>
            <p className="text-[10px] font-bold text-slate-300 uppercase italic mt-0.5">Ventas Netas de la granja restando Insumos y Mano de Obra</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black tracking-tighter drop-shadow-md">
            {formatoPesos(utilidadRealGlobal)}
          </p>
        </div>
      </div>

    </div>
  );
}