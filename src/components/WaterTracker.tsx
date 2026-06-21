import React, { useState } from 'react';
import { Droplets, Info, TrendingDown, Coffee, Beef, Shirt } from 'lucide-react';
import { motion } from 'motion/react';

export const WaterTracker = ({ data, onUpdate }: { data: any, onUpdate: (d: any) => void }) => {
  const [showVirtual, setShowVirtual] = useState(false);

  const calculateDirectWater = () => {
    const shower = (parseFloat(data.showerMinutes) || 0) * 12 * 30; // 12L per min
    const ro = (parseFloat(data.roWaste) || 0) * 30; // Liters per day * 30
    const washing = (parseFloat(data.washingMachine) || 0) * 100 * 4; // 100L per load * 4 weeks
    return shower + ro + washing;
  };

  const calculateVirtualWater = () => {
    // Virtual water estimates (monthly)
    const dietImpact = {
      omnivore: 150000, // Roughly 5000L/day
      vegetarian: 90000, // Roughly 3000L/day
      vegan: 60000     // Roughly 2000L/day
    };
    return dietImpact[data.dietType as keyof typeof dietImpact];
  };

  const directWater = calculateDirectWater();
  const virtualWater = calculateVirtualWater();
  const totalWater = directWater + (showVirtual ? virtualWater : 0);
  
  const limit = 4500; // Sustainable direct limit (liters/month)
  const percent = Math.min(100, (directWater / limit) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
             <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
             <h3 className="font-bold dark:text-white">Water Footprint</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Hydrological Impact Audit</p>
          </div>
        </div>
        <button 
          onClick={() => setShowVirtual(!showVirtual)}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
            showVirtual ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}
        >
          {showVirtual ? 'Virtual Water ON' : 'Show Virtual Water'}
        </button>
      </div>

      <div className="space-y-4 flex-grow overflow-x-hidden">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Daily Shower (Min)</label>
            <input 
              type="number" 
              value={data.showerMinutes}
              onChange={(e) => onUpdate({...data, showerMinutes: e.target.value})}
              placeholder="e.g. 10"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">RO Waste (L/day)</label>
            <input 
              type="number" 
              value={data.roWaste}
              onChange={(e) => onUpdate({...data, roWaste: e.target.value})}
              placeholder="e.g. 15"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dietary Profile</label>
          <div className="grid grid-cols-3 gap-2">
            {['vegan', 'vegetarian', 'omnivore'].map((type) => (
              <button
                key={type}
                onClick={() => onUpdate({...data, dietType: type})}
                className={`py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${
                  data.dietType === type 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {showVirtual && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 space-y-2"
          >
             <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
               <Info className="w-3 h-3" /> Virtual Water Insights
             </p>
             <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                   <Beef className="w-3 h-3" /> 1kg Beef = 15k Litres
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                   <Coffee className="w-3 h-3" /> 1 Cup Coffee = 140L
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                   <Shirt className="w-3 h-3" /> 1 Jeans = 8k Litres
                </div>
             </div>
          </motion.div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
           <div className="flex justify-between items-end mb-2">
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Footprint</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white">{totalWater.toLocaleString()} <span className="text-xs font-normal">Litres/mo</span></p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Limit</p>
                 <p className="text-sm font-bold text-blue-600 dark:text-blue-400">150L Direct</p>
              </div>
           </div>

           <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className={`h-full rounded-full ${percent > 100 ? 'bg-rose-500' : 'bg-blue-500'}`}
              />
           </div>

           {percent > 100 && (
             <div className="mt-3 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                <TrendingDown className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                  Direct usage critical. Aerators alone can reduce faucet flow by 40% without pressure loss.
                </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

