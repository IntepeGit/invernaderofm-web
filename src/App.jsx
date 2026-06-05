import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable' // Importación explícita sin punto y coma

// Importaciones de componentes
import Login from './pages/Login.jsx'
import Despachos from './pages/Despachos.jsx' 
import Gastos from './pages/Gastos.jsx'
import Pagos from './pages/Pagos.jsx' 
import ConfigInv from './pages/ConfigInv.jsx'
import ConfigCli from './pages/ConfigCli.jsx'
import ConfigProv from './pages/ConfigProv.jsx'
import ReporteVentas from './pages/ReporteVentas.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventario from './pages/Inventario.jsx'
import Cosecha from './pages/Cosecha.jsx'
import ConfigCosecha from './pages/ConfigCosecha.jsx'
import Nomina from './pages/Nomina.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfigSubmenu, setShowConfigSubmenu] = useState(false)
  
  // Estados de datos consolidado
  const [datosDespachos, setDatosDespachos] = useState([]) 
  const [datosEgresos, setDatosEgresos] = useState([])
  const [datosPagos, setDatosPagos] = useState([]) 
  const [listaInvernaderos, setListaInvernaderos] = useState([])
  const [listaClientes, setListaClientes] = useState([])
  const [listaProveedores, setListaProveedores] = useState([])
  const [balancesGrafica, setBalancesGrafica] = useState([])
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  // Manejo de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const mostrarAlerta = (msj, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje: msj, tipo });
    setTimeout(() => setNotificacion(prev => ({ ...prev, visible: false })), 3000);
  };

  // ESTADOS DE FORMULARIOS
  const [despachoForm, setDespachoForm] = useState({ 
    numero_remision: '', 
    cliente_id: '', 
    invernadero_id: '', 
    fecha_venta: new Date().toISOString().split('T')[0], 
    filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] 
  })
  //const [gastoForm, setGastoForm] = useState({ descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  //const [gastoForm, setGastoForm] = useState({ id_editando: null, descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] })
  const [gastoForm, setGastoForm] = useState({ id_editando: null, descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0], cantidad: '', precio_unitario: '', unidad_medida: 'Unidad' })
  //const [invForm, setInvForm] = useState({ nombre: '', cultivo: '', variedad: '', largo: '', ancho: '', siembra: '', cosecha: '', estado: 'Activo', descripcion: '' })
  const [invForm, setInvForm] = useState({id_editando: null, nombre: '', cultivo: '', variedad: '', largo: '', ancho: '', siembra: '', cosecha: '', estado: 'Activo', descripcion: ''})
  //const [cliForm, setCliForm] = useState({ nombre: '',                    nit: '', tel: '', dir: '', ciudad: '', nota: '', email: '' })
  const [cliForm, setCliForm] = useState({ id_editando: null, nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '', email: '' })
  const [provForm, setProvForm] = useState({ nombre: '', nit: '', tel: '', dir: '', ciudad: '', nota: '' })
  const [pagoForm, setPagoForm] = useState({ id_editando: null, cliente_id: '', venta_id: '', monto: '', metodo_pago: 'Efectivo', fecha_pago: new Date().toISOString().split('T')[0], nota: '' })
  
// PEGAR AQUÍ (Línea 118 aprox.)
const eliminarGasto = async (id) => {
  if (window.confirm("¿Está seguro de eliminar este gasto?")) {
    const { error } = await supabase.from('egresos').delete().eq('id', id);
    if (!error) { mostrarAlerta("Gasto eliminado"); cargarTodo(); }
  }
};

const prepararEdicionGasto = (g) => {
  setGastoForm({
    id_editando: g.id,
    descripcion: g.descripcion,
    categoria: g.categoria,
    monto: g.monto,
    invernadero_id: g.invernadero_id,
    proveedor_id: g.proveedor_id,
    numero_comprobante: g.numero_comprobante || '',
    nota: g.nota || '',
    fecha: g.fecha_gasto || g.fecha
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const guardarGasto = async (e) => {
  e.preventDefault();
  const payload = {
    descripcion: gastoForm.descripcion,
    categoria: gastoForm.categoria,
    monto: parseFloat(gastoForm.monto),
    invernadero_id: gastoForm.invernadero_id,
    proveedor_id: gastoForm.proveedor_id,
    numero_comprobante: gastoForm.numero_comprobante,
    nota: gastoForm.nota,
    fecha_gasto: gastoForm.fecha
  };
  if (gastoForm.id_editando) {
    await supabase.from('egresos').update(payload).eq('id', gastoForm.id_editando);
  } else {
    await supabase.from('egresos').insert([payload]);
  }
  mostrarAlerta(gastoForm.id_editando ? "Gasto actualizado" : "Gasto guardado");
  setGastoForm({ id_editando: null, descripcion: '', categoria: 'Mano de obra', monto: '', invernadero_id: '', proveedor_id: '', numero_comprobante: '', nota: '', fecha: new Date().toISOString().split('T')[0] });
  cargarTodo();
};

const eliminarPago = async (id) => {
  if (window.confirm("¿Está seguro de eliminar este pago?")) {
    const { error } = await supabase.from('pagos').delete().eq('id', id);
    if (!error) { mostrarAlerta("Pago eliminado"); cargarTodo(); }
  }
};

const prepararEdicionPago = (pago) => {
  setPagoForm({
    id_editando: pago.id,
    cliente_id: pago.cliente_id,
    despacho_id: pago.despacho_id, // <--- Asegúrate que diga despacho_id
    monto: pago.monto,
    fecha_pago: pago.fecha_pago,
    referencia: pago.referencia || '' // <--- Asegúrate que diga referencia
  });
  // Esto sube la pantalla suavemente al formulario
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const guardarPago = async (e) => {
  if (e && e.preventDefault) e.preventDefault();

  const payload = {
    cliente_id: pagoForm.cliente_id,
    despacho_id: pagoForm.despacho_id, 
    monto: parseFloat(pagoForm.monto),
    fecha_pago: pagoForm.fecha_pago,
    referencia: pagoForm.referencia 
  };

  try {
    if (pagoForm.id_editando) {
      // MODO EDICIÓN: Actualiza el abono existente
      await supabase.from('pagos').update(payload).eq('id', pagoForm.id_editando);
    } else {
      // MODO NUEVO: Inserta un nuevo abono
      await supabase.from('pagos').insert([payload]);
    }

    mostrarAlerta(pagoForm.id_editando ? "Abono actualizado correctamente" : "Abono guardado");

    // REESTABLECIMIENTO INTELIGENTE:
    // Usamos el operador spread (...pagoForm) para mantener el cliente y la remisión seleccionados.
    // Esto evita que la ficha técnica se cierre.
    setPagoForm({ 
      ...pagoForm,           
      id_editando: null,     // El botón volverá a ser verde ("Registrar")
      monto: '',             // Limpia el monto para un nuevo abono
      referencia: ''         // Limpia la nota
    });

    cargarTodo();
  } catch (error) {
    mostrarAlerta("Error: " + error.message, "error");
  }
}; // <-- Esta llave cierra la función guardarPago

const prepararEdicionDespacho = async (venta) => {
  try {
    // 1. Buscamos los productos detallados de esa remisión
    const { data: detalles, error } = await supabase
      .from('detalle_ventas')
      .select('*')
      .eq('venta_id', venta.id);

    if (error) throw error;

    // 2. Llenamos el estado del formulario con la info de la DB
    setDespachoForm({
      id_editando: venta.id,
      numero_remision: venta.numero_remision,
      cliente_id: venta.cliente_id,
      invernadero_id: venta.invernadero_id,
      fecha_venta: venta.fecha_venta,
      // Convertimos los detalles de la DB al formato que entiende tu tabla de filas
      filas: detalles.map(d => ({
        producto: d.descripcion,
        escala: d.escala,
        cantidad: d.cantidad,
        precio: d.precio_unitario
      }))
    });
    
    // 3. Opcional: mover el scroll al inicio para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (error) {
    mostrarAlerta("Error al cargar la remisión: " + error.message, "error");
  }
};



// DESPUÉS DE ESTO DEBE SEGUIR: async function cargarTodo() { ...
  async function cargarTodo() {
  if (!session) return;
  
  // Consultas principales a Supabase
  const { data: v, error: ev } = await supabase.from('ventas').select('*, clientes(*), invernaderos(*), detalle_ventas(*)').order('fecha_venta', { ascending: false });
  const { data: egresosData, error: egresosError } = await supabase.from('egresos').select('*, invernaderos(*), proveedores(*)').order('fecha_gasto', { ascending: false });
  const { data: e } = await supabase.from('egresos').select('*, invernaderos(*), proveedores(*)');
  
  // TRAEMOS TODOS (Sin filtros en la Query para que ConfigInv pueda ver los inactivos)
  const { data: i } = await supabase.from('invernaderos').select('*');  

  const { data: c } = await supabase.from('clientes').select('*');
  const { data: p } = await supabase.from('proveedores').select('*');
  const { data: pagos } = await supabase.from('pagos').select('*, clientes(nombre_completo), ventas(numero_remision)');

  // === SEPARACIÓN DE LOGICA ===
  // Filtramos localmente los que van a usar Despachos, Gastos y las Gráficas
  const invernaderosActivos = i?.filter(inv => inv.activo !== false) || [];

  // Inyección en los estados de React
  setDatosDespachos(v || []);
  setDatosEgresos(e || []);
  setDatosPagos(pagos || []);
  
  // CRUCIAL: Pasamos la lista COMPLETA para que ConfigInv los muestre todos
  setListaInvernaderos(i || []); 
  
  setListaClientes(c || []);
  setListaProveedores(p || []);

  // El Dashboard (Gráficas) se calcula ÚNICAMENTE con los invernaderos activos
  const resumen = invernaderosActivos.map(inv => {
    const egr = e?.filter(x => x.invernadero_id === inv.id).reduce((s, x) => s + (x.monto || 0), 0) || 0;
    const ventasInv = v?.filter(x => x.invernadero_id === inv.id) || [];
    const ing = ventasInv.reduce((s, x) => s + (x.total_venta || 0), 0);
    
    const idsVentas = ventasInv.map(venta => venta.id);
    const pagosVentas = pagos?.filter(p => idsVentas.includes(p.despacho_id)) || [];
    const recaudado = pagosVentas.reduce((s, p) => s + (p.monto || 0), 0);
    const carteraPendiente = ing - recaudado;

    return { 
      name: inv.nombre, 
      Ingresos: ing, 
      Gastos: egr, 
      Utilidad: ing - egr,
      Cartera: carteraPendiente > 0 ? carteraPendiente : 0
    };
  });
  setBalancesGrafica(resumen || []);
}  

  // Validar duplicado en tiempo real mientras el usuario escribe
useEffect(() => {
  const validarRemisionEnVivo = async () => {
    // Solo validamos si hay un número escrito y NO estamos editando
    if (despachoForm.numero_remision && !despachoForm.id_editando && tab === 'despachos') {
      const { data, error } = await supabase
        .from('ventas')
        .select('numero_remision')
        .eq('numero_remision', despachoForm.numero_remision.trim())
        .maybeSingle();

      if (data) {
        // Guardamos el estado de error en el formulario (necesitas añadir este campo al estado inicial)
        setDespachoForm(prev => ({ ...prev, errorDuplicado: true }));
      } else {
        setDespachoForm(prev => ({ ...prev, errorDuplicado: false }));
      }
    } else {
      setDespachoForm(prev => ({ ...prev, errorDuplicado: false }));
    }
  };

  // Usamos un pequeño delay (debounce) para no saturar la base de datos mientras escribes
  const timeoutId = setTimeout(validarRemisionEnVivo, 500);
  return () => clearTimeout(timeoutId);
}, [despachoForm.numero_remision, tab]);

  useEffect(() => { if (session) cargarTodo() }, [session]);

  // --- LÓGICA DE CONSECUTIVO AUTOMÁTICO ---
  // --- LÓGICA DE CONSECUTIVO AUTOMÁTICO ---
  useEffect(() => {
    // Solo sugerimos número si estamos en la pestaña de despachos, NO estamos editando y hay datos
    if (tab === 'despachos' && !despachoForm.id_editando && datosDespachos.length > 0) {
      
      // 1. Extraemos todos los números de remisión actuales y los convertimos a números enteros
      const numeros = datosDespachos
        .map(d => parseInt(d.numero_remision))
        .filter(n => !isNaN(n)); // Ignoramos si hay textos o campos vacíos
      
      // 2. Buscamos el mayor número registrado
      const ultimoNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
      
      // 3. Si el campo del formulario está vacío, le sugerimos el siguiente (último + 1)
      if (!despachoForm.numero_remision) {
        setDespachoForm(prev => ({ 
          ...prev, 
          numero_remision: (ultimoNumero + 1).toString() 
        }));
      }
    }
  }, [tab, datosDespachos, despachoForm.id_editando]);

  const actualizarFilaDespacho = (index, campo, valor) => {
    const nuevasFilas = [...despachoForm.filas]
    nuevasFilas[index][campo] = valor
    setDespachoForm({ ...despachoForm, filas: nuevasFilas })
  }

 const guardarDespachoCompleto = async (e) => {
  if (e && e.preventDefault) e.preventDefault();
  
  try {
    const numRemision = despachoForm.numero_remision.trim();

    // --- 1. BLOQUEO DE DUPLICADOS (Solo para registros nuevos) ---
    if (!despachoForm.id_editando) {
      // Buscamos si ese número YA está en la tabla de ventas de Supabase
      const { data: existe, error: errorCheck } = await supabase
        .from('ventas')
        .select('numero_remision')
        .eq('numero_remision', numRemision);

      // Si la base de datos devuelve algo, es porque ya se usó ese número
      if (existe && existe.length > 0) {
        mostrarAlerta(`⚠️ ERROR: La remisión N° ${numRemision} ya existe en el historial.`, "error");
        return; // IMPORTANTE: Este 'return' detiene todo y evita que se guarde.
      }
    }

    // --- 2. CÁLCULO DEL TOTAL ---
    const totalVentaCalculado = despachoForm.filas.reduce((acc, f) => 
      acc + (parseFloat(f.cantidad || 0) * parseFloat(f.precio || 0)), 0);

    const datosVenta = {
      numero_remision: numRemision,
      cliente_id: despachoForm.cliente_id,
      invernadero_id: despachoForm.invernadero_id,
      total_venta: totalVentaCalculado, 
      fecha_venta: despachoForm.fecha_venta
    };

    let ventaId = despachoForm.id_editando;

    // --- 3. PROCESO DE GUARDADO (Cabecera) ---
    if (ventaId) {
      // Modo Edición
      const { error: vError } = await supabase.from('ventas').update(datosVenta).eq('id', ventaId);
      if (vError) throw vError;
      await supabase.from('detalle_ventas').delete().eq('venta_id', ventaId);
    } else {
      // Modo Nuevo
      const { data: nuevaVenta, error: vError } = await supabase.from('ventas')
        .insert([datosVenta]).select().single();
      if (vError) throw vError;
      ventaId = nuevaVenta.id;
    }

    // --- 4. INSERTAR PRODUCTOS ---
    const detalles = despachoForm.filas.map(f => ({
      venta_id: ventaId,
      descripcion: f.producto,
      escala: f.escala,
      cantidad: parseFloat(f.cantidad || 0),
      precio_unitario: parseFloat(f.precio || 0)
    }));

    const { error: dError } = await supabase.from('detalle_ventas').insert(detalles);
    if (dError) throw dError;

    mostrarAlerta(despachoForm.id_editando ? "Remisión actualizada" : "Despacho guardado con éxito");
    
    // --- 5. LIMPIEZA Y RESET ---
    setDespachoForm({ 
      id_editando: null, 
      numero_remision: '', // Esto dispara el consecutivo automático
      cliente_id: '', 
      invernadero_id: '', 
      fecha_venta: new Date().toISOString().split('T')[0], 
      filas: [{ producto: '', escala: '', cantidad: '', precio: '' }] 
    });
    
    await cargarTodo();

  } catch (error) {
    mostrarAlerta("Error técnico: " + error.message, "error");
  }
};
//=======


  // Función para ELIMINAR
const eliminarDespacho = async (id) => {
  if (window.confirm("¿Está seguro de eliminar esta remisión?")) {
    // 1. Borramos los detalles primero (por seguridad de la base de datos)
    await supabase.from('detalle_ventas').delete().eq('venta_id', id);
    // 2. Borramos la venta principal
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    
    if (!error) {
      mostrarAlerta("Remisión eliminada correctamente");
      cargarTodo(); // Refresca la tabla
    }
  }
};

// --- FUNCIÓN DE IMPRESIÓN DE DESPACHOS  ---
const imprimirPDF = (remision) => {
    try {
      const detalles = remision.detalle_ventas || [];
      if (detalles.length === 0) {
        mostrarAlerta("Esta remisión no tiene productos registrados", "error");
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 148] // Tamaño A6
      });

      // --- 1. MARCO EXTERNO VERDE ---
      doc.setDrawColor(0, 80, 0); 
      doc.setLineWidth(0.8);
      doc.rect(4, 4, 97, 140); 

      // --- 2. LOGO ---
      const logoUrl = '/Logopapel.png';
      doc.addImage(logoUrl, 'PNG', 42.5, 7, 20, 20); 

      // --- 3. N° REMISIÓN ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text("N° Remisión:", 10, 12);
      doc.setFont("helvetica", "normal");
      doc.text(`${remision.numero_remision || 'N/A'}`, 32, 12);

      // --- 4. TÍTULO ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 80, 0);
      doc.text("REMISIÓN DE VENTA", 52.5, 30, { align: "center" });

      // --- 5. BLOQUE DE DATOS CON CEBRA VERDE FUERTE Y CENTRADO ---
      doc.setTextColor(0);
      doc.setFontSize(8);
      
      const xCol1 = 10, xVal1 = 32, xCol2 = 52, xVal2 = 68;
      
      // Definimos la altura de cada fila y el inicio
      const altoFila = 5;
      const yBase = 32.5;

      // Dibujar Fondos Cebra (Fila 1 y 3) con un verde más vivo
      doc.setFillColor(180, 220, 180); 
      doc.rect(7, yBase, 91, altoFila, 'F'); // Fondo Fila 1
      doc.rect(7, yBase + (altoFila * 2), 91, altoFila, 'F'); // Fondo Fila 3

      // Marco y líneas de la cuadrícula
      doc.setDrawColor(0, 80, 0);
      doc.setLineWidth(0.2);
      doc.rect(7, yBase, 91, altoFila * 4); // Cuadro total de datos (4 filas)
      doc.line(7, yBase + altoFila, 98, yBase + altoFila); // Línea horiz 1
      doc.line(7, yBase + (altoFila * 2), 98, yBase + (altoFila * 2)); // Línea horiz 2
      doc.line(7, yBase + (altoFila * 3), 98, yBase + (altoFila * 3)); // Línea horiz 3
      doc.line(50, yBase, 50, yBase + (altoFila * 4)); // Línea vertical central

      // Función auxiliar para centrar texto verticalmente en la fila
      // Sumamos 3.5mm a la base de la fila para que el texto de 8pt quede centrado
      const yOffset = 3.5; 

      // Fila 1: Fecha y Ciudad
      doc.setFont("helvetica", "bold"); doc.text("Fecha:", xCol1, yBase + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.fecha_venta || ''}`, xVal1, yBase + yOffset);
      doc.setFont("helvetica", "bold"); doc.text("Ciudad:", xCol2, yBase + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.clientes?.ciudad || 'N/A'}`, xVal2, yBase + yOffset);

      // Fila 2: Invernadero y Celular
      doc.setFont("helvetica", "bold"); doc.text("Invernadero:", xCol1, yBase + altoFila + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.invernaderos?.nombre || 'N/A'}`, xVal1, yBase + altoFila + yOffset);
      doc.setFont("helvetica", "bold"); doc.text("Celular:", xCol2, yBase + altoFila + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.clientes?.telefono || 'N/A'}`, xVal2, yBase + altoFila + yOffset);

      // Fila 3: Cliente y Correo
      doc.setFont("helvetica", "bold"); doc.text("Cliente:", xCol1, yBase + (altoFila * 2) + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.clientes?.nombre_completo || 'N/A'}`, xVal1, yBase + (altoFila * 2) + yOffset);
      doc.setFont("helvetica", "bold"); doc.text("Correo:", xCol2, yBase + (altoFila * 2) + yOffset);
      doc.setFontSize(5.5); // Correo pequeño para que no se salga
      doc.setFont("helvetica", "normal"); doc.text(`${remision.clientes?.email || 'N/A'}`, xVal2, yBase + (altoFila * 2) + yOffset);

      // Fila 4: NIT/CC
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold"); doc.text("NIT/CC:", xCol1, yBase + (altoFila * 3) + yOffset);
      doc.setFont("helvetica", "normal"); doc.text(`${remision.clientes?.nit || 'N/A'}`, xVal1, yBase + (altoFila * 3) + yOffset);
      
      // --- 6. TABLA DE PRODUCTOS ---
      autoTable(doc, {
        startY: 56,
        head: [["Cant", "Producto", "Precio", "Total"]],
        body: detalles.map(item => [
          item.cantidad || 0,
          item.descripcion || 'Sin descripción',
          new Intl.NumberFormat('es-CO').format(item.precio_unitario || 0),
          new Intl.NumberFormat('es-CO').format((item.cantidad || 0) * (item.precio_unitario || 0))
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.2, fontStyle: 'bold' },
        headStyles: { fillColor: [0, 80, 0], textColor: [255, 255, 255] }
      });

      // --- 7. TOTAL ---
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL A PAGAR: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(remision.total_venta || 0)}`, 95, finalY, { align: "right" });

      doc.save(`Remision_${remision.numero_remision}.pdf`);

    } catch (err) {
      console.error("Error al generar PDF:", err);
    }
  };
//=====HASTA AQUI PDF DE DESPACHOS================

// --- DESDE AQUI FUNCIÓN DE IMPRESIÓN DE GASTOS  ---
const imprimirGastoPDF = (gasto) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148] // Tamaño A6
    });

    // --- 1. MARCO EXTERNO VERDE ---
    doc.setDrawColor(0, 80, 0);
    doc.setLineWidth(0.8);
    doc.rect(4, 4, 97, 140);

    // --- 2. LOGO ---
    const logoUrl = '/Logopapel.png';
    doc.addImage(logoUrl, 'PNG', 42.5, 7, 20, 20);

    // --- 3. N° COMPROBANTE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("Comp. N°:", 10, 12);
    doc.setFont("helvetica", "normal");
    doc.text(`${gasto.numero_comprobante || gasto.id || 'S/N'}`, 28, 12);

    // --- 4. TÍTULO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 80, 0);
    doc.text("COMPROBANTE DE GASTO", 52.5, 30, { align: "center" });

    // --- 5. CUADRÍCULA DE DATOS BÁSICOS (FILA 1 Y 2) ---
    doc.setTextColor(0);
    doc.setFontSize(8);
    const altoFila = 5;
    const yBase = 35;

    // Fila 1: Fondo Cebra
    doc.setFillColor(180, 220, 180); 
    doc.rect(7, yBase, 91, altoFila, 'F'); 

    doc.setDrawColor(0, 80, 0);
    doc.setLineWidth(0.2);
    doc.rect(7, yBase, 91, altoFila * 2); 
    doc.line(7, yBase + altoFila, 98, yBase + altoFila); 
    doc.line(50, yBase, 50, yBase + (altoFila * 2)); 

    const yOffset = 3.5; 

    // Fila 1: Fecha e Invernadero
    doc.setFont("helvetica", "bold"); doc.text("Fecha:", 10, yBase + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${gasto.fecha_gasto || ''}`, 25, yBase + yOffset);
    doc.setFont("helvetica", "bold"); doc.text("Invernadero:", 52, yBase + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${gasto.invernaderos?.nombre || 'Gral'}`, 72, yBase + yOffset);

    // Fila 2: Nombre del Proveedor (Búsqueda exhaustiva del nombre)
    const nombreProv = gasto.nombre_proveedor || gasto.proveedores?.nombre_completo || gasto.proveedores?.nombre || 'Particular';
    doc.setFont("helvetica", "bold"); doc.text("Proveedor:", 10, yBase + altoFila + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${nombreProv}`, 27, yBase + altoFila + yOffset);

    // --- 6. BLOQUE CEBRA: DETALLES PROVEEDOR Y NOTA ---
    let yDetalles = yBase + (altoFila * 2);
    
    // Fila 3: Fondo Cebra para Detalles
    doc.setFillColor(180, 220, 180);
    doc.rect(7, yDetalles, 91, altoFila, 'F');
    
    // Bordes del bloque
    doc.rect(7, yDetalles, 91, altoFila * 2); 
    doc.line(7, yDetalles + altoFila, 98, yDetalles + altoFila);

    // Mapeo de datos desde el objeto (según tus imágenes de la base de datos)
    const nit = gasto.nit_cc || gasto.proveedores?.nit_cc || 'N/A';
    const tel = gasto.telefono_proveedor || gasto.proveedores?.telefono || 'N/A';
    const ciudad = gasto.ciudad_proveedor || gasto.proveedores?.ciudad || 'N/A';

    // Texto Fila 3: Detalles (NIT, TEL, CIUDAD)
    doc.setFont("helvetica", "bold"); doc.text("NIT/CC:", 10, yDetalles + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${nit}`, 22, yDetalles + yOffset);
    doc.setFont("helvetica", "bold"); doc.text("TEL:", 45, yDetalles + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${tel}`, 54, yDetalles + yOffset);
    doc.setFont("helvetica", "bold"); doc.text("CIUDAD:", 72, yDetalles + yOffset);
    doc.setFont("helvetica", "normal"); doc.text(`${ciudad}`, 86, yDetalles + yOffset);

    // Texto Fila 4: Nota (Dentro de la cuadrícula)
    doc.setFont("helvetica", "bold"); doc.text("NOTA:", 10, yDetalles + altoFila + yOffset);
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(7);
    doc.text(`${gasto.nota || 'Sin observaciones'}`, 20, yDetalles + altoFila + yOffset);

    // --- 7. TABLA DE VALORES ---
    doc.setFontSize(8);
    autoTable(doc, {
      startY: yDetalles + (altoFila * 2) + 4,
      margin: { left: 7, right: 1 }, 
      head: [["Cant.", "Unidad", "Detalle del Pago", "Precio Unit.", "Monto Total"]],
      body: [[
        gasto.cantidad || 0,
        gasto.unidad_medida || "Unidad",
        gasto.descripcion || "Pago de gasto",
        `$${(gasto.precio_unitario || 0).toLocaleString('es-CO')}`,
        `$${(gasto.monto || 0).toLocaleString('es-CO')}`
      ]],
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 3,       
        valign: 'middle',    
        overflow: 'linebreak',
        lineWidth: 0.2,      
        lineColor: [0, 80, 0] 
      },
      headStyles: { 
        fillColor: [0, 80, 0], 
        textColor: [255, 255, 255],
        halign: 'center',    
        valign: 'middle',
        fontStyle: 'bold',
        cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, 
        minCellHeight: 4      
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center', valign: 'middle' },
        1: { cellWidth: 14, halign: 'center', valign: 'middle' },
        2: { cellWidth: 35, halign: 'left', valign: 'middle' },
        3: { cellWidth: 15, halign: 'right', valign: 'middle' },
        4: { cellWidth: 19, halign: 'right', valign: 'middle' }
      }
    });

    // --- 8. TOTAL Y FIRMAS ---
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`VALOR PAGADO: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(gasto.monto || 0)}`, 95, finalY, { align: "right" });

    const yFirmas = finalY + 15;
    doc.setDrawColor(0);
    doc.line(10, yFirmas, 45, yFirmas);
    doc.line(60, yFirmas, 95, yFirmas);
    doc.setFontSize(7);
    doc.text("ENTREGUÉ CONFORME", 15, yFirmas + 4);
    doc.text("RECIBÍ CONFORME", 68, yFirmas + 4);

    doc.save(`Gasto_${gasto.numero_comprobante || gasto.id}.pdf`);

  } catch (err) {
    console.error("Error al generar PDF:", err);
  }
};
//=====HASTA AQUI PDF DE GASTOS================

// Función para EDITAR (Carga los datos arriba para corregir)
const prepararEdicion = (despacho) => {
  setDespachoForm({
    id_editando: despacho.id, // Guardamos el ID para saber que vamos a actualizar este
    numero_remision: despacho.numero_remision,
    cliente_id: despacho.cliente_id,
    invernadero_id: despacho.invernadero_id,
    fecha_venta: despacho.fecha_venta,
    filas: despacho.detalle_ventas.map(d => ({
      producto: d.descripcion,
      escala: d.escala,
      cantidad: d.cantidad,
      precio: d.precio_unitario
    }))
  });
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al formulario automáticamente
};

  // --- NUEVA FUNCIÓN DE IMPRESIÓN ---
// --- COPIAR ESTA FUNCIÓN DENTRO 4-6 DE App.jsx ---


  const NavItem = ({ id, label, icon }) => (
    <button onClick={() => { setTab(id); setIsMenuOpen(false); setShowConfigSubmenu(false); }} 
      className={`flex items-center gap-3 w-full p-4 rounded-xl transition ${tab === id ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-800'}`}>
      <span className="text-xl">{icon}</span> <span className="font-bold text-sm capitalize">{label}</span>
    </button>
  )

  if (!session) return <Login setSession={setSession} />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-900 shadow-2xl transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static transition-transform duration-300 flex flex-col`}>
        <div className="p-8 text-center border-b border-green-800">
          <h2 className="text-white font-black text-2xl tracking-tighter">🚜 GRANJA WP</h2>
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <NavItem id="dashboard" label="Dashboard" icon="📊" />
          <NavItem id="despachos" label="Despachos" icon="🚛" />
          <NavItem id="pagos" label="Pagos / Caja" icon="💳" />
          <NavItem id="gastos" label="Gastos" icon="📉" />
          <NavItem id="reporte" label="Reporte de Ventas" icon="📈" />
          
          {/* === BOTÓN AGREGADO USANDO TU COMPONENTE NAVITEM === */}
          <NavItem id="inventario" label="Inventario Bodega" icon="📦" />
          <NavItem id="cosecha" label="Cosecha Diaria" icon="🚜" />
          <NavItem id="nomina" label="Nómina / Mano Obra" icon="👥" />
          
          <div className="space-y-1">
            <button onClick={() => setShowConfigSubmenu(!showConfigSubmenu)} 
              className={`flex items-center justify-between w-full p-4 rounded-xl transition ${tab.startsWith('config-') ? 'bg-green-800 text-white' : 'text-green-100 hover:bg-green-800'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <span className="font-bold text-sm">Configuración</span>
              </div>
              <span className="text-xs">{showConfigSubmenu ? '▲' : '▼'}</span>
            </button>
            {showConfigSubmenu && (
              <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <button onClick={() => { setTab('config-inv'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-inv' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>🏠 Invernaderos</button>
                <button onClick={() => { setTab('config-cli'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-cli' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>👥 Clientes</button>
                <button onClick={() => { setTab('config-prov'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-prov' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>🚚 Proveedores</button>
                <button onClick={() => { setTab('config-cosecha'); setIsMenuOpen(false); }} className={`flex items-center gap-3 w-full p-3 rounded-lg text-xs font-bold transition ${tab === 'config-cosecha' ? 'text-white bg-green-700' : 'text-green-300 hover:bg-green-800'}`}>🌿 Parámetros Cosecha</button>
              </div>
            )}
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 w-full p-4 rounded-xl text-red-200 hover:bg-red-900/50 mt-10">
            <span>🚪</span> <span className="text-sm font-bold">Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white p-4 shadow-sm flex justify-between items-center lg:px-10">
          <button className="lg:hidden text-2xl p-2 text-green-900" onClick={() => setIsMenuOpen(true)}>☰</button>
          <h1 className="text-xl font-black text-green-900 tracking-tight uppercase">{tab.replace('config-', 'Configuración: ').replace('reporte', 'Reporte de Ventas').replace('inventario', 'Inventario de Bodega').replace('cosecha', 'Cosecha Diaria').replace('nomina', 'Control de Nómina')}</h1>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10">
        
          {tab === 'dashboard' && (
            <Dashboard 
              listaInvernaderos={listaInvernaderos}
              datosDespachos={datosDespachos}
              datosEgresos={datosEgresos}
              datosPagos={datosPagos}
              balancesGrafica={balancesGrafica}
            />
          )}

          {tab === 'despachos' && (
            <Despachos 
              despachoForm={despachoForm}
              setDespachoForm={setDespachoForm} 
              listaClientes={listaClientes}
              //listaInvernaderos={listaInvernaderos} 
              listaInvernaderos={listaInvernaderos.filter(inv => inv.activo !== false)}
              actualizarFilaDespacho={actualizarFilaDespacho}
              guardarDespachoCompleto={guardarDespachoCompleto} 
              datosDespachos={datosDespachos} 
              datosPagos={datosPagos} 
              mostrarAlerta={mostrarAlerta} 
              guardarDespacho={guardarDespachoCompleto}
              eliminarDespacho={eliminarDespacho} 
              prepararEdicion={prepararEdicion}
              prepararEdicionDespacho={prepararEdicionDespacho}
              imprimirPDF={imprimirPDF}
              cargarTodo={cargarTodo}
              supabase={supabase}
            />
          )}

          {tab === 'pagos' && (
            <Pagos 
              listaClientes={listaClientes} 
              datosDespachos={datosDespachos} 
              guardarPago={guardarPago} 
              datosPagos={datosPagos} 
              mostrarAlerta={mostrarAlerta} 
              pagoForm={pagoForm}
              setPagoForm={setPagoForm}
              cargarTodo={cargarTodo} 
              prepararEdicionPago={prepararEdicionPago}
              eliminarPago={eliminarPago}
            />
          )}
                    
          {tab === 'gastos' && (
            <Gastos 
              gastoForm={gastoForm}
              setGastoForm={setGastoForm} 
              //listaInvernaderos={listaInvernaderos}
              listaInvernaderos={listaInvernaderos.filter(inv => inv.activo !== false)}
              listaProveedores={listaProveedores} 
              mostrarAlerta={mostrarAlerta}
              cargarTodo={cargarTodo} 
              supabase={supabase}
              datosEgresos={datosEgresos}
              guardarGasto={guardarGasto}
              prepararEdicionGasto={prepararEdicionGasto}
              eliminarGasto={eliminarGasto}
              imprimirGastoPDF={imprimirGastoPDF}
            />
          )}  

          {tab === 'reporte' && (
  <ReporteVentas 
    listaInvernaderos={listaInvernaderos}
    datosDespachos={datosDespachos}
    datosEgresos={datosEgresos}
    datosPagos={datosPagos}
    balancesGrafica={balancesGrafica} // 🌟 LE PASAMOS LOS BALANCES PROCESADOS DEL DASHBOARD
  />
)}

          {/* === COMPONENTE CENTRAL DE INVENTARIO CONECTADO === */}
          {tab === 'inventario' && (
            <Inventario 
              mostrarAlerta={mostrarAlerta}
              datosInvernaderos={listaInvernaderos}
            />
          )}

          {/* === COMPONENTE CENTRAL DE COSECHA CONECTADO === */}
          {tab === 'cosecha' && (
            <Cosecha 
              mostrarAlerta={mostrarAlerta}
              listaInvernaderos={listaInvernaderos}
            />
          )}

          {/* === COMPONENTE CENTRAL DE NÓMINA CONECTADO === */}
          {tab === 'nomina' && (
            <Nomina 
              mostrarAlerta={mostrarAlerta}
              listaInvernaderos={listaInvernaderos}
            />
          )}

          {tab === 'config-inv' && <ConfigInv invForm={invForm} setInvForm={setInvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaInvernaderos} />}
          {tab === 'config-cli' && <ConfigCli cliForm={cliForm} setCliForm={setCliForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaClientes} />}
          {tab === 'config-prov' && <ConfigProv provForm={provForm} setProvForm={setProvForm} mostrarAlerta={mostrarAlerta} cargarTodo={cargarTodo} supabase={supabase} lista={listaProveedores} />}
        
          {/* === RENDERIZADO DEL COMPONENTE CONFIGCOSECHA === */}
          {tab === 'config-cosecha' && (
            <ConfigCosecha 
              mostrarAlerta={mostrarAlerta} 
            />
          )}
        
        </main>
      </div>

      {notificacion.visible && (
        <div className="fixed bottom-10 right-10 z-[100] bg-white border border-green-100 p-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="text-2xl">{notificacion.tipo === 'exito' ? '✅' : '❌'}</span>
          <p className="text-sm font-bold text-green-800">{notificacion.mensaje}</p>
        </div>
      )}
    </div>
  )
}

export default App;