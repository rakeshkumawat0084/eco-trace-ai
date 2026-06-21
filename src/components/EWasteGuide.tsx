import React, { useState } from 'react';
import { Trash2, Smartphone, Battery, Package, ArrowRight, CheckCircle2, AlertTriangle, Monitor, Tv } from 'lucide-react';
import { motion } from 'motion/react';

const categories = [
  { 
    id: 'mobile', 
    name: 'Mobiles / Laptops', 
    icon: <Smartphone />, 
    steps: ['Factory reset data', 'Remove SIM/SD cards', 'Find Authorized Center', 'Recycle Li-ion battery'],
    impact: 'Contains Lead, Cadmium and Beryllium which can leach into soil if not processed correctly.',
    color: 'text-blue-600'
  },
  { 
    id: 'battery', 
    name: 'Batteries / Cells', 
    icon: <Battery />, 
    steps: ['Tape the terminals', 'Place in fireproof container', 'Drop at specialized bins', 'Keep away from moisture'],
    impact: 'Battery acid leakage causes severe groundwater pollution and potential soil toxicity.',
    color: 'text-amber-600'
  },
  { 
    id: 'screens', 
    name: 'Monitors / TVs', 
    icon: <Monitor />, 
    steps: ['Check for LCD leakage', 'Handle glass with care', 'Route to E-Gate facility', 'Do not dismantle locally'],
    impact: 'Older CRT screens contain up to 4kg of Lead and Phosphor coating which are hazardous.',
    color: 'text-purple-600'
  }
];

export const EWasteGuide = () => {
  const [selected, setSelected] = useState(categories[0]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
           <Trash2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
           <h3 className="font-bold dark:text-white">Circular Economy</h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">E-Waste Logistics & Safety</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-6">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            onClick={() => setSelected(cat)}
            whileHover={{ scale: 1.02, backgroundColor: selected.id === cat.id ? undefined : 'rgba(241, 245, 249, 1)' }}
            whileTap={{ scale: 0.98 }}
            className={`p-2 sm:p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 sm:gap-2 ${
              selected.id === cat.id 
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white' 
              : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-400 hover:border-slate-300 shadow-sm hover:shadow-md'
            }`}
            aria-label={`Select e-waste category: ${cat.name}`}
          >
            {React.cloneElement(cat.icon as React.ReactElement, { className: 'w-4 h-4 sm:w-5 sm:h-5 shrink-0' })}
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter text-center leading-tight">{cat.name.split('/')[0]}</span>
          </motion.button>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-5 flex-grow">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
             Action Plan <ArrowRight className="w-3 h-3 text-emerald-500" />
          </h4>
          <div className="space-y-2.5">
             {selected.steps.map((step, i) => (
               <div key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">{step}</p>
               </div>
             ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
           <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Toxicity Warning</p>
                 <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed italic">{selected.impact}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center px-1">
         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Global Compliance Standard</span>
         <button className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:underline" aria-label="Verify your nearest local e-waste disposal center">Verify Local Center</button>
      </div>
    </div>
  );
};

