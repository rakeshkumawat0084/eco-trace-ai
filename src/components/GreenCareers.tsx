import React, { useState } from 'react';
import { GraduationCap, Briefcase, Award, Zap, BarChart3, Wind, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const domains = [
  {
    id: 'carbon',
    title: "Carbon Accounting",
    desc: "Quantifying GHG emissions for enterprises.",
    skills: ["LCA Methodologies", "ESG Reporting"],
    icon: <BarChart3 />,
    color: 'blue',
    roadmap: [
      "Master GHG Protocol Standards",
      "Learn Life Cycle Assessment (LCA) tools",
      "Get certified in ISO 14064",
      "Specialise in Scope 3 Supply Chain audits"
    ]
  },
  {
    id: 'renewable',
    title: "Renewable Tech",
    desc: "Optimizing grid-scale energy storage & solar.",
    skills: ["Energy Simulation", "Smart Grids"],
    icon: <Wind />,
    color: 'emerald',
    roadmap: [
      "Foundational Electrical Engineering",
      "Master PVsyst or HELIOSCOPE for solar",
      "Study Lithium-ion & Hydrogen storage systems",
      "Work on Grid-balancing algorithms"
    ]
  },
  {
    id: 'esg',
    title: "ESG Analysis",
    desc: "Investment risk assessment via sustainability.",
    skills: ["Financial Analysis", "Policy Logic"],
    icon: <Zap />,
    color: 'amber',
    roadmap: [
      "Pass CFA Level 1 / ESG Investing Cert",
      "Analyse TCFD & SASB disclosure frameworks",
      "Learn Python for Data-driven ESG scraping",
      "Strategy consulting for Net-Zero transitions"
    ]
  }
];

export const GreenCareers = () => {
  const [activeTab, setActiveTab] = useState(domains[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleGetGuide = () => {
    setIsGenerating(true);
    setShowSuccess(false);
    // Simulate generation process
    setTimeout(() => {
      setIsGenerating(false);
      setShowSuccess(true);
      // Reset success state after a few seconds
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl shadow-inner">
               <GraduationCap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
               <h3 className="text-xl font-bold text-white tracking-tight">Green Career Pathfinder</h3>
               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-0.5">Industry Alignment Engine</p>
            </div>
          </div>
          <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-2xl border border-slate-800 flex-wrap sm:flex-nowrap">
             {domains.map((d) => (
               <button 
                 key={d.id}
                 onClick={() => {
                   setActiveTab(d);
                   setShowSuccess(false);
                 }}
                 aria-label={`Select career domain: ${d.title}`}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   activeTab.id === d.id 
                   ? 'bg-slate-700 text-white shadow-lg' 
                   : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {d.id}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 flex-grow">
           {/* Left Info Panel */}
           <div className="xl:col-span-2 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTab.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700`}>
                     {React.cloneElement(activeTab.icon as React.ReactElement<any>, { className: `w-5 h-5 sm:w-6 sm:h-6 text-${activeTab.color}-400` })}
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-white mb-2">{activeTab.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">{activeTab.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTab.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-slate-800/50 text-[9px] sm:text-[10px] font-bold text-slate-300 border border-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
           </div>

           {/* Right Roadmap Panel */}
           <div className="xl:col-span-3 text-white">
              <div className="bg-slate-800/20 rounded-[2rem] border border-slate-800/50 p-5 sm:p-8 h-full flex flex-col">
                 <h5 className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6">Strategic Career Roadmap</h5>
                 <div className="space-y-6 relative ml-2 sm:ml-4 flex-grow">
                    {activeTab.roadmap.map((step, i) => (
                      <div key={i} className="flex gap-4 sm:gap-6 relative">
                         {i < activeTab.roadmap.length - 1 && (
                           <div className="absolute left-3 top-6 w-0.5 h-10 bg-slate-800" />
                         )}
                         <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-emerald-500/30 flex items-center justify-center shrink-0 z-10 bg-slate-900">
                            <span className="text-[10px] font-black text-emerald-500">{i + 1}</span>
                         </div>
                         <p className="text-[10px] sm:text-[11px] lg:text-[10px] xl:text-xs text-white font-medium pt-1 leading-tight sm:leading-normal">{step}</p>
                      </div>
                    ))}
                 </div>

                 <div className="mt-8 sm:mt-10 p-4 sm:p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                       <Award className="w-5 h-5 text-emerald-500 shrink-0" />
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">AI Insight</p>
                          <p className="text-[10px] text-emerald-500 font-medium mt-1">Growth Index: High (12.4% YoY)</p>
                       </div>
                    </div>
                    <button 
                      onClick={handleGetGuide}
                      disabled={isGenerating || showSuccess}
                      aria-label={`Download detailed career guide for ${activeTab.title}`}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-w-[150px] shadow-lg relative overflow-hidden ${
                        showSuccess 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 active:scale-95'
                      } ${isGenerating ? 'cursor-not-allowed' : ''}`}
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                           <span>Syncing...</span>
                        </div>
                      ) : showSuccess ? (
                        <div className="flex items-center justify-center gap-2">
                           <Check className="w-4 h-4" />
                           <span>Guide Sent</span>
                        </div>
                      ) : (
                        'Get Career Guide'
                      )}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

