import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';

export default function Dashboard({ listaInvernaderos, datosDespachos, datosEgresos, datosPagos, balancesGrafica }) {
  const [invSeleccionado, setInvSeleccionado] = useState('');
  
  // Estados para capturar cosecha, nómina e inventario crítico
  const [historicoCosecha, setHistoricoCosecha] = useState([]);
  const [historicoNominaPagada, setHistoricoNominaPagada] = useState([]); // 👈 Solo pagos realizados
  const [insumosCriticos, setInsumosCriticos] = useState([]);

  useEffect(() => {
    cargarDatosExtraDashboard();
  }, []);

  const cargarDatosExtraDashboard = async () => {
    try {
      // 🚀 Se consulta únicamente nomina_pagos_realizados para asegurar que esté PAGADA
      const [resCosecha, resNominaPagada, resBodega] = await Promise.all([
        supabase.from('produccion_cosecha').select('*, invernaderos(nombre)'),
        supabase.from('nomina_pagos_realizados').select('*'),
        supabase.from('inventario').select('*')
      ]);

      setHistoricoCosecha(resCosecha.data || []);
      setHistoricoNominaPagada(resNominaPagada.data || []);

      if (resBodega.data && resBodega.data.length > 0) {
        const criticos = resBodega.data.filter(item => {
          const cantVal = parseFloat(
            item.cant_actual ?? 
            item.cantidad_actual ?? 
            item.cantidad ?? 
            item.stock ?? 
            0
          );

          // ⚡ Se evalúa el mínimo configurado en BD o toma 3 por defecto
          const minVal = parseFloat(item.stock_minimo) > 0 
            ? parseFloat(item.stock_minimo) 
            : parseFloat(item.cant_minima ?? item.minimo ?? 3);

          const esConsumible = item.tipo_item === 'Consumible' || !item.tipo_item;
          const aplicaControl = item.aplica_stock !== false;

          return esConsumible && aplicaControl && (cantVal <= minVal);
        });

        setInsumosCriticos(criticos);
      }

    } catch (err) {
      console.error("Error cargando datos en Dashboard:", err);
    }
  };

  const obtenerNombreArticuloReal = (item) => {
    if (item.articulo && item.articulo.trim()) return item.articulo;
    if (item.nombre_articulo && item.nombre_articulo.trim()) return item.nombre_articulo;
    if (item.nombre_insumo && item.nombre_insumo.trim()) return item.nombre_insumo;
    if (item.nombre && item.nombre.trim()) return item.nombre;
    if (item.nombre_item && item.nombre_item.trim()) return item.nombre_item;
    if (item.item && item.item.trim()) return item.item;
    if (item.descripcion && item.descripcion.trim()) return item.descripcion;

    const claveNombre = Object.keys(item).find(key => 
      ['articulo', 'nombre', 'item', 'descripcion', 'producto'].some(k => key.toLowerCase().includes(k))
    );
    
    if (claveNombre && item[claveNombre]) return String(item[claveNombre]);
    return 'INSUMO';
  };

  const formatoPesos = (valor) => new Intl.NumberFormat('es-CO', { 
    style: 'currency', currency: 'COP', minimumFractionDigits: 0 
  }).format(valor || 0);

  // --- 1. SEPARACIÓN ESTRICTA DE INVERNADEROS OPERATIVOS ---
  const invernaderosOperativos = (listaInvernaderos || []).filter(inv => inv.activo !== false);
  const idsOperativos = invernaderosOperativos.map(i => i.id?.toString());
  const nombresOperativos = invernaderosOperativos.map(i => i.nombre?.toUpperCase());
  const cantidadInvernaderosActivos = invernaderosOperativos.length || 1;

  // --- 🧮 2. CÁLCULO DE NÓMINA PAGADA (CON PRORRATEO DE GENERAL/VARIOS) ---
  const calcularNominaPorInvernadero = (invId) => {
    const invObj = invernaderosOperativos.find(i => i.id?.toString() === invId?.toString());
    const nombreInv = invObj?.nombre?.toUpperCase();

    let totalManoObraLote = 0;

    (historicoNominaPagada || []).forEach(pago => {
      const monto = parseFloat(pago.monto_pagado || 0);
      const invNombrePago = (pago.invernadero_nombre || '').toUpperCase();

      // A. Si está asignado específicamente a este invernadero
      if (invNombrePago && nombreInv && invNombrePago.includes(nombreInv)) {
        totalManoObraLote += monto;
      } 
      // B. Si es "GENERAL / VARIOS" o está vacío -> Se divide en partes iguales entre los activos
      else if (!invNombrePago || invNombrePago.includes('GENERAL') || invNombrePago.includes('VARIOS')) {
        totalManoObraLote += (monto / cantidadInvernaderosActivos);
      }
    });

    return totalManoObraLote;
  };

  const gastosNominaGlobales = (historicoNominaPagada || []).reduce((acc, p) => acc + parseFloat(p.monto_pagado || 0), 0);

  // --- 🧮 3. SUMATORIAS GLOBALES ---
  const ingresosGlobales = (datosDespachos || [])
    .filter(d => idsOperativos.includes(d.invernadero_id?.toString()))
    .reduce((acc, d) => acc + (parseFloat(d.total_venta) || 0), 0);

  const gastosInsumosGlobales = (datosEgresos || [])
    .filter(g => !g.invernadero_id || idsOperativos.includes(g.invernadero_id?.toString()))
    .reduce((acc, e) => acc + (parseFloat(e.monto) || 0), 0);

  const gastosTotalesConNomina = gastosInsumosGlobales + gastosNominaGlobales;
  const utilidadRealGlobal = ingresosGlobales - gastosTotalesConNomina;

  // --- 📊 4. MATEMÁTICA DE PUNTO DE EQUILIBRIO POR INVERNADERO ---
  const analisisPuntoEquilibrio = invernaderosOperativos.map(inv => {
    const gastosInsumosLote = (datosEgresos || [])
      .filter(g => g.invernadero_id?.toString() === inv.id?.toString())
      .reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);

    const gastosNominaLote = calcularNominaPorInvernadero(inv.id);
    const inversionTotalLote = gastosInsumosLote + gastosNominaLote;
    
    const cosechasLote = (historicoCosecha || []).filter(c => c.invernadero_id === inv.id);
    
    const totalCanastillas = cosechasLote
      .filter(c => c.unidad_medida === 'CANASTILLA')
      .reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);

    const otrosEmpaques = cosechasLote
      .filter(c => c.unidad_medida !== 'CANASTILLA')
      .reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);

    const totalUnidadesCosechadas = totalCanastillas > 0 ? totalCanastillas : otrosEmpaques;
    const etiquetaUnidad = totalCanastillas > 0 ? 'Canastillas' : 'Unidades / Kilos';

    const costoBaseUnidad = totalUnidadesCosechadas > 0 ? (inversionTotalLote / totalUnidadesCosechadas) : 0;

    return {
      id: inv.id,
      nombre: inv.nombre?.toUpperCase(),
      inversionTotal: inversionTotalLote,
      totalUnidades: totalUnidadesCosechadas,
      etiquetaUnidad,
      costoBaseUnidad
    };
  });

  // --- 5. DATOS PARA GRÁFICOS ---
  const balancesGraficaOperativos = (balancesGrafica || []).filter(b => nombresOperativos.includes(b.name?.toUpperCase()));

  const datosGraficoProduccion = invernaderosOperativos.map(inv => {
    const cosechasLote = historicoCosecha.filter(c => c.invernadero_id === inv.id);
    const canastillas = cosechasLote.filter(c => c.unidad_medida === 'CANASTILLA').reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);
    const bultos = cosechasLote.filter(c => c.unidad_medida === 'BULTO').reduce((acc, c) => acc + (parseFloat(c.cantidad) || 0), 0);
    return { name: inv.nombre?.toUpperCase(), Canastillas: canastillas, Bultos: bultos };
  });

  const datosGraficoNomina = invernaderosOperativos.map(inv => {
    const costoNominaLote = calcularNominaPorInvernadero(inv.id);
    return { name: inv.nombre?.toUpperCase(), Costo_Mano_Obra: costoNominaLote };
  });

  // --- 6. FILTRADO EXPLORADOR ---
  const despachosInv = datosDespachos?.filter(d => d.invernadero_id?.toString() === invSeleccionado) || [];
  const gastosInv = datosEgresos?.filter(g => g.invernadero_id?.toString() === invSeleccionado) || [];
  
  const objInvSel = invernaderosOperativos.find(i => i.id?.toString() === invSeleccionado);
  const nombreInvSelStr = objInvSel ? objInvSel.nombre?.toUpperCase() : '';

  const nominaInv = historicoNominaPagada?.filter(p => {
    const invPagoStr = (p.invernadero_nombre || '').toUpperCase();
    return invPagoStr.includes(nombreInvSelStr) || invPagoStr.includes('GENERAL') || invPagoStr.includes('VARIOS');
  }) || [];
  
  const idsDespachos = despachosInv.map(d => d.id?.toString());
  const pagosInv = datosPagos?.filter(p => idsDespachos.includes(p.despacho_id?.toString())) || [];

  const totalRemisiones = despachosInv.reduce((acc, d) => acc + (d.total_venta || 0), 0);
  const totalAbonos = pagosInv.reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalGastosInsumos = gastosInv.reduce((acc, g) => acc + (g.monto || 0), 0);
  const totalManoObra = calcularNominaPorInvernadero(invSeleccionado);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10 text-slate-800">
      
      {/* 🚨 BANNER DE ALERTA DE STOCK (SISTEMA DE STOCK MÍNIMO DINÁMICO CORREGIDO) */}
      {insumosCriticos.length > 0 && (
        <div className="bg-amber-50 border-l-8 border-amber-500 p-4 rounded-2xl shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">⚠️</span>
            <div>
              <h4 className="font-black text-amber-900 text-xs uppercase tracking-wider">
                Alerta de Reabastecimiento en Bodega ({insumosCriticos.length} Insumo(s) Crítico(s))
              </h4>
              <div className="flex gap-2 flex-wrap mt-1">
                {insumosCriticos.map((item, idx) => {
                  const nombreArticulo = obtenerNombreArticuloReal(item);
                  const cantidadStock = item.cantidad_actual ?? item.cant_actual ?? item.cantidad ?? item.stock ?? 0;
                  const unidadMedida = item.unidad_medida || item.unidad || 'Unidad';
                  
                  // ⚡ Mínimo evaluado dinámicamente con prioridad al valor de BD
                  const minDef = parseFloat(item.stock_minimo) > 0 
                    ? parseFloat(item.stock_minimo) 
                    : parseFloat(item.cant_minima ?? item.minimo ?? 3);

                  return (
                    <span key={item.id || idx} className="bg-amber-200/90 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase shadow-xs">
                      📦 {nombreArticulo}: <span className="text-red-700 font-extrabold">{cantidadStock} {unidadMedida}</span> (Mínimo: {minDef})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black text-amber-700 uppercase italic shrink-0">Revisar Bodega</span>
        </div>
      )}

      {/* KPIs GLOBALES COMPRIMIDOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border-l-4 border-[#117097]">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ingresos Totales (En Producción)</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{formatoPesos(ingresosGlobales)}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border-l-4 border-slate-400">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gastos (+Mano Obra Liquidada)</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{formatoPesos(gastosTotalesConNomina)}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border-l-4 border-emerald-600">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Utilidad Neta Activa</p>
          <p className={`text-xl font-black mt-0.5 ${utilidadRealGlobal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatoPesos(utilidadRealGlobal)}
          </p>
        </div>
        <div className="bg-[#117097] p-3.5 rounded-2xl shadow-sm text-white">
          <p className="text-[9px] font-black text-sky-100 uppercase tracking-wider">Eficiencia Financiera</p>
          <p className="text-xl font-black mt-0.5">
            {ingresosGlobales > 0 ? ((utilidadRealGlobal / ingresosGlobales) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* ANÁLISIS DE PUNTO DE EQUILIBRIO Y COSTO UNITARIO BASE */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            🎯 Costo Base y Punto de Equilibrio por Lote
          </h3>
          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
            Lotes Activos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {analisisPuntoEquilibrio.map((item) => (
            <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b pb-1">
                  <p className="font-black text-xs text-[#117097] uppercase">{item.nombre}</p>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{item.etiquetaUnidad}</span>
                </div>

                <div className="mt-2 space-y-1 text-[10px] font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span>Inversión Lote:</span>
                    <span className="font-black text-slate-800">{formatoPesos(item.inversionTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cosechado:</span>
                    <span className="font-black text-emerald-700">{item.totalUnidades} {item.etiquetaUnidad}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1 text-center">
                <p className="text-[8px] font-black text-amber-800 uppercase italic">Precio Mínimo de Venta Base</p>
                <p className="text-sm font-black text-amber-900 mt-0.5">
                  {item.costoBaseUnidad > 0 ? `${formatoPesos(item.costoBaseUnidad)} / U` : 'Sin Cosecha'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GRÁFICO PRINCIPAL COMERCIAL + BALANCES INDIVIDUALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider mb-3">Balance Financiero por Invernadero (En Producción)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balancesGraficaOperativos} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="800" axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Ingresos" fill="#117097" radius={[4, 4, 0, 0]} name="Ventas" />
                <Bar dataKey="Gastos" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Gastos/Insumos" />
                <Bar dataKey="Utilidad" fill="#059669" radius={[4, 4, 0, 0]} name="Margen" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between max-h-[264px] overflow-y-auto space-y-2">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider">Balances Individuales (Operativos)</h3>
          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {balancesGraficaOperativos.map((inv, idx) => {
              const objetoInvReal = invernaderosOperativos.find(i => i.nombre?.toUpperCase() === inv.name?.toUpperCase());
              const nominaEsteLote = objetoInvReal ? calcularNominaPorInvernadero(objetoInvReal.id) : 0;
              const gastosTotalesLote = inv.Gastos + nominaEsteLote;
              const utilidadRealLote = inv.Ingresos - gastosTotalesLote;

              return (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                  <div>
                    <p className="font-black text-[#117097] uppercase tracking-tight">{inv.name}</p>
                    <p className="text-[9px] text-gray-400 font-bold">Cartera: {formatoPesos(inv.Cartera)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-700">{formatoPesos(inv.Ingresos)}</p>
                    <p className={`text-[10px] font-black ${utilidadRealLote >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Util: {formatoPesos(utilidadRealLote)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GRÁFICOS SECUNDARIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">🚜 Volumen Cosechado por Lote</h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficoProduccion} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} fontWeight="800" axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Canastillas" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bultos" fill="#b45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">👥 Costo de Mano de Obra por Lote (Prorrateado)</h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficoNomina} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} fontWeight="800" axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} formatter={(v) => formatoPesos(v)} />
                <Bar dataKey="Costo_Mano_Obra" fill="#0284c7" radius={[3, 3, 0, 0]} name="Costo Jornales / Sueldos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* EXPLORADOR DE DETALLES */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider">Explorador de Detalles</h3>
          <select 
            value={invSeleccionado} 
            onChange={(e) => setInvSeleccionado(e.target.value)}
            className="p-2 rounded-xl border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#117097] transition-all bg-white"
          >
            <option value="">Seleccione Invernadero...</option>
            <optgroup label="🌱 EN PRODUCCIÓN (OPERATIVOS)">
              {(listaInvernaderos || []).filter(i => i.activo !== false).map(i => (
                <option key={i.id} value={i.id}>{i.nombre?.toUpperCase()}</option>
              ))}
            </optgroup>
            <optgroup label="📁 HISTÓRICO / ARCHIVADOS">
              {(listaInvernaderos || []).filter(i => i.activo === false).map(i => (
                <option key={i.id} value={i.id}>{i.nombre?.toUpperCase()} (ARCHIVADO)</option>
              ))}
            </optgroup>
          </select>
        </div>

        {invSeleccionado ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-[#117097] p-2 text-white font-black text-[10px] uppercase tracking-wider flex justify-between items-center px-3">
                <span>Remisiones</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black tracking-tight">{formatoPesos(totalRemisiones)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <tbody className="divide-y">
                    {despachosInv.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold uppercase">#{d.numero_remision}</td>
                        <td className="p-2 text-right font-black text-[#117097]">{formatoPesos(d.total_venta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-amber-500 p-2 text-white font-black text-[10px] uppercase tracking-wider flex justify-between items-center px-3">
                <span>Abonos</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black tracking-tight">{formatoPesos(totalAbonos)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <tbody className="divide-y">
                    {pagosInv.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold uppercase">#{p.ventas?.numero_remision}</td>
                        <td className="p-2 text-right font-black text-amber-600">{formatoPesos(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-slate-400 p-2 text-white font-black text-[10px] uppercase tracking-wider flex justify-between items-center px-3">
                <span>Gastos Insumos</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black tracking-tight">{formatoPesos(totalGastosInsumos)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <tbody className="divide-y">
                    {gastosInv.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold uppercase truncate max-w-[80px]">{g.descripcion}</td>
                        <td className="p-2 text-right font-black text-slate-600">{formatoPesos(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="bg-sky-700 p-2 text-white font-black text-[10px] uppercase tracking-wider flex justify-between items-center px-3">
                <span>Mano de Obra</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black tracking-tight">{formatoPesos(totalManoObra)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[10px]">
                  <tbody className="divide-y">
                    {nominaInv.map(n => (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="p-2 uppercase truncate max-w-[80px]">
                          <span className="font-black text-slate-700 block truncate">{n.invernadero_nombre || 'GENERAL'}</span>
                        </td>
                        <td className="p-2 text-right font-black text-sky-800 whitespace-nowrap">{formatoPesos(n.monto_pagado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Seleccione un lote para auditar detalles</p>
          </div>
        )}
      </div>

      {/* BALANCE NETO REAL */}
      <div className={`p-4 rounded-2xl shadow-md border flex items-center justify-between gap-4 transition-all ${utilidadRealGlobal >= 0 ? 'bg-[#0f4c68] border-[#117097] text-white' : 'bg-rose-950 border-rose-700 text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl text-xl backdrop-blur-sm shadow-inner">
            {utilidadRealGlobal >= 0 ? '💰' : '⚠️'}
          </div>
          <div>
            <h4 className="font-black uppercase text-xs tracking-wide">Balance de Operación Neto Real (En Producción)</h4>
            <p className="text-[9px] font-bold text-sky-200 uppercase italic">Ingresos deduciendo Insumos y Mano de Obra Liquidada</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tracking-tight">
            {formatoPesos(utilidadRealGlobal)}
          </p>
        </div>
      </div>

    </div>
  );
}