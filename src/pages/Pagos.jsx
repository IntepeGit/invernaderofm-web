import React, { useState } from 'react';

export default function Pagos({ listaClientes, datosDespachos, guardarPago, datosPagos, mostrarAlerta }) {
  const [pagoForm, setPagoForm] = useState({
    cliente_id: '',
    despacho_id: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: 0,
    referencia: ''
  });

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);

  // 1. Obtener la remisión seleccionada actualmente
  const remisionSeleccionada = datosDespachos?.find(r => r.id?.toString() === pagoForm.despacho_id?.toString());

  // 2. Obtener todos los abonos asociados a esa remisión específica
  const historialAbonos = datosPagos
    ?.filter(p => p.despacho_id?.toString() === pagoForm.despacho_id?.toString())
    .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  const totalAbonado = historialAbonos?.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0) || 0;
  const saldoActual = remisionSeleccionada ? (parseFloat(remisionSeleccionada.total_venta) - totalAbonado) : 0;

  const remisionesDelCliente = datosDespachos?.filter(d => 
    d.cliente_id?.toString() === pagoForm.cliente_id?.toString()
  ) || [];

  const manejarEnvio = (e) => {
    e.preventDefault();
    const montoAbono = parseFloat(pagoForm.monto);
    if (montoAbono <= 0) return mostrarAlerta("El valor debe ser mayor a cero", "error");
    if (montoAbono > saldoActual) return mostrarAlerta("EL VALOR SUPERA EL SALDO PENDIENTE", "error");

    guardarPago(pagoForm);
    setPagoForm({ ...pagoForm, monto: 0, referencia: `Abono a Remisión ${remisionSeleccionada?.numero_remision}` });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-700">
        <h3 className="font-black text-blue-900 uppercase text-sm mb-6 italic">💳 Registro de Pagos</h3>
        
        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Cliente</label>
              <select className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={pagoForm.cliente_id}
                onChange={(e) => setPagoForm({...pagoForm, cliente_id: e.target.value, despacho_id: ''})} required>
                <option value="">Seleccione Cliente...</option>
                {listaClientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Remisión</label>
              <select className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={pagoForm.despacho_id}
                onChange={(e) => setPagoForm({...pagoForm, despacho_id: e.target.value, monto: 0})}
                disabled={!pagoForm.cliente_id} required>
                <option value="">Seleccione Remisión...</option>
                {remisionesDelCliente.map(r => (
                  <option key={r.id} value={r.id}>N° {r.numero_remision} - {formatoPesos(r.total_venta)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Fecha de Abono</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl font-bold"
                value={pagoForm.fecha_pago}
                onChange={(e) => setPagoForm({...pagoForm, fecha_pago: e.target.value})} required />
            </div>
          </div>

          {remisionSeleccionada && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <div>
                <label className="text-[10px] font-black text-blue-700 uppercase italic">Valor del Nuevo Abono</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white rounded-xl font-black text-xl text-blue-900 border-2 border-blue-200 outline-none focus:border-blue-500"
                  value={formatoPesos(pagoForm.monto)}
                  onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value.replace(/\D/g, "")})}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Referencia</label>
                <input className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                  value={pagoForm.referencia}
                  onChange={(e) => setPagoForm({...pagoForm, referencia: e.target.value})}
                  placeholder="Ej: Transferencia Bancolombia" />
              </div>
              <button type="submit" className="md:col-span-2 bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg uppercase hover:bg-blue-800 transition-all">
                Registrar Abono
              </button>
            </div>
          )}
        </form>
      </div>

      {/* HISTORIAL VERTICAL DE LA REMISIÓN SELECCIONADA */}
      {remisionSeleccionada ? (
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-300 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
            <h3 className="font-black uppercase text-xs tracking-widest italic">Resumen de Cuenta: Remisión {remisionSeleccionada.numero_remision}</h3>
            <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Detalle Vertical</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Encabezado Principal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Cliente</p>
                <p className="font-black text-lg text-slate-800 uppercase">{remisionSeleccionada.clientes?.nombre_completo}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">Fecha Despacho</p>
                <p className="font-black text-lg text-slate-800">{remisionSeleccionada.fecha_venta}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-green-600 uppercase">Valor Total Venta</p>
                <p className="font-black text-2xl text-green-700">{formatoPesos(remisionSeleccionada.total_venta)}</p>
              </div>
            </div>

            {/* Lista Vertical de Abonos */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronología de Abonos</p>
              {historialAbonos?.length > 0 ? (
                historialAbonos.map((abono, idx) => (
                  <div key={abono.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Abono {idx + 1}</p>
                        <p className="font-black text-slate-700 text-sm">{abono.fecha_pago}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{abono.referencia || 'Sin nota'}</p>
                      <p className="font-black text-blue-700 text-lg">+{formatoPesos(abono.monto)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed">
                  <p className="text-xs font-bold text-gray-400 uppercase italic">No se han registrado abonos para esta remisión</p>
                </div>
              )}
            </div>

            {/* Pie de Ficha: Saldo Final */}
            <div className="bg-slate-900 p-6 rounded-2xl flex justify-between items-center text-white shadow-xl">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Abonado</p>
                <p className="font-black text-xl text-blue-400">{formatoPesos(totalAbonado)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Saldo Neto Pendiente</p>
                <p className={`font-black text-3xl ${saldoActual <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatoPesos(saldoActual)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-12 rounded-3xl text-center">
          <p className="text-blue-400 font-black uppercase text-xs italic">
            Seleccione una remisión arriba para ver su historial de pagos detallado
          </p>
        </div>
      )}
    </div>
  );
}