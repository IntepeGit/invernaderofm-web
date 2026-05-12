import React from 'react';

export default function Pagos({ 
  pagoForm, setPagoForm, listaClientes, datosDespachos, 
  datosPagos, mostrarAlerta, cargarTodo, 
  guardarPago, prepararEdicionPago, eliminarPago 
}) {

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0 
  }).format(valor || 0);

  // 1. Obtener la remisión seleccionada actualmente
  const remisionSeleccionada = datosDespachos?.find(r => r.id?.toString() === pagoForm.despacho_id?.toString());

  // 2. Obtener abonos asociados a la remisión actual
  const historialAbonos = datosPagos
    ?.filter(p => p.despacho_id?.toString() === pagoForm.despacho_id?.toString())
    .sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  const totalAbonado = historialAbonos?.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0) || 0;
  const saldoActual = remisionSeleccionada ? (parseFloat(remisionSeleccionada.total_venta) - totalAbonado) : 0;

  const remisionesDelCliente = datosDespachos?.filter(d => 
    d.cliente_id?.toString() === pagoForm.cliente_id?.toString()
  ) || [];

  return (
    <div className="space-y-6 pb-20">
      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-700">
        <h3 className="font-black text-blue-900 uppercase text-sm mb-6 italic">💳 Registro de Pagos</h3>
        
        <form onSubmit={guardarPago} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Cliente</label>
              <select 
                className="w-full border-2 p-3 rounded-xl font-bold bg-white"
                value={pagoForm.cliente_id}
                onChange={(e) => setPagoForm({...pagoForm, cliente_id: e.target.value, despacho_id: ''})} 
                required
              >
                <option value="">Seleccione Cliente...</option>
                {listaClientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">N° Remisión</label>
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
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Fecha Abono</label>
              <input type="date" className="w-full border-2 p-3 rounded-xl font-bold"
                value={pagoForm.fecha_pago}
                onChange={(e) => setPagoForm({...pagoForm, fecha_pago: e.target.value})} required />
            </div>
          </div>

          {remisionSeleccionada && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-700 uppercase italic px-1">Valor del Nuevo Abono</label>
                  <input 
                  type="text" 
                  className="w-full p-4 bg-white rounded-xl font-black text-2xl text-blue-900 border-2 border-blue-200 outline-none focus:border-blue-500"
                  value={pagoForm.monto} // <--- DEBE SER ASÍ, sin formatoPesos()
                  onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value.replace(/\D/g, "")})} 
                  required 
                />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase italic px-1">Saldo Pendiente Actual</label>
                  <div className="w-full p-4 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center">
                    <p className={`text-2xl font-black ${saldoActual <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatoPesos(saldoActual)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1 italic">Referencia / Nota de Pago</label>
                  <input className="w-full border-2 p-3 rounded-xl font-bold bg-white outline-none focus:border-blue-500"
                    value={pagoForm.referencia}
                    onChange={(e) => setPagoForm({...pagoForm, referencia: e.target.value})}
                    placeholder="Ej: Transferencia Bancolombia / Efectivo" />
                </div>
                <button 
                  type="submit" 
                  className={`w-full p-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg ${
                    pagoForm.id_editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {pagoForm.id_editando ? '💾 Actualizar Abono' : '💰 Registrar Abono'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* FICHA TÉCNICA Y DETALLE DE PRODUCTOS */}
      {remisionSeleccionada ? (
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-300">
          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
            <h3 className="font-black uppercase text-xs tracking-widest italic">Ficha de Remisión: {remisionSeleccionada.numero_remision}</h3>
            <span className="bg-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Detalle de Carga</span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase italic">Cliente</p>
                <p className="font-black text-xl text-slate-800 uppercase leading-tight">{remisionSeleccionada.clientes?.nombre_completo}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">Fecha: {remisionSeleccionada.fecha_venta}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest italic">Contenido de la Remisión</p>
                <div className="space-y-2">
                  {remisionSeleccionada.detalle_ventas?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-200 pb-1">
                      <p className="text-xs font-black text-slate-700 uppercase">{item.descripcion}</p>
                      <p className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        {item.cantidad} {item.escala}
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">Valor Total Venta:</p>
                    <p className="text-sm font-black text-green-700">{formatoPesos(remisionSeleccionada.total_venta)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CRONOLOGÍA DE ABONOS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Historial de Abonos Recibidos</p>
              {historialAbonos?.length > 0 ? (
                historialAbonos.map((abono, idx) => (
                  <div key={abono.id} className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-700 text-sm">{abono.fecha_pago}</p>
                          {abono.referencia && (
                            <span className="text-[10px] font-bold text-blue-800 italic uppercase bg-blue-100 px-2 rounded-md">
                              {abono.referencia}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <p className="font-black text-blue-700 text-lg">+{formatoPesos(abono.monto)}</p>
                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => prepararEdicionPago(abono)}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-md transition-all active:scale-90"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => eliminarPago(abono.id)}
                          className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-all active:scale-90"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase italic">Sin pagos registrados</p>
                </div>
              )}
            </div>

            {/* SALDO FINAL */}
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
          <p className="text-blue-400 font-black uppercase text-xs italic">Seleccione una remisión para cargar el detalle de productos</p>
        </div>
      )}
    </div>
  );
}