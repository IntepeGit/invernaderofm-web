import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos, balancesGrafica }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // --- LÓGICA DE FILTRADO PARA DETALLES ---
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosInv = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString())) || [];

  // --- CÁLCULOS GLOBALES (KPIs) ---
  const totalVentasGlobal = datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0);
  const totalGastosGlobal = datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0);
  const utilidadGlobal = totalVentasGlobal - totalGastosGlobal;
  const margenGlobal = totalVentasGlobal > 0 ? ((utilidadGlobal / totalVentasGlobal) * 100).toFixed(1) : 0;
  const carteraTotal = totalVentasGlobal - datosPagos.reduce((acc, p) => acc + (p.monto || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. SECCIÓN DE KPIs GLOBALES (Resumen de toda la operación) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-blue-500 transition-transform hover:scale-105">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ventas Totales</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(totalVentasGlobal)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-red-500 transition-transform hover:scale-105">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Gastos Totales</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(totalGastosGlobal)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-green-500 transition-transform hover:scale-105">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Utilidad Neta</p>
          <p className="text-2xl font-black text-green-600">{formatoPesos(utilidadGlobal)}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-3xl shadow-lg transition-transform hover:scale-105">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Eficiencia Real</p>
          <p className="text-3xl font-black text-white">{margenGlobal}%</p>
        </div>
      </div>

      {/* 2. GRÁFICO DE BALANCE POR INVERNADERO */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter">Balance Consolidado</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comparativa por Invernadero</p>
          </div>
          <div className="flex gap-4 bg-slate-50 p-3 rounded-2xl">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Ingresos</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Gastos</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Utilidad</span></div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={balancesGrafica} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `$${value/1000000}M`} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }} 
              />
              <Bar dataKey="Ingresos" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={35} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={35} />
              <Bar dataKey="Utilidad" fill="#10b981" radius={[8, 8, 0, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. CARTERA PENDIENTE GLOBAL */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-4 rounded-2xl text-2xl">💰</div>
          <div>
            <h4 className="font-black text-slate-800 uppercase italic text-sm">Cartera Total Pendiente</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Dinero por recaudar de despachos realizados</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-amber-600 tracking-tighter">{formatoPesos(carteraTotal)}</p>
        </div>
      </div>

      {/* 4. SECCIÓN DE ANÁLISIS DETALLADO (Selector e Invernadero) */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-slate-800 mt-10">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Auditoría por Invernadero</label>
        <select 
          className="w-full border-2 p-4 rounded-2xl font-black text-slate-800 bg-slate-50 mt-2 outline-none focus:border-blue-500"
          value={invSeleccionado}
          onChange={(e) => setInvSeleccionado(e.target.value)}
        >
          <option value="">-- SELECCIONE PARA VER DETALLES --</option>
          {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
        </select>
      </div>

      {invSeleccionado && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-200 pb-2 italic text-center">Movimientos Específicos</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TABLA GASTOS */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-red-100">
              <div className="bg-red-500 p-3 text-white font-black text-[10px] uppercase">Egresos</div>
              <div className="max-h-64 overflow-y-auto text-[10px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 border-b">Concepto</th>
                      <th className="p-2 border-b text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {gastosInv.map(g => (
                      <tr key={g.id} className="hover:bg-red-50">
                        <td className="p-2 font-bold uppercase">{g.descripcion}</td>
                        <td className="p-2 text-right font-black text-red-600">{formatoPesos(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA DESPACHOS */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-green-100">
              <div className="bg-green-600 p-3 text-white font-black text-[10px] uppercase">Despachos</div>
              <div className="max-h-64 overflow-y-auto text-[10px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 border-b">Rem/Cliente</th>
                      <th className="p-2 border-b">Cant/Escala</th>
                      <th className="p-2 border-b text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {despachosInv.map(d => (
                      <tr key={d.id} className="hover:bg-green-50 align-top">
                        <td className="p-2">
                          <p className="font-black">#{d.numero_remision}</p>
                          <p className="text-[9px] text-slate-400 uppercase truncate w-20">{d.clientes?.nombre_completo}</p>
                        </td>
                        <td className="p-2 italic">
                          {d.detalle_ventas?.map((it, i) => (
                            <div key={i}>{it.cantidad} {it.escala}</div>
                          ))}
                        </td>
                        <td className="p-2 text-right font-black text-green-700">{formatoPesos(d.total_venta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA ABONOS */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-blue-100">
              <div className="bg-blue-600 p-3 text-white font-black text-[10px] uppercase">Abonos</div>
              <div className="max-h-64 overflow-y-auto text-[10px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 border-b">Remisión</th>
                      <th className="p-2 border-b text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagosInv.map(p => (
                      <tr key={p.id} className="hover:bg-blue-50">
                        <td className="p-2 font-bold uppercase">#{p.ventas?.numero_remision}</td>
                        <td className="p-2 text-right font-black text-blue-700">{formatoPesos(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}