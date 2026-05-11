import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReporteVentas({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // FILTRADO DE DATOS POR INVERNADERO
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  
  // CALCULOS
  const totalVentas = despachosInv.reduce((acc, d) => acc + parseFloat(d.total_venta || 0), 0);
  const totalGastos = gastosInv.reduce((acc, g) => acc + parseFloat(g.monto || 0), 0);
  const utilidadNeta = totalVentas - totalGastos;
  const margen = totalVentas > 0 ? ((utilidadNeta / totalVentas) * 100).toFixed(1) : 0;

  // Cartera (Lo que falta por cobrar de este invernadero)
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosRecibidos = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString()))
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0) || 0;
  const cuentasPorCobrar = totalVentas - pagosRecibidos;

  const dataGrafica = [
    { name: 'Gastos', valor: totalGastos, color: '#ef4444' },
    { name: 'Ventas', valor: totalVentas, color: '#22c55e' },
    { name: 'Utilidad', valor: utilidadNeta, color: '#3b82f6' }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* SELECTOR DE INVERNADERO */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-slate-800">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic px-1">Seleccionar Invernadero para Análisis</label>
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
          {/* CARDS DE BALANCE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Gastos</p>
              <p className="text-xl font-black text-red-600">{formatoPesos(totalGastos)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-green-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Despachos</p>
              <p className="text-xl font-black text-green-700">{formatoPesos(totalVentas)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Utilidad Real</p>
              <p className="text-xl font-black text-blue-700">{formatoPesos(utilidadNeta)}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl shadow-lg">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Margen</p>
              <p className="text-2xl font-black text-white">{margen}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GRÁFICO COMPARATIVO */}
            <div className="bg-white p-6 rounded-3xl shadow-xl h-80">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic">Comparativa de Rendimiento</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGrafica}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
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

            {/* ESTADO DE CARTERA */}
            <div className="bg-white p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 italic">Estado de Recaudo (Cartera)</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
                  <span className="text-xs font-bold text-green-800 uppercase">Dinero Ingresado</span>
                  <span className="font-black text-green-700 text-lg">{formatoPesos(pagosRecibidos)}</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <span className="text-xs font-bold text-amber-800 uppercase">Por Cobrar</span>
                  <span className="font-black text-amber-700 text-lg">{formatoPesos(cuentasPorCobrar)}</span>
                </div>
                <div className="pt-4 border-t border-dashed">
                  <p className="text-[9px] font-medium text-slate-400 text-center italic">
                    Este reporte cruza los despachos realizados con los pagos aplicados a esas remisiones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-100 border-2 border-dashed border-slate-300 p-20 rounded-3xl text-center">
          <span className="text-4xl block mb-4">📊</span>
          <p className="text-slate-400 font-black uppercase text-xs">Seleccione un invernadero para generar el balance general</p>
        </div>
      )}
    </div>
  );
}