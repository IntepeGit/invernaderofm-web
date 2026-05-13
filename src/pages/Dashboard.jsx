import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs GLOBALES SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-blue-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Ingresos Totales</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0))}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-red-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Gastos Totales</p>
          <p className="text-2xl font-black text-slate-800">{formatoPesos(datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0))}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-l-8 border-green-500">
          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Utilidad Neta</p>
          <p className="text-2xl font-black text-green-600">{formatoPesos(datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0) - datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0))}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-3xl shadow-lg">
          <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Eficiencia</p>
          <p className="text-3xl font-black text-white">{(() => {
            const v = datosDespachos.reduce((acc, d) => acc + (d.total_venta || 0), 0);
            const g = datosEgresos.reduce((acc, e) => acc + (e.monto || 0), 0);
            return v > 0 ? (((v - g) / v) * 100).toFixed(1) : 0;
          })()}%</p>
        </div>
      </div>

      {/* 2. GRÁFICO PRINCIPAL */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <h3 className="font-black text-slate-800 text-lg uppercase italic tracking-tighter mb-6">Balance Comparativo</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={balancesGrafica}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} fontWeight="900" axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
              <Bar dataKey="Ingresos" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[10, 10, 0, 0]} />
              <Bar dataKey="Utilidad" fill="#10b981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. TARJETAS DE INVERNADERO CON CARTERA (Lo que pediste hoy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {balancesGrafica.map((inv, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4 border-b pb-2 italic">{inv.name}</p>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Ventas Brutas</p>
                <p className="text-lg font-black text-slate-800">{formatoPesos(inv.Ingresos)}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[9px] font-black text-amber-700 uppercase italic">Cartera Pendiente</p>
                <p className={`text-xl font-black ${inv.Cartera > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {formatoPesos(inv.Cartera)}
                </p>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-[10px]">
                <span className="text-red-400 font-bold">Gastos: {formatoPesos(inv.Gastos)}</span>
                <span className="text-green-600 font-black">Util: {formatoPesos(inv.Utilidad)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. SECCIÓN DE DETALLES (Tus tablas anteriores) */}
      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 uppercase italic">Explorador de Detalles</h3>
          <select 
            value={invSeleccionado} 
            onChange={(e) => setInvSeleccionado(e.target.value)}
            className="p-3 rounded-2xl border-2 border-blue-200 font-bold text-sm outline-none focus:border-blue-500 transition-all"
          >
            <option value="">Seleccione Invernadero...</option>
            {listaInvernaderos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>

        {invSeleccionado ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <div className="bg-amber-500 p-4 text-white font-black text-xs uppercase tracking-widest">Pagos Recibidos</div>
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
            {/* Tabla Gastos */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-red-500 p-4 text-white font-black text-xs uppercase tracking-widest">Gastos Lote</div>
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
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase italic text-sm tracking-widest">Seleccione un invernadero para ver el detalle</p>
          </div>
        )}
      </div>

      {/* 5. CARTERA TOTAL CONSOLIDADA AL FINAL */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-4 rounded-2xl text-2xl shadow-lg shadow-amber-200">💰</div>
          <div>
            <h4 className="font-black text-slate-800 uppercase italic text-sm">Cartera Total Consolidada</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Suma de deudas de todos los invernaderos</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black text-amber-600 tracking-tighter">
            {formatoPesos(balancesGrafica.reduce((acc, inv) => acc + inv.Cartera, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}