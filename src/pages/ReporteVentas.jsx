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
      {/* SELECTOR UNIFICADO CON ESTILO CORPORATIVO */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-green-700">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Análisis de Invernadero / Bloque</label>
        <select 
          className="w-full border-2 p-3.5 rounded-2xl font-black text-slate-800 bg-white mt-2 outline-none focus:border-green-700 text-sm shadow-sm"
          value={invSeleccionado}
          onChange={(e) => setInvSeleccionado(e.target.value)}
        >
          <option value="">-- SELECCIONE UN INVERNADERO --</option>
          {listaInvernaderos.map(inv => <option key={inv.id} value={inv.id}>{inv.nombre}</option>)}
        </select>
      </div>

      {invSeleccionado ? (
        <>
          {/* CARDS SUPERIORES CON ESTILO REFORZADO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-red-500 text-center flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Gastos Totales</p>
              <p className="text-xl font-black text-red-600 mt-1">{formatoPesos(totalGastos)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-green-600 text-center flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Ventas Totales</p>
              <p className="text-xl font-black text-green-700 mt-1">{formatoPesos(totalVentas)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-xl border-b-4 border-blue-500 text-center flex flex-col justify-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider italic">Utilidad Neta</p>
              <p className="text-xl font-black text-blue-700 mt-1">{formatoPesos(utilidadNeta)}</p>
            </div>
            <div className="bg-slate-800 p-5 rounded-3xl shadow-xl text-center flex flex-col justify-center border-b-4 border-slate-900">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider italic">Margen de Rendimiento</p>
              <p className="text-2xl font-black text-white mt-1">{margen}%</p>
            </div>
          </div>

          {/* SECCIÓN GRÁFICA Y CARTERA EN PARALELO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl h-64 border border-gray-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic tracking-wider">Comparativa de Rendimiento</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGrafica}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#475569'}} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatoPesos(value)} contentStyle={{borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {dataGrafica.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col justify-center h-64 border border-gray-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-5 italic tracking-wider">Estado General de Cartera</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
                  <span className="text-[10px] font-black text-green-800 uppercase tracking-wider">Total Cobrado (Recaudos)</span>
                  <span className="font-black text-green-700 text-sm">{formatoPesos(pagosRecibidos)}</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Por Cobrar (Cartera Pendiente)</span>
                  <span className="font-black text-amber-700 text-sm">{formatoPesos(cuentasPorCobrar)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLAS DETALLADAS CON FORMATO CEBRA FUERTE */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b-2 border-slate-200 pb-2 italic">Desglose General de Movimientos</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* TABLA GASTOS */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-red-600 p-3.5 text-white font-black text-[10px] uppercase tracking-wider italic">Egresos / Costos</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-slate-700 font-black uppercase sticky top-0 border-b border-gray-300 z-10">
                      <tr>
                        <th className="p-2.5">Concepto</th>
                        <th className="p-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {gastosInv.length === 0 ? (
                        <tr><td colSpan="2" className="p-4 text-center text-gray-400 italic">Sin egresos en este bloque</td></tr>
                      ) : (
                        gastosInv.map((g, idx) => (
                          <tr key={g.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-red-50/50 transition-colors`}>
                            <td className="p-2.5 uppercase text-slate-900">{g.descripcion}</td>
                            <td className="p-2.5 text-right font-black text-red-600 text-xs">{formatoPesos(g.monto)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA DESPACHOS */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-green-700 p-3.5 text-white font-black text-[10px] uppercase tracking-wider italic">Despachos & Cargas</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-slate-700 font-black uppercase sticky top-0 border-b border-gray-300 z-10">
                      <tr>
                        <th className="p-2.5">Remisión / Cliente</th>
                        <th className="p-2.5">Cultivos</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {despachosInv.length === 0 ? (
                        <tr><td colSpan="3" className="p-4 text-center text-gray-400 italic">Sin despachos en este bloque</td></tr>
                      ) : (
                        despachosInv.map((d, idx) => (
                          <tr key={d.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-green-50/50 transition-colors align-top`}>
                            <td className="p-2.5">
                              <p className="font-black text-slate-900"># {d.numero_remision}</p>
                              <p className="font-bold text-slate-400 uppercase text-[8px] mt-0.5 truncate max-w-[85px]" title={d.clientes?.nombre_completo}>
                                {d.clientes?.nombre_completo || 'Particular'}
                              </p>
                            </td>
                            <td className="p-2.5 space-y-1">
                              {d.detalle_ventas?.map((item, idx) => (
                                <div key={idx} className="border-b border-slate-200/60 last:border-0 pb-0.5">
                                  <p className="font-black text-slate-800 uppercase text-[9px] leading-tight">{item.descripcion}</p>
                                  <p className="font-black text-green-700 italic text-[8px] mt-0.5">
                                    {item.cantidad} {item.escala || 'Und'}
                                  </p>
                                </div>
                              ))}
                            </td>
                            <td className="p-2.5 text-right font-black text-green-700 text-xs">{formatoPesos(d.total_venta)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA ABONOS */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-blue-600 p-3.5 text-white font-black text-[10px] uppercase tracking-wider italic">Abonos Recibidos</div>
                <div className="max-h-80 overflow-y-auto text-[10px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-slate-700 font-black uppercase sticky top-0 border-b border-gray-300 z-10">
                      <tr>
                        <th className="p-2.5">N° Remisión</th>
                        <th className="p-2.5 text-right">Monto Recaudo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-slate-700">
                      {pagosInv.length === 0 ? (
                        <tr><td colSpan="2" className="p-4 text-center text-gray-400 italic">Sin abonos registrados</td></tr>
                      ) : (
                        pagosInv.map((p, idx) => (
                          <tr key={p.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/50 transition-colors`}>
                            <td className="p-2.5 font-black text-slate-900"># {p.ventas?.numero_remision || 'S/N'}</td>
                            <td className="p-2.5 text-right font-black text-blue-700 text-xs">+{formatoPesos(p.monto)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-20 rounded-3xl text-center">
          <p className="text-blue-400 font-black uppercase text-xs italic tracking-widest">Seleccione un invernadero para desplegar la bitácora financiera</p>
        </div>
      )}
    </div>
  );
}