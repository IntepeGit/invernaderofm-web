import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReporteVentas({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // 1. FILTRADO DE DATOS POR INVERNADERO
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosInv = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString())) || [];

  // 2. CÁLCULOS
  const totalVentas = despachosInv.reduce((acc, d) => acc + parseFloat(d.total_venta || 0), 0);
  const totalGastos = gastosInv.reduce((acc, g) => acc + parseFloat(g.monto || 0), 0);
  const utilidadNeta = totalVentas - totalGastos;
  const margen = totalVentas > 0 ? ((utilidadNeta / totalVentas) * 100).toFixed(1) : 0;
  const pagosRecibidos = pagosInv.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
  const cuentasPorCobrar = totalVentas - pagosRecibidos;

  const dataGrafica = [
    { name: 'Gastos', valor: totalGastos, color: '#ef4444' },
    { name: 'Ventas', valor: totalVentas, color: '#22c55e' },
    { name: 'Utilidad', valor: utilidadNeta, color: '#3b82f6' }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* SELECTOR */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-slate-800">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Análisis de Invernadero</label>
        <select 
          className="w-full border-2 p-4 rounded-2xl font-black text-slate-800 bg-slate-50 mt-2 outline-none focus:border-blue-500"
          value={invSeleccionado}
          onChange={(e) => setInvSeleccionado(e.target.value)}
        >
          <option value="">-- SELECCIONE UN INVERNADERO --</option>
          {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
        </select>
      </div>

      {invSeleccionado ? (
        <>
          {/* CARDS SUPERIORES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-lg border-b-4 border-red-500 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Gastos</p>
              <p className="text-lg font-black text-red-600">{formatoPesos(totalGastos)}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-lg border-b-4 border-green-500 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Ventas</p>
              <p className="text-lg font-black text-green-700">{formatoPesos(totalVentas)}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-lg border-b-4 border-blue-500 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Utilidad</p>
              <p className="text-lg font-black text-blue-700">{formatoPesos(utilidadNeta)}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-3xl shadow-lg text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Margen</p>
              <p className="text-xl font-black text-white">{margen}%</p>
            </div>
          </div>

          {/* SECCIÓN GRÁFICA Y CARTERA (TAMAÑO REDUCIDO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl h-64"> {/* h-64 para hacerlo más pequeño */}
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic">Comparativa de Rendimiento</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGrafica}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatoPesos(value)} contentStyle={{borderRadius: '15px'}} />
                  <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                    {dataGrafica.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col justify-center h-64">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic">Estado de Cartera</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-2xl border border-green-100">
                  <span className="text-[10px] font-bold text-green-800 uppercase">Cobrado</span>
                  <span className="font-black text-green-700">{formatoPesos(pagosRecibidos)}</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 p-3 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Por Cobrar</span>
                  <span className="font-black text-amber-700">{formatoPesos(cuentasPorCobrar)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLAS DETALLADAS ABAJO */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-200 pb-2 italic">Desglose de Movimientos</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TABLA GASTOS */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-red-100">
                <div className="bg-red-500 p-3 text-white font-black text-[10px] uppercase">Egresos</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
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
                <div className="bg-green-600 p-3 text-white font-black text-[10px] uppercase">Despachos & Productos</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="p-2 border-b">Remisión / Cliente</th>
                        <th className="p-2 border-b">Productos</th>
                        <th className="p-2 border-b text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {despachosInv.map(d => (
                        <tr key={d.id} className="hover:bg-green-50 align-top">
                          <td className="p-2">
                            <p className="font-black text-slate-600">#{d.numero_remision}</p>
                            <p className="font-bold text-slate-400 uppercase text-[9px] truncate w-20">{d.clientes?.nombre_completo}</p>
                          </td>
                          <td className="p-2">
                            {d.detalle_ventas?.map((item, idx) => (
                              <div key={idx} className="mb-1 border-b border-slate-100 last:border-0 pb-1">
                                <p className="font-black text-slate-800 uppercase">{item.descripcion}</p>
                                <p className="font-bold text-green-600 italic text-[9px]">
                                  {item.cantidad} {item.escala || 'Und'}
                                </p>
                              </div>
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
                <div className="bg-blue-600 p-3 text-white font-black text-[10px] uppercase">Abonos Recibidos</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
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
        </>
      ) : (
        <div className="bg-slate-100 border-2 border-dashed border-slate-300 p-20 rounded-3xl text-center">
          <p className="text-slate-400 font-black uppercase text-xs italic tracking-widest">Seleccione un invernadero para ver el análisis completo</p>
        </div>
      )}
    </div>
  );
}