import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function Dashboard({ balancesGrafica }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <h3 className="font-black text-gray-400 text-[10px] mb-8 uppercase tracking-widest text-center">Balance por Invernadero</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={balancesGrafica}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={10} fontWeight="bold" />
            <YAxis fontSize={10} />
            <Tooltip cursor={{fill: '#f8fafc'}} />
            <Legend iconType="circle" />
            <Bar dataKey="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Utilidad" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}