import React from 'react';
import { motion } from 'motion/react';

const SkeletonResultDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Main Results Card Skeleton */}
      <div className="bg-slate-100 dark:bg-slate-800/50 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center md:flex-row md:justify-between gap-8 relative overflow-hidden">
        <div className="flex-1 space-y-4 w-full">
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-12 w-48 bg-slate-300 dark:bg-slate-600 rounded-xl" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
          
          <div className="mt-8 space-y-2 max-w-sm">
            <div className="flex justify-between">
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>

          <div className="pt-6 flex gap-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
        </div>
        
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-[10px] border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
           <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* Reduction Checklist Skeleton */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded-full mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        ))}
      </div>

      {/* Simulator Skeleton */}
      <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 space-y-6">
        <div className="h-6 w-48 bg-slate-800 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-slate-800 bg-slate-800/50 h-20" />
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
           <div className="space-y-2">
             <div className="h-2 w-24 bg-slate-800 rounded-full" />
             <div className="h-6 w-32 bg-slate-800 rounded-full" />
           </div>
           <div className="h-4 w-12 bg-slate-800 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonResultDashboard;
