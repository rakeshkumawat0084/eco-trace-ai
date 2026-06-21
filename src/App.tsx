import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, Info, Zap, Calculator, History, MessageSquare, 
  SendHorizontal, Moon, Sun, Download, Image as ImageIcon, FileText,
  Share2, Save, Trash2, ShieldCheck, Trophy, Anchor, 
  AlertCircle, AlertTriangle, Users, X, Copy, ChevronRight,
  TrendingUp, TrendingDown, Bot, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Footer } from './components/ui/footer-section';
import { WaterTracker } from './components/WaterTracker';
import { EWasteGuide } from './components/EWasteGuide';
import { GreenCareers } from './components/GreenCareers';
import { calculateDirectWater, calculateVirtualWater, MITIGATION_TASKS } from './lib/calculations';
import SkeletonResultDashboard from './components/SkeletonResultDashboard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface FootprintResults {
  totalScore: number;
  electricityScore: number;
  transportScore: number;
  dietScore: number;
  breakdown: {
    electricity: number;
    transport: number;
    diet: number;
  };
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  isLoading?: boolean;
}

interface AuditRecord {
  totalScore: number;
  timestamp: string;
  goal: number;
  breakdown: any;
}

export default function App() {
  // State
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [waterData, setWaterData] = useState({
    showerMinutes: '',
    roWaste: '',
    washingMachine: '2',
    dietType: 'omnivore'
  });

  const waterFootprint = calculateDirectWater(waterData);
  const virtualWaterFootprint = calculateVirtualWater(waterData.dietType);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('ecoTraceTheme') as 'light' | 'dark' || 'light';
  });
  
  const [formData, setFormData] = useState({
    electricity: '',
    distance: '',
    fuelType: 'Petrol',
    dietType: 'Meat',
    localSourced: '50',
    distanceUnit: 'km',
    carbonGoal: '400'
  });

  const [results, setResults] = useState<FootprintResults | null>(null);
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  
  const [activeScenarios, setActiveScenarios] = useState({
    ev: false,
    vegan: false,
    solar: false
  });
  
  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Derived Score taking into account reduction tasks
  const getDisplayScore = () => {
    if (!results) return 0;
    let total = results.totalScore;
    activeTasks.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) total -= task.reduction;
    });
    return Math.max(0, total);
  };

  const finalScore = getDisplayScore();

  // Animated score for smooth transitions
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (results) {
      const target = finalScore;
      const duration = 1000; // 1s
      const start = animatedScore;
      const startTime = performance.now();

      let animationFrameId: number;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutExpo)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (target - start) * ease;
        
        setAnimatedScore(current);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameId);
    } else {
      setAnimatedScore(0);
    }
  }, [finalScore, results !== null]);

  // Derived Tier for Accent Shifting
  const scoreTier = !results ? 'neutral' : (results.totalScore > 800 ? 'high' : results.totalScore > 400 ? 'medium' : 'low');
  
  const getTierAccent = () => {
    switch (scoreTier) {
      case 'high': return 'border-red-500/50 shadow-red-500/10 dark:border-red-500/30';
      case 'medium': return 'border-amber-500/50 shadow-amber-500/10 dark:border-amber-500/30';
      case 'low': return 'border-emerald-500/50 shadow-emerald-500/10 dark:border-emerald-500/30';
      default: return 'border-slate-100 dark:border-slate-800';
    }
  };

  const getTierNavAccent = () => {
    switch (scoreTier) {
      case 'high': return 'border-red-500/30';
      case 'medium': return 'border-amber-500/30';
      case 'low': return 'border-emerald-500/30';
      default: return 'border-slate-100 dark:border-slate-800';
    }
  };

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scenarios/Tasks
  const tasks = MITIGATION_TASKS;

  // Effects
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ecoTraceTheme', theme);
  }, [theme]);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (err) {
        setApiStatus('offline');
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ecoTraceAudits');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const calculateFootprint = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Require inputs before calculation
    if (!formData.electricity && !formData.distance) {
      setAlert({
        title: 'Inputs Required',
        message: 'Please enter your electricity usage and/or travel distance before attempting to calculate your sustainability audit.'
      });
      return;
    }

    setIsCalculating(true);

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        } else {
          const text = await res.text();
          throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
        }
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          const newResults = data.data;
          setResults(newResults);
          saveAudit(newResults);
          setActiveTasks([]); // Reset tasks on new calculation
          
          // Auto-chat initial analysis
          getAIAnalysis(newResults);
        } else {
          setAlert({ title: 'Calculation Error', message: data.error || 'Failed to calculate footprint.' });
        }
      } else {
        throw new Error("Invalid response format from server (expected JSON)");
      }
    } catch (err: any) {
      setAlert({ 
        title: 'Diagnostic Error', 
        message: err.message.includes('Failed to fetch') 
          ? 'Network Hub connection lost. Please check if the backend server is running.' 
          : `Engine Error: ${err.message}`
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const saveAudit = (res: FootprintResults) => {
    const newRecord: AuditRecord = {
      totalScore: res.totalScore,
      timestamp: new Date().toLocaleString(),
      goal: parseFloat(formData.carbonGoal) || 0,
      breakdown: res.breakdown
    };
    const updatedHistory = [newRecord, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('ecoTraceAudits', JSON.stringify(updatedHistory));
  };

  const getAIAnalysis = async (res: FootprintResults) => {
    setMessages(prev => [...prev, { role: 'ai', text: '', isLoading: true }]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Hello EcoTrace! Please analyze my footprint and give me a reduction roadmap.",
          context: {
            ...res,
            dietarySourcing: formData.localSourced
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          setMessages(prev => {
            const filtered = prev.filter(m => !m.isLoading);
            const lastMessage = filtered[filtered.length - 1];
            if (lastMessage && lastMessage.role === 'ai' && !lastMessage.isLoading) {
               // This check is a bit tricky since getAIAnalysis only adds one message.
               // We need to manage the specific AI response we just added.
               return [...prev.filter(m => !m.isLoading), { role: 'ai', text: accumulatedText }];
            }
            return [...prev.filter(m => !m.isLoading), { role: 'ai', text: accumulatedText }];
          });
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => !m.isLoading));
      setAlert({ 
        title: 'AI Connectivity Issue', 
        message: err.message.includes('503') 
          ? 'The AI Gateway is currently overloaded. Please try again in 30 seconds.' 
          : `Diagnostic: ${err.message}` 
      });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setMessages(prev => [...prev, { role: 'ai', text: '', isLoading: true }]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: {
            ...results,
            dietarySourcing: formData.localSourced
          },
          history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          setMessages(prev => {
             return [...prev.filter(m => !m.isLoading), { role: 'ai', text: accumulatedText }];
          });
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => !m.isLoading));
      setAlert({ title: 'AI Communication Failure', message: `Details: ${err.message}` });
    }
  };

  const toggleScenario = (type: 'ev' | 'vegan' | 'solar') => {
    setActiveScenarios(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleTask = (id: string) => {
    setActiveTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const resetScenarios = () => setActiveScenarios({ ev: false, vegan: false, solar: false });

  const joinChallenge = (challenge: string) => {
    if (!joinedChallenges.includes(challenge)) {
      setJoinedChallenges(prev => [...prev, challenge]);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const handlePreviewReport = () => {
    if (!results) {
      setAlert({ 
        title: 'Report Unavailable', 
        message: 'Calculate your footprint first to see a preview of the report.' 
      });
      return;
    }
    setShowPreviewModal(true);
  };

  const exportToPDF = async () => {
    if (!results || !pdfTemplateRef.current) {
      setAlert({ 
        title: 'Report Unavailable', 
        message: 'Please calculate your footprint using the calculator first before generating the PDF report.' 
      });
      return;
    }

    try {
      setIsExporting(true);
      const template = pdfTemplateRef.current;

      const opt: any = {
        margin: [10, 10],
        filename: `EcoTrace-AI-Impact-Report-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          onclone: (clonedDoc: Document) => {
            // Strip problematic styles
            const problematicStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            problematicStyles.forEach(s => s.remove());
            
            // Inject standard CSS
            const style = clonedDoc.createElement('style');
            style.textContent = `
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              * { box-sizing: border-box !important; }
              body { background: white !important; font-family: 'Inter', sans-serif !important; }
              .flex { display: flex !important; }
              .flex-col { flex-direction: column !important; }
              .justify-between { justify-content: space-between !important; }
              .items-center { align-items: center !important; }
              .items-start { align-items: flex-start !important; }
              .grid { display: grid !important; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
              .gap-8 { gap: 32px !important; }
              .gap-4 { gap: 16px !important; }
              .gap-2 { gap: 8px !important; }
              .mb-2 { margin-bottom: 8px !important; }
              .mb-4 { margin-bottom: 16px !important; }
              .mb-6 { margin-bottom: 24px !important; }
              .mb-8 { margin-bottom: 32px !important; }
              .mb-12 { margin-bottom: 48px !important; }
              .mt-1 { margin-top: 4px !important; }
              .mt-6 { margin-top: 24px !important; }
              .mt-8 { margin-top: 32px !important; }
              .mt-16 { margin-top: 64px !important; }
              .p-8 { padding: 32px !important; }
              .p-10 { padding: 40px !important; }
              .p-12 { padding: 48px !important; }
              .pb-8 { padding-bottom: 32px !important; }
              .pt-8 { padding-top: 32px !important; }
              .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
              .pt-6 { padding-top: 24px !important; }
              .text-white { color: #ffffff !important; }
              .text-slate-900 { color: #0f172a !important; }
              .text-slate-400 { color: #94a3b8 !important; }
              .text-slate-500 { color: #64748b !important; }
              .text-emerald-600 { color: #059669 !important; }
              .text-emerald-500 { color: #10b981 !important; }
              .text-xs { font-size: 12px !important; }
              .text-sm { font-size: 14px !important; }
              .text-xl { font-size: 20px !important; }
              .text-2xl { font-size: 24px !important; }
              .text-3xl { font-size: 30px !important; }
              .text-4xl { font-size: 36px !important; }
              .text-5xl { font-size: 48px !important; }
              .font-black { font-weight: 900 !important; }
              .font-bold { font-weight: 700 !important; }
              .font-medium { font-weight: 500 !important; }
              .uppercase { text-transform: uppercase !important; }
              .italic { font-style: italic !important; }
              .tracking-tight { letter-spacing: -0.025em !important; }
              .tracking-widest { letter-spacing: 0.1em !important; }
              .rounded-full { border-radius: 9999px !important; }
              .rounded-3xl { border-radius: 24px !important; }
              .bg-white { background-color: #ffffff !important; }
              .bg-slate-50 { background-color: #f8fafc !important; }
              .bg-emerald-600 { background-color: #059669 !important; }
              .bg-slate-900 { background-color: #0f172a !important; }
              .border { border-style: solid !important; border-width: 1px !important; }
              .border-b { border-bottom-style: solid !important; border-bottom-width: 1px !important; }
              .border-t { border-top-style: solid !important; border-top-width: 1px !important; }
              .border-slate-100 { border-color: #f1f5f9 !important; }
              .border-emerald-100 { border-color: #d1fae5 !important; }
              .overflow-hidden { overflow: hidden !important; }
              .relative { position: relative !important; }
              .absolute { position: absolute !important; }
              .inline-flex { display: inline-flex !important; }
            `;
            clonedDoc.head.appendChild(style);
            
            const reportEl = clonedDoc.getElementById('pdf-report');
            if (reportEl) {
              reportEl.style.position = 'relative';
              reportEl.style.left = '0';
              reportEl.style.visibility = 'visible';
              reportEl.style.display = 'block';
              reportEl.style.width = '800px';
              reportEl.style.margin = '0';
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Workaround for potential white screen by ensuring a slightly deferred execution
      setTimeout(async () => {
        try {
          await html2pdf().set(opt).from(template).save();
          setAlert({
            title: 'Report Generated! 📄',
            message: 'Your personalized impact analysis has been downloaded successfully.'
          });
          // Clear form data after download as per user request
          setFormData({
            electricity: '',
            distance: '',
            fuelType: 'Petrol',
            dietType: 'Meat',
            localSourced: '50',
            distanceUnit: 'km',
            carbonGoal: '400'
          });
        } catch (err) {
          console.error('Inner PDF Error:', err);
          setAlert({
            title: 'Export Error',
            message: 'Could not complete the PDF generation. Please check your data and try again.'
          });
        } finally {
          setIsExporting(false);
          // Small cleanup if html2pdf left any artifacts
          const leftOverCanvas = document.querySelectorAll('canvas[style*="position: fixed"]');
          leftOverCanvas.forEach(c => c.remove());
        }
      }, 500);

    } catch (error) {
      console.error('PDF Export Error:', error);
      setIsExporting(false);
      setAlert({
        title: 'Export Error',
        message: 'There was an issue generating your PDF. Please try again or check your browser permissions.'
      });
    }
  };

  // Calculations for UI
  const getProjectedScore = () => {
    if (!results) return 0;
    let total = results.totalScore;
    if (activeScenarios.ev) total -= (results.transportScore * 0.4);
    if (activeScenarios.vegan) total -= (results.dietScore * 0.5);
    if (activeScenarios.solar) total -= (results.electricityScore * 0.7);
    return Math.max(0, total);
  };

  const getBadgeConfig = (score: number) => {
    if (score < 150) return { label: 'Green Legend Certified Status', icon: '🟩', classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
    if (score <= 400) return { label: 'Eco Balancer Profile', icon: '🟨', classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
    return { label: 'Carbon Consumer Profile', icon: '🟥', classes: "bg-red-500/10 text-red-400 border border-red-500/20" };
  };

  const handleDeployImpact = () => {
    if (!results) {
      setAlert({ 
        title: 'Draft Snapshot', 
        message: 'Calculate your initial footprint before deploying your sustainability roadmap to the ecosystem.' 
      });
      return;
    }

    setAlert({
      title: 'Impact Strategy Deployed! 🌿',
      message: `Your roadmap is now active. By following your selected scenarios, you are committed to reducing your monthly footprint by ${savingsPercent}%. Great work!`
    });
  };

  const badge = results ? getBadgeConfig(results.totalScore) : null;
  const projectedScore = getProjectedScore();
  const benchmarkPercent = results ? Math.max(0, Math.min(100, (results.totalScore / 800) * 100)) : 0;
  
  const savingsPercent = results && results.totalScore > 0 
    ? ((1 - projectedScore / results.totalScore) * 100).toFixed(0) 
    : '0';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b transition-colors duration-500 ${getTierNavAccent()}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none animate-pulse shrink-0">
              <Leaf className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg sm:text-xl tracking-tight dark:text-white truncate">EcoTrace <span className="text-emerald-600">AI</span></h1>
              <div className="flex items-center gap-2">
                <p className="hidden xs:block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">Sustainability Catalyst</p>
                <div 
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter transition-all ${
                    apiStatus === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 
                    apiStatus === 'offline' ? 'bg-red-500/10 text-red-500' : 
                    'bg-slate-500/10 text-slate-400'
                  }`}
                  title={apiStatus === 'online' ? 'API Engine Online' : apiStatus === 'offline' ? 'API Engine Offline' : 'Checking Connection...'}
                >
                  <span className={`w-1 h-1 rounded-full ${
                    apiStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                    apiStatus === 'offline' ? 'bg-red-500' : 
                    'bg-slate-400 animate-pulse'
                  }`} />
                  <span className="hidden leading-none xs:inline">{apiStatus}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button 
              onClick={handlePreviewReport}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 sm:p-2.5 rounded-xl transition-all group ${
                !results 
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title="Preview Report"
              aria-label="Preview sustainability report"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
            </motion.button>
            <motion.button 
              onClick={exportToPDF}
              disabled={isExporting}
              whileHover={results ? { scale: 1.1, backgroundColor: 'rgba(16, 185, 129, 0.1)' } : {}}
              whileTap={results ? { scale: 0.95 } : {}}
              className={`p-2 sm:p-2.5 rounded-xl transition-all group relative ${
                !results 
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              aria-label="Download PDF Report"
              title="Download PDF Report"
            >
              {isExporting ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform`} />
              )}
              {results && !isExporting && (
                <span className="absolute top-0.5 right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </motion.button>
            <motion.button 
              type="button"
              onClick={(e) => { e.preventDefault(); toggleTheme(); }}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
              whileTap={{ scale: 0.9 }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all group"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </motion.button>
            <motion.button 
              onClick={handleDeployImpact}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.1), 0 8px 10px -6px rgba(16, 185, 129, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[10px] xs:text-xs sm:text-sm hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
              aria-label="Deploy sustainability impact strategy"
            >
              <span className="sm:hidden flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">Deploy Impact</span>
            </motion.button>
          </div>
        </div>
      </nav>

      <main className="flex-1 mt-20 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Sidebar: Control Center */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-bold text-lg dark:text-white">Emission Inputs</h2>
              </div>

              <form onSubmit={calculateFootprint} className="space-y-5">
                <div>
                  <label htmlFor="electricity" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Electricity (kWh)</label>
                  <input 
                    type="number" id="electricity" value={formData.electricity} onChange={handleInputChange}
                    placeholder="e.g. 250" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition-all"
                    aria-label="Monthly electricity usage in kilowatt hours"
                  />
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="distance" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distance</label>
                      <input 
                        type="number" id="distance" value={formData.distance} onChange={handleInputChange}
                        placeholder="e.g. 400" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition-all text-sm"
                        aria-label="Travel distance"
                      />
                    </div>
                    <div>
                      <label htmlFor="distanceUnit" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unit</label>
                      <select id="distanceUnit" value={formData.distanceUnit} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white text-sm" aria-label="Distance unit">
                        <option value="km">KM</option>
                        <option value="mi">Miles</option>
                      </select>
                    </div>
                  </div>

                <div>
                  <label htmlFor="fuelType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vehicle Fuel Type</label>
                  <select id="fuelType" value={formData.fuelType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" aria-label="Vehicle fuel type">
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">Electric Vehicle</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dietType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dietary Lifestyle</label>
                  <select id="dietType" value={formData.dietType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" aria-label="Dietary lifestyle">
                    <option value="Meat">Omnivore (Meat Eater)</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="localSourced" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Food Sourcing</label>
                    <span className="text-xs font-bold text-emerald-600">{formData.localSourced}% Local</span>
                  </div>
                  <input 
                    type="range" id="localSourced" min="0" max="100" step="5"
                    value={formData.localSourced} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    aria-label="Local sourcing percentage"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">100% Imported</span>
                    <span className="text-[10px] text-slate-400 font-medium">100% Local</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="carbonGoal" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Carbon Monthly Goal (kg)</label>
                  <input 
                    type="number" id="carbonGoal" value={formData.carbonGoal} onChange={handleInputChange}
                    placeholder="400" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white transition-all"
                    aria-label="Monthly carbon emission goal"
                  />
                </div>

                <motion.button 
                  type="submit" disabled={isCalculating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                  aria-label="Calculate sustainability audit footprint"
                >
                  {isCalculating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  Calculate Audit
                </motion.button>
              </form>
            </div>

            {/* History Panel */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                <History className="w-5 h-5 text-indigo-500" /> Recent History
              </h2>
              
              {history.length > 1 && (
                <div className="mb-6 h-28 sm:h-32 w-full">
                  <Line 
                    data={{
                      labels: history.slice().reverse().map(h => h.timestamp.split(' ')[0]),
                      datasets: [{
                        label: 'Footprint (kg)',
                        data: history.slice().reverse().map(h => h.totalScore),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#10b981',
                        fill: true,
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: {
                        duration: 1200,
                        easing: 'easeInOutQuart'
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: { 
                          enabled: true,
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          titleFont: { size: 10, weight: 'bold' },
                          bodyFont: { size: 12 },
                          padding: 10,
                          displayColors: false,
                          cornerRadius: 8
                        }
                      },
                      scales: {
                        x: { display: false },
                        y: { 
                          display: false,
                          beginAtZero: false
                        }
                      }
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto pr-1 scrollbar-hide">
                {history.length > 0 ? history.map((record, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 transition-all duration-300">
                    <span className="text-[10px] text-slate-400 font-medium">⏱️ Captured Instance at {record.timestamp.split(',')[1]}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600">{record.totalScore.toFixed(1)} kg CO₂</span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No historical data recorded yet.</p>
                )}
              </div>
            </div>
          </aside>

          {/* Right Content: Analysis & Insights */}
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {isCalculating ? (
                <motion.div 
                  key="skeleton-dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 mb-8"
                >
                  <SkeletonResultDashboard />
                </motion.div>
              ) : results ? (
                <motion.div 
                  key="results-dashboard"
                  ref={resultsRef}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.15,
                        delayChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="space-y-6 mb-8"
                >
                  {/* Results Dashboard */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                    }}
                    className={`p-6 sm:p-8 rounded-3xl border flex flex-col items-center md:flex-row md:justify-between gap-8 relative overflow-hidden text-center md:text-left transition-all duration-700 ${
                      scoreTier === 'high' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' :
                      scoreTier === 'medium' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50' :
                      'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'
                    }`}
                  >
                    <div className="flex-1 space-y-1 relative z-10 w-full">
                      <h3 className={`font-bold uppercase text-[10px] tracking-widest ${
                        scoreTier === 'high' ? 'text-red-800 dark:text-red-400' :
                        scoreTier === 'medium' ? 'text-amber-800 dark:text-amber-400' :
                        'text-emerald-800 dark:text-emerald-400'
                      }`}>Calculated Footprint</h3>
                      <div className={`text-4xl xs:text-5xl font-black tabular-nums break-words ${
                        scoreTier === 'high' ? 'text-red-900 dark:text-red-500' :
                        scoreTier === 'medium' ? 'text-amber-900 dark:text-amber-500' :
                        'text-emerald-900 dark:text-emerald-500'
                      }`}>
                        <motion.span
                          key={results?.totalScore} // Trigger pulse only when the final target score changes
                          initial={{ scale: 1, filter: "brightness(1)" }}
                          animate={{ 
                            scale: [1, 1.05, 1],
                            filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                            textShadow: [
                              "0 0 0px rgba(0,0,0,0)",
                              scoreTier === 'high' ? "0 0 20px rgba(239, 68, 68, 0.4)" : 
                              scoreTier === 'medium' ? "0 0 20px rgba(245, 158, 11, 0.4)" : 
                              "0 0 20px rgba(16, 185, 129, 0.4)",
                              "0 0 0px rgba(0,0,0,0)"
                            ]
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="inline-block"
                        >
                          {animatedScore.toFixed(2)}
                        </motion.span>
                        <span className="text-sm sm:text-base font-normal ml-2">kg CO2/mo</span>
                      </div>
                      
                      {badge && (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.classes} mt-2`}>
                          {badge.icon} {badge.label} {joinedChallenges.length > 0 && ` (+${joinedChallenges.length} Badges)`}
                        </div>
                      )}

                      <div className="mt-8 w-full max-w-sm mx-auto md:mx-0">
                        <div className="flex justify-between items-center mb-1.5 px-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Benchmarking</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Global context</span>
                        </div>
                        <div className="relative w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="absolute h-full bg-emerald-500/20 border-r border-emerald-500/40" style={{ width: '25%' }}></div>
                          <div className="absolute h-full bg-amber-500/10 border-r border-amber-500/40" style={{ width: '60%' }}></div>
                          <motion.div 
                            initial={{ left: 0 }}
                            animate={{ left: `${benchmarkPercent}%` }}
                            className="absolute h-full w-1.5 bg-slate-900 dark:bg-white z-10 shadow-lg"
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-black text-slate-400 mt-2 uppercase gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                          <span>India (150kg)</span>
                          <span>Global Avg (400kg)</span>
                          <span>High (800kg+)</span>
                        </div>
                      </div>

                      <div className="pt-6 flex justify-center md:justify-start gap-4">
                        <button 
                          onClick={exportToPDF}
                          disabled={isExporting}
                          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider hover:opacity-70 transition-all ${
                            scoreTier === 'high' ? 'text-red-700 dark:text-red-400' :
                            scoreTier === 'medium' ? 'text-amber-700 dark:text-amber-400' :
                            'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isExporting ? (
                            <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${
                              scoreTier === 'high' ? 'border-red-500' :
                              scoreTier === 'medium' ? 'border-amber-500' :
                              'border-emerald-500'
                            }`} />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          Download PDF
                        </button>
                        <button onClick={() => setShowShareModal(true)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider hover:opacity-70 transition-all ${
                          scoreTier === 'high' ? 'text-red-700 dark:text-red-400' :
                          scoreTier === 'medium' ? 'text-amber-700 dark:text-amber-400' :
                          'text-emerald-700 dark:text-emerald-400'
                        }`} aria-label="Share your sustainability impact scorecard">
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>
                      </div>
                    </div>

                    <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center relative flex-shrink-0">
                      <div className={`w-full h-full rounded-full border-[10px] sm:border-[12px] flex items-center justify-center text-center p-4 transition-colors duration-700 ${
                        scoreTier === 'high' ? 'border-red-100 dark:border-red-900/50' :
                        scoreTier === 'medium' ? 'border-amber-100 dark:border-amber-900/50' :
                        'border-emerald-100 dark:border-emerald-900'
                      }`}>
                         <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Impact Distribution</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Historical Trend Visualization */}
                  {history.length > 1 && (
                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }
                      }}
                      className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                         <div>
                            <h4 className="text-xl font-bold dark:text-white">Historical Trend</h4>
                            <p className="text-xs text-slate-500 mt-1 uppercase font-black tracking-widest">Sustainability Trajectory</p>
                         </div>
                         {history.length > 1 && (
                            <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
                              results.totalScore <= (history[1]?.totalScore || results.totalScore) 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {results.totalScore <= (history[1]?.totalScore || results.totalScore) ? (
                                <><TrendingDown className="w-3 h-3" /> Improving trajectory</>
                              ) : (
                                <><TrendingUp className="w-3 h-3" /> footprint increasing</>
                              )}
                            </div>
                         )}
                      </div>

                      <div className="h-64 sm:h-72 w-full">
                         <Line 
                           data={{
                             labels: history.slice(0, 10).reverse().map(h => h.timestamp.split(',')[0]),
                             datasets: [{
                               label: 'Monthly Impact',
                               data: history.slice(0, 10).reverse().map(h => h.totalScore),
                               borderColor: scoreTier === 'high' ? '#ef4444' : scoreTier === 'medium' ? '#f59e0b' : '#10b981',
                               backgroundColor: scoreTier === 'high' ? 'rgba(239, 68, 68, 0.1)' : scoreTier === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                               borderWidth: 3,
                               pointRadius: 4,
                               pointBackgroundColor: '#ffffff',
                               pointBorderWidth: 2,
                               fill: true,
                               tension: 0.4
                             }]
                           }}
                           options={{
                             responsive: true,
                             maintainAspectRatio: false,
                             plugins: {
                               legend: { display: false },
                               tooltip: {
                                 backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                 padding: 12,
                                 titleFont: { size: 10, weight: 'bold' },
                                 bodyFont: { size: 12 },
                                 displayColors: false,
                                 callbacks: {
                                   label: (context) => ` ${context.parsed.y.toFixed(1)} kg CO2`
                                 }
                               }
                             },
                             scales: {
                               x: {
                                 grid: { display: false },
                                 ticks: { font: { size: 9 }, color: '#94a3b8' }
                               },
                               y: {
                                 grid: { color: 'rgba(148, 163, 184, 0.05)' },
                                 ticks: { font: { size: 9 }, color: '#94a3b8' }
                               }
                             }
                           }}
                         />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                         <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Lifetime Average</p>
                            <p className="text-lg font-black dark:text-white">{(history.reduce((acc, h) => acc + h.totalScore, 0) / history.length).toFixed(1)} <span className="text-[10px] font-normal text-slate-400">kg</span></p>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Record Low</p>
                            <p className="text-lg font-black dark:text-white">{Math.min(...history.map(h => h.totalScore)).toFixed(1)} <span className="text-[10px] font-normal text-slate-400">kg</span></p>
                         </div>
                         <div className="hidden sm:block p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Savings</p>
                            <p className="text-lg font-black text-emerald-500">{(history.length * 400 - history.reduce((acc, h) => acc + h.totalScore, 0)).toFixed(0)} <span className="text-[10px] font-normal text-emerald-500/60">kg</span></p>
                         </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Reduction Checklist */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                    }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
                  >
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       ⚡ Active Simulated Mitigation Actions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {tasks.map(task => (
                          <div 
                             key={task.id} 
                             role="button"
                             tabIndex={0}
                             aria-label={`Toggle mitigation task: ${task.label}`}
                             onClick={() => toggleTask(task.id)}
                             onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                   e.preventDefault();
                                   toggleTask(task.id);
                                }
                             }}
                             className={`flex items-center gap-3.5 p-4 rounded-3xl border transition-all cursor-pointer group ${
                                activeTasks.includes(task.id) 
                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                                : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 hover:border-emerald-500/30'
                             }`}
                          >
                             <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                                activeTasks.includes(task.id) 
                                ? 'bg-emerald-600 border-emerald-600' 
                                : 'border-slate-300 dark:border-slate-600'
                             }`}>
                                {activeTasks.includes(task.id) && <ShieldCheck className="w-3 h-3 text-white" />}
                             </div>
                             <div className="flex-1">
                                <p className={`text-[11px] font-bold leading-tight ${activeTasks.includes(task.id) ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                   {task.label}
                                </p>
                                <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase tracking-wider">-{task.reduction}kg CO₂ Adjustment</p>
                             </div>
                          </div>
                       ))}
                    </div>
                  </motion.div>

                  {/* Simulator */}
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                    }}
                    className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden group"
                  >
                     <div className="absolute top-0 right-0 p-4">
                        <Zap className="w-8 h-8 text-emerald-500 opacity-20" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                           <h4 className="text-white font-bold text-xl">What-If Simulator</h4>
                           <span className="text-[10px] bg-emerald-900 text-emerald-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">BETA</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {[
                              { id: 'ev', label: 'EV Switch', desc: '-40% Transport', icon: <Zap /> },
                              { id: 'vegan', label: '100% Vegan', desc: '-50% Diet', icon: <Leaf /> },
                              { id: 'solar', label: 'Solar Rooftop', desc: '-70% Energy', icon: <Sun /> }
                           ].map(scen => (
                              <button 
                                key={scen.id}
                                type="button"
                                onClick={(e) => { e.preventDefault(); toggleScenario(scen.id as any); }}
                                className={`p-4 rounded-2xl border transition-all text-left group ${
                                   activeScenarios[scen.id as keyof typeof activeScenarios] 
                                   ? 'bg-emerald-600 border-emerald-400' 
                                   : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                }`}
                                aria-label={`Toggle simulation scenario: ${scen.label}`}
                              >
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="text-white font-bold text-sm">{scen.label}</span>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${activeScenarios[scen.id as keyof typeof activeScenarios] ? 'bg-emerald-400' : 'bg-slate-700'}`}>
                                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 transform ${activeScenarios[scen.id as keyof typeof activeScenarios] ? 'translate-x-[16px]' : 'translate-x-0'}`} style={{ left: '2px' }} />
                                    </div>
                                 </div>
                                 <p className={`text-[10px] font-bold ${activeScenarios[scen.id as keyof typeof activeScenarios] ? 'text-emerald-100' : 'text-slate-500'}`}>{scen.desc}</p>
                              </button>
                           ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                           <div>
                              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Projected Future Score</p>
                              <p className="text-2xl font-black text-white">{projectedScore.toFixed(2)} kg <span className="text-emerald-500 text-xs">(-{savingsPercent}%)</span></p>
                           </div>
                           <button onClick={resetScenarios} className="text-slate-500 text-xs font-bold hover:text-white transition-all uppercase tracking-widest" aria-label="Reset all what-if simulation scenarios">Reset</button>
                        </div>
                      </div>
                   </motion.div>
                </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder-home"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl mb-8"
                  >
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                      <Calculator className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white mb-2">Ready to Trace?</h3>
                    <p className="text-slate-500 text-sm max-w-xs">Enter your consumption data on the left to generate your first sustainability roadmap.</p>
                  </motion.div>
                )}
              </AnimatePresence>
                  <AnimatePresence>
                    {results && (
                      <motion.section 
                        key="advisor-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] sm:h-[600px] mb-8"
                      >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-emerald-600" />
                         </div>
                         <div>
                            <h3 className="font-bold dark:text-white">EcoTrace Analyst</h3>
                            <div className="flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online Advisor</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.length === 0 && (
                         <div className="text-center py-12">
                            <p className="text-slate-400 text-xs italic">Consultant ready for your questions.</p>
                         </div>
                      )}
                      {messages.map((m, idx) => (
                        <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                            m.role === 'user' 
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium ml-12 rounded-tr-none' 
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 mr-12 rounded-tl-none border border-emerald-100/50 dark:border-emerald-900/50'
                          }`}>
                            {m.isLoading ? (
                              <div className="flex gap-1 py-1">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                              </div>
                            ) : m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                      <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input 
                          type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about reduction strategies..." 
                          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm dark:text-white"
                          aria-label="Ask about carbon reduction strategies"
                        />
                        <button type="submit" className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none" aria-label="Send message to AI assistant">
                          <SendHorizontal className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                      </motion.section>
                    )}
                  </AnimatePresence>

                  {/* Community Hub - Permanent */}
                  <section className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                             <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div>
                             <h2 className="text-xl font-black dark:text-white">Community Challenges</h2>
                             <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Collaborative Impact</p>
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            +2k
                          </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                        {[
                           { id: 'campus', title: 'Campus Green Drive', desc: 'University batch driving zero-plastic campaigns and sustainable dining habits.', count: '428 joined' },
                           { id: 'waste', title: 'Zero-Wastehood', desc: 'Neighborhood initiative for 100% composting and community recycling programs.', count: '1.4k joined' }
                        ].map(hub => (
                           <div key={hub.id} className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-500/50 transition-all flex flex-col">
                              <div className="flex justify-between items-start mb-3">
                                 <h4 className="font-bold dark:text-white text-base leading-tight">{hub.title}</h4>
                                 {!joinedChallenges.includes(hub.id) && <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">Hot</span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed flex-1">{hub.desc}</p>
                              <div className="flex items-center justify-between mt-auto">
                                 <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{hub.count}</span>
                                 <button 
                                    onClick={() => joinChallenge(hub.id)}
                                    disabled={joinedChallenges.includes(hub.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      joinedChallenges.includes(hub.id) 
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default' 
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none'
                                    }`}
                                 >
                                    {joinedChallenges.includes(hub.id) ? 'Active' : 'Join Effort'}
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </section>

                   {/* Beyond Carbon: Total Eco-Action Hub */}
                  <section className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                     <div>
                        <h2 className="text-2xl font-black dark:text-white">Beyond Carbon</h2>
                        <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Total Eco-Action Hub</p>
                     </div>
                     
                     <div className="flex flex-col gap-8">
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                        >
                          <WaterTracker data={waterData} onUpdate={setWaterData} />
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 }}
                        >
                          <EWasteGuide />
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                        >
                          <GreenCareers />
                        </motion.div>
                     </div>
                  </section>
          </div>
        </div>
      </main>

      <Footer />

      {/* Hidden PDF Export Template */}
      <div className="absolute -left-[9999px] top-0 overflow-hidden">
        <div 
          id="pdf-report" 
          ref={pdfTemplateRef}
          className="p-12 w-[800px]"
          style={{ 
            fontFamily: 'sans-serif',
            backgroundColor: '#ffffff',
            color: '#0f172a'
          }}
        >
          <div 
            className="flex justify-between items-start mb-12 pb-8"
            style={{ borderBottom: '4px solid #059669', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: '#0f172a', fontWeight: 900, fontSize: '36px' }}>EcoTrace AI</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#059669', fontSize: '12px', fontWeight: 700 }}>Sustainability Impact Audit Report</p>
              <p className="text-xs mt-6 font-medium" style={{ color: '#94a3b8', fontSize: '10px' }}>DATE: {new Date().toLocaleDateString()} | REF: AI-{new Date().getTime().toString().slice(-6)}</p>
            </div>
            <div 
              className="rounded-[2rem] flex items-center justify-center"
              style={{ backgroundColor: '#059669', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '32px' }}
            >
               <Leaf className="text-white" color="#ffffff" size={40} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
            <div 
              className="p-8 rounded-[2.5rem] flex flex-col justify-between"
              style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '32px', borderRadius: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '16px' }}>Baseline Footprint</h2>
                <p className="text-5xl font-black tabular-nums" style={{ color: '#0f172a', fontSize: '48px', fontWeight: 900 }}>{finalScore.toFixed(2)} kg</p>
                <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter" style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginTop: '4px' }}>Mitigated monthly CO₂ equivalent</p>
              </div>
              <div className="mt-8" style={{ marginTop: '32px' }}>
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full text-xs font-black uppercase tracking-widest"
                  style={{ backgroundColor: '#059669', color: '#ffffff', padding: '8px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: 900, display: 'inline-flex', alignItems: 'center' }}
                >
                  {getBadgeConfig(finalScore).label}
                </div>
              </div>
            </div>
            <div 
              className="p-8 rounded-[2.5rem] flex flex-col justify-between"
              style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '32px', borderRadius: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '16px' }}>Mitigation Roadmap</h2>
                <div className="space-y-2">
                   {activeTasks.length > 0 ? (
                     tasks.filter(t => activeTasks.includes(t.id)).map(t => (
                       <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#10b981' }}>✓</span>
                          <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>{t.label}</span>
                       </div>
                     ))
                   ) : (
                     <p style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>No active reduction tasks selected.</p>
                   )}
                </div>
              </div>
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #e2e8f0', marginTop: '32px', paddingTop: '24px' }}>
                <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter" style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {joinedChallenges.length > 0 
                    ? `${joinedChallenges.length} community efforts active` 
                    : 'No active community challenges'}
                </p>
                <p className="text-[10px] font-medium leading-relaxed italic" style={{ color: '#64748b', fontSize: '10px', fontStyle: 'italic' }}>
                  "Community-driven reduction initiatives amplify individual impact by 3.4x average."
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 px-1" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900 }}>Detailed Emission Breakdown</h3>
            <div className="space-y-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>Electricity</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{results?.electricityScore.toFixed(2)} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>Transport</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{results?.transportScore.toFixed(2)} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>Dietary</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{results?.dietScore.toFixed(2)} kg</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ height: '1px', flex: 1, backgroundColor: '#f1f5f9' }}></span>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Beyond Carbon: Eco-Action Hub</span>
                <span style={{ height: '1px', flex: 1, backgroundColor: '#f1f5f9' }}></span>
             </div>
             <div className="grid grid-cols-2 gap-8 mb-12" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
               <div className="p-8 rounded-[2.5rem]" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '32px', borderRadius: '40px' }}>
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900 }}>Water Conservation</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                     <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{waterFootprint.toLocaleString()}</span>
                     <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>Litres / mo</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b', fontSize: '11px' }}>
                    Your hydrological footprint is {waterFootprint > 4500 ? 'above' : 'within'} sustainable benchmarks. {waterFootprint > 4500 ? 'Aerators and RO waste reuse are prioritized.' : 'Efficiency maintained across variables.'}
                  </p>
               </div>
               <div className="p-8 rounded-[2.5rem]" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: '32px', borderRadius: '40px' }}>
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900 }}>Circular Economy</h3>
                  <div className="space-y-1">
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Compliance Protocol:</p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                       <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981', marginTop: '6px' }}></div>
                       <p style={{ fontSize: '10px', color: '#64748b' }}>Authorized E-Gate facility routing</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981', marginTop: '6px' }}></div>
                       <p style={{ fontSize: '10px', color: '#64748b' }}>Data sanitation (NIST standards)</p>
                    </div>
                  </div>
               </div>
             </div>
          </div>

          <div 
            className="p-10 text-white rounded-[3rem] relative overflow-hidden mb-8"
            style={{ backgroundColor: '#0f172a', marginBottom: '32px' }}
          >
             <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4" style={{ color: '#ffffff' }}>EcoTrace Advisor Strategic Roadmap</h3>
                <div className="text-sm leading-relaxed" style={{ color: '#94a3b8', fontSize: '13px' }}>
                   {messages.filter(m => m.role === 'ai').length > 0 
                     ? messages.filter(m => m.role === 'ai').slice(-1)[0].text 
                     : "Your carbon audit data indicates significant opportunities for reduction. Prioritize high-impact shifts such as transitioning to renewable energy providers and local sourcing to decrease transport logistics emissions. Generate a specific roadmap for targeted advice."
                   }
                </div>
             </div>
             <Zap className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" style={{ color: '#10b981' }} />
          </div>

          <div>
             <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900 }}>Audit Methodology</h3>
             <p className="text-[9px] leading-relaxed" style={{ color: '#cbd5e1' }}>
                This report is generated via the EcoTrace AI Analysis Engine using IPCC Tier 1 emission factors and Gemini Flash inference logic. All calculations are baseline estimates subject to variable grid intensity factors.
             </p>
          </div>

        <div className="mt-16 pt-8 flex justify-between items-center" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#cbd5e1' }}>Official AI-Certified Analysis</div>
            <div className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#cbd5e1' }}>EcoTrace.io/Verify</div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-8 sm:p-12 max-h-[80vh] overflow-y-auto scrollbar-hide rounded-[2.5rem]">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-100 rounded-2xl">
                       <ImageIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900">Report Preview</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Sustainability Impact Audit</p>
                    </div>
                 </div>

                 {/* Rendering the template in the modal */}
                 <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50 shadow-inner">
                    <div 
                      className="bg-white mx-auto transform origin-top scale-[0.6] sm:scale-[0.8] md:scale-100 p-8 sm:p-12 w-full min-w-[320px] max-w-[800px]"
                      dangerouslySetInnerHTML={{ __html: pdfTemplateRef.current?.outerHTML || '' }}
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                 </div>

                 <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-8">
                    <div className="flex items-center gap-3">
                       <Info className="w-4 h-4 text-indigo-500" />
                       <p className="text-xs font-medium text-slate-500">This is how your final PDF export will look on A4 paper.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowPreviewModal(false);
                        exportToPDF();
                      }}
                      className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-200 transition-all active:scale-95"
                    >
                      Download PDF
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      {showShareModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black dark:text-white">Share Impact</h3>
                  <button onClick={() => setShowShareModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X /></button>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                     "I just calculated my carbon footprint with EcoTrace AI! 🌿 Monthly Impact: {results?.totalScore.toFixed(2)} kg CO2. Roadmap generated to help me reduce it. 🚀"
                  </p>
               </div>
               <div className="flex gap-3">
                  <button 
                     onClick={() => {
                        navigator.clipboard.writeText(`I just calculated my carbon footprint with EcoTrace AI! 🌿 Impact: ${results?.totalScore.toFixed(2)}kg CO2`);
                        setShowShareModal(false);
                     }}
                     className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                  >
                     <Copy className="w-5 h-5" /> Copy Message
                  </button>
               </div>
            </motion.div>
         </div>
      )}

      {/* Alert Overlay */}
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl shadow-rose-500/10"
           >
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold dark:text-white mb-2">{alert.title}</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed px-4">{alert.message}</p>
                 <button 
                    onClick={() => setAlert(null)}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
                 >
                    Dismiss
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* Floating AI Agent - persistent across all views */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isAgentOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 w-[calc(100vw-2rem)] sm:w-[400px] h-[550px] sm:h-[600px] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col mb-2 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
            >
              {/* Agent Header */}
              <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">EcoTrace Analyst</h3>
                    <div className="flex items-center gap-1.5 leading-none mt-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Assistant</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setMessages([])}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                    title="Clear Chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsAgentOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-900/50 scroll-smooth">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm">
                      <Sparkles className="w-8 h-8 text-emerald-500 opacity-40" />
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-bold text-sm">Hello! I'm your EcoTrace Agent.</p>
                      <p className="text-slate-400 text-xs mt-1">Ask me anything about carbon reduction or sustainability strategies.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full pt-4">
                      {[
                        "How to reduce my energy bill?",
                        "Best diet for low CO2?",
                        "Is my commute efficient?"
                      ].map((hint, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            setChatInput(hint);
                            // handleChatSubmit will be triggered manually by user to ensure they see what's being sent
                          }}
                          className="text-[10px] font-black uppercase tracking-widest p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all text-left"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] shadow-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user' 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                    }`}>
                      {m.isLoading ? (
                        <div className="flex gap-1.5 py-1.5 items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 animate-pulse">Analyzing</span>
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" />
                          </div>
                        </div>
                      ) : m.text}
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input 
                    type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message the agent..." 
                    className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim()}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white p-3.5 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    <SendHorizontal className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAgentOpen(!isAgentOpen)}
          className={`relative group p-4 rounded-3xl shadow-2xl transition-all duration-500 overflow-hidden ${
            isAgentOpen 
            ? 'bg-rose-500 text-white rotate-90' 
            : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          <AnimatePresence mode="wait">
            {isAgentOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-7 h-7" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="flex items-center gap-3">
                <Bot className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 font-black uppercase text-[10px] tracking-widest px-0 group-hover:pl-2">
                  Eco Agent
                </span>
                {!isAgentOpen && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20 pointer-events-none" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
