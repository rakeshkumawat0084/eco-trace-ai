/**
 * EcoTrace AI - Smart Carbon Footprint Agent
 * Frontend Logic
 */

let carbonChart = null;
let trendChart = null;
let currentResults = null;
let chatHistory = [];
let lastRoadmap = "";

// DOM Elements
const calcForm = document.getElementById('calcForm');
const resultsDiv = document.getElementById('results');
const auditHistoryList = document.getElementById('auditHistory');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const totalScoreEl = document.getElementById('totalScore');
const exportPdfBtn = document.getElementById('exportPdf');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const downloadCardBtn = document.getElementById('downloadCardBtn');
const alertModal = document.getElementById('alertModal');
const alertModalContent = document.getElementById('alertModalContent');
const closeAlertModal = document.getElementById('closeAlertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadAuditHistory();
    initTheme();
    
    closeAlertModal.addEventListener('click', () => {
        alertModal.classList.add('opacity-0');
        alertModalContent.classList.add('scale-95');
        setTimeout(() => alertModal.classList.add('hidden'), 300);
    });
});

function showAlert(title, message) {
    alertTitle.innerText = title;
    alertMessage.innerText = message;
    alertModal.classList.remove('hidden');
    setTimeout(() => {
        alertModal.classList.remove('opacity-0');
        alertModalContent.classList.remove('scale-95');
    }, 10);
}

// Capture and Download Result Card as Image
downloadCardBtn.addEventListener('click', () => {
    const node = document.getElementById('captureTarget');
    if (!node) return;

    showToast("Generating image...", "info");

    htmlToImage.toPng(node, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#f8fafc',
        cacheBust: true,
    })
    .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `EcoTrace_Result_${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
        showToast("Image saved successfully!", "success");
    })
    .catch((error) => {
        console.error('oops, something went wrong!', error);
        showToast("Failed to generate image.", "error");
    });
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('ecoTraceTheme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        document.documentElement.classList.remove('dark');
        themeIcon.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
}

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ecoTraceTheme', isDark ? 'dark' : 'light');
    themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
    
    // Refresh charts if they exist
    if (currentResults) displayResults(currentResults);
    const history = JSON.parse(localStorage.getItem('ecoTraceAudits') || '[]');
    if (history.length > 0) updateTrendChart(history);
});

// Handle Calculation
calcForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(calcForm);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            currentResults = result.data;
            displayResults(currentResults);
            saveToHistory(currentResults);
            enableChat();
            
            // Auto-trigger initial AI roadmap
            getAIRoadmap(currentResults);
        } else {
            showAlert("Calculation Error", result.error || "Failed to calculate carbon footprint.");
        }
    } catch (error) {
        console.error("Calculation failed:", error);
        showAlert("Network Failure", "Unable to connect to the calculation engine. Please check your connection.");
    }
});

let activeScenarios = { ev: false, vegan: false, solar: false };

function displayResults(data) {
    resultsDiv.classList.remove('hidden');
    resultsDiv.classList.add('animate-in');
    resultsDiv.classList.remove('opacity-0');
    totalScoreEl.innerText = data.totalScore.toFixed(2);
    updateChart(data.breakdown);
    
    renderEcoBadge(data.totalScore);
    renderEcoChecklist(data.totalScore);
    renderBenchmarking(data.totalScore);
    
    // Show Simulator
    document.getElementById('simulatorCard').classList.remove('hidden');
    updateProjectedScore();

    // Goal Progress
    const goalValue = parseFloat(document.getElementById('carbonGoalInput').value);
    const goalSection = document.getElementById('goalSection');
    const goalProgressBar = document.getElementById('goalProgressBar');
    const goalPercent = document.getElementById('goalPercent');
    const goalValueEl = document.getElementById('goalValue');

    if (goalValue > 0) {
        goalSection.classList.remove('hidden');
        goalValueEl.innerText = goalValue.toFixed(0);
        
        // Progress: If actual is LESS than goal, we are doing well.
        // Actually, "Goal Progress" usually means progress towards REDUCING to that level or staying under it.
        // Let's say if you are at 500 and goal is 400, you are over the limit.
        // If you are at 300 and goal is 400, you are 100% successful.
        // Let's define progress as how close you are to NOT exceeding it.
        // Or better: progress towards the goal being your ceiling.
        
        let percentage = (goalValue / data.totalScore) * 100;
        if (data.totalScore <= goalValue) percentage = 100;
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        goalProgressBar.style.width = `${percentage}%`;
        goalPercent.innerText = `${Math.round(percentage)}%`;
        
        // Color matching
        if (percentage >= 100) {
            goalProgressBar.className = "h-full bg-emerald-600 transition-all duration-1000";
        } else if (percentage >= 70) {
            goalProgressBar.className = "h-full bg-amber-500 transition-all duration-1000";
        } else {
            goalProgressBar.className = "h-full bg-rose-500 transition-all duration-1000";
        }
    } else {
        goalSection.classList.add('hidden');
    }

    // Comparison text
    const comparisonText = document.getElementById('comparisonText');
    if (data.totalScore < 400) {
        comparisonText.innerText = "Excellent! Your footprint is significantly below the global average.";
    } else if (data.totalScore < 800) {
        comparisonText.innerText = "Good job. You are close to a sustainable monthly average.";
    } else {
        comparisonText.innerText = "High impact detected. Let's work on reducing these emissions.";
    }
}

function renderEcoBadge(total) {
    const badgeEl = document.getElementById('ecoBadge');
    badgeEl.innerHTML = '';
    
    let config = {
        label: "Carbon Consumer",
        icon: "alert-circle",
        classes: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    };
    
    if (total < 150) {
        config = {
            label: "Green Legend",
            icon: "trophy",
            classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        };
    } else if (total <= 400) {
        config = {
            label: "Eco Balancer",
            icon: "anchor",
            classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        };
    }
    
    badgeEl.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2 ${config.classes}`;
    badgeEl.innerHTML = `<i data-lucide="${config.icon}" class="w-3 h-3"></i> ${config.label}`;
    
    // Update PDF hidden placeholder
    const pdfBadge = document.getElementById('pdfBadge');
    pdfBadge.className = `inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${config.classes.replace('dark:', '')}`;
    pdfBadge.innerText = config.label;
    
    lucide.createIcons();
}

function renderEcoChecklist(baseTotal) {
    const container = document.getElementById('ecoGoalsChecklist');
    const list = document.getElementById('checklistItems');
    container.classList.remove('hidden');
    list.innerHTML = '';
    
    const tasks = [
        { label: "Switch to public transport today", reduction: 15 },
        { label: "Unplug idle electronics", reduction: 5 },
        { label: "Meatless day challenge", reduction: 10 }
    ];
    
    tasks.forEach((task, idx) => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-emerald-500/50 transition-all group";
        item.innerHTML = `
            <input type="checkbox" id="task-${idx}" class="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer">
            <label for="task-${idx}" class="flex-1 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none group-hover:text-emerald-600 transition-colors">
                ${task.label}
            </label>
            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">-${task.reduction}kg</span>
        `;
        
        const checkbox = item.querySelector('input');
        checkbox.addEventListener('change', () => {
            simulateScoreReduction();
        });
        
        list.appendChild(item);
    });
}

function simulateScoreReduction() {
    let currentTotal = currentResults.totalScore;
    const checkboxes = document.querySelectorAll('#checklistItems input[type="checkbox"]');
    const tasks = [
        { reduction: 15 },
        { reduction: 5 },
        { reduction: 10 }
    ];
    
    checkboxes.forEach((cb, idx) => {
        if (cb.checked) {
            currentTotal -= tasks[idx].reduction;
        }
    });
    
    totalScoreEl.innerText = Math.max(0, currentTotal).toFixed(2);
    
    // Animate the text to draw attention to the change
    totalScoreEl.classList.add('text-emerald-600', 'scale-110');
    setTimeout(() => {
        totalScoreEl.classList.remove('scale-110');
        setTimeout(() => totalScoreEl.classList.remove('text-emerald-600'), 500);
    }, 200);
}

function updateChart(breakdown) {
    const ctx = document.getElementById('carbonChart').getContext('2d');
    
    if (carbonChart) {
        carbonChart.destroy();
    }

    carbonChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Energy', 'Transport', 'Diet'],
            datasets: [{
                data: [breakdown.electricity, breakdown.transport, breakdown.diet],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Chat Logic
function enableChat() {
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
}

async function getAIRoadmap(results) {
    addMessage("ai", "Analyzing your footprint... Generating personalized sustainability roadmap 🌿", true);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Hello EcoTrace! Please analyze my footprint and give me a reduction roadmap.",
                context: results,
                history: chatHistory
            })
        });
        const data = await response.json();
        
        // Remove loading message
        const loadingMsg = chatMessages.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();
        
        if (data.error) {
            addMessage("ai", `Error: ${data.error}. Please try again in a moment.`);
            showAlert("AI Engine Busy", data.error);
            return;
        }

        lastRoadmap = data.response;
        addMessage("ai", data.response);
        chatHistory.push({ role: "user", parts: [{ text: "Hello EcoTrace! Please analyze my footprint and give me a reduction roadmap." }] });
        chatHistory.push({ role: "model", parts: [{ text: data.response }] });
    } catch (error) {
        const loadingMsg = chatMessages.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();
        addMessage("ai", "I'm having trouble connecting right now. Please check your internet or try again later.");
        console.error("AI Chat failed:", error);
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMessage("user", msg);
    chatInput.value = '';
    
    addMessage("ai", "Thinking...", true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                context: currentResults,
                history: chatHistory
            })
        });
        const data = await response.json();
        
        const loadingMsg = chatMessages.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();
        
        if (data.error) {
            addMessage("ai", `Error: ${data.error}. Please try again later.`);
            showAlert("AI Processing Error", data.error);
            return;
        }

        addMessage("ai", data.response);
        chatHistory.push({ role: "user", parts: [{ text: msg }] });
        chatHistory.push({ role: "model", parts: [{ text: data.response }] });
    } catch (error) {
        const loadingMsg = chatMessages.querySelector('.loading-msg');
        if (loadingMsg) loadingMsg.remove();
        addMessage("ai", "Sorry, I couldn't process that request right now.");
        console.error("AI Chat failed:", error);
    }
});

function addMessage(role, text, isLoading = false) {
    if (!text && !isLoading) return;

    const div = document.createElement('div');
    const isDark = document.documentElement.classList.contains('dark');
    
    div.classList.add('animate-in');
    
    if (role === "user") {
        div.className = "animate-in bg-white dark:bg-slate-800 p-4 rounded-2xl max-w-[90%] border border-slate-200 dark:border-slate-700 self-end ml-auto shadow-sm";
    } else {
        div.className = "animate-in bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl max-w-[90%] border border-emerald-100 dark:border-emerald-900/50 self-start text-emerald-900 dark:text-emerald-100";
    }
    
    if (isLoading) div.classList.add('loading-msg', 'animate-pulse');

    // Use marked for markdown parsing
    if (role === "ai" && !isLoading) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'markdown-body text-sm leading-relaxed dark:prose-invert';
        contentDiv.innerHTML = marked.parse(text || "No response received.");
        div.appendChild(contentDiv);
    } else {
        const p = document.createElement('p');
        p.className = 'text-sm';
        p.innerText = text || "";
        div.appendChild(p);
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// History & LocalStorage
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('ecoTraceAudits') || '[]');
    const goalValue = parseFloat(document.getElementById('carbonGoalInput').value) || 0;
    const newAudit = {
        totalScore: data.totalScore,
        timestamp: new Date().toLocaleString(),
        breakdown: data.breakdown,
        goal: goalValue
    };
    
    history.unshift(newAudit);
    history = history.slice(0, 5); // Keep last 5
    localStorage.setItem('ecoTraceAudits', JSON.stringify(history));
    loadAuditHistory();
}

function loadAuditHistory() {
    const history = JSON.parse(localStorage.getItem('ecoTraceAudits') || '[]');
    if (history.length === 0) return;

    updateTrendChart(history);

    auditHistoryList.innerHTML = '';
    history.forEach(audit => {
        const li = document.createElement('li');
        li.className = "p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between items-center border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer";
        li.innerHTML = `
            <div>
                <p class="font-bold text-emerald-700 dark:text-emerald-400">${audit.totalScore.toFixed(2)} kg</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">${audit.timestamp}</p>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 dark:text-slate-600"></i>
        `;
        auditHistoryList.appendChild(li);
    });
    lucide.createIcons();
}

function updateTrendChart(history) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }

    // Reverse history to show oldest to newest for trend
    const reversedHistory = [...history].reverse();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reversedHistory.map(h => h.timestamp.split(',')[0]),
            datasets: [{
                label: 'Carbon Footprint',
                data: reversedHistory.map(h => h.totalScore),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { display: false },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                    }
                }
            }
        }
    });
}

// PDF Export
exportPdfBtn.addEventListener('click', () => {
    if (!currentResults) {
        alert("Please calculate your footprint first!");
        return;
    }

    const element = document.getElementById('pdf-report');
    element.classList.remove('hidden');
    
    // Calculate current simulated total (including checklist reductions)
    let currentTotalValue = currentResults.totalScore;
    const checkboxes = document.querySelectorAll('#checklistItems input[type="checkbox"]');
    const tasks = [{ reduction: 15 }, { reduction: 5 }, { reduction: 10 }];
    checkboxes.forEach((cb, idx) => { if (cb.checked) currentTotalValue -= tasks[idx].reduction; });

    // Fill PDF template
    document.getElementById('reportDate').innerText = new Date().toLocaleDateString();
    document.getElementById('pdfTotalScore').innerText = Math.max(0, currentTotalValue).toFixed(2);
    document.getElementById('pdfEnergyScore').innerText = currentResults.electricityScore.toFixed(2);
    document.getElementById('pdfTransportScore').innerText = currentResults.transportScore.toFixed(2);
    document.getElementById('pdfDietScore').innerText = currentResults.dietScore.toFixed(2);
    document.getElementById('pdfRoadmap').innerHTML = marked.parse(lastRoadmap || "No roadmap generated yet.");

    const opt = {
        margin: 1,
        filename: 'EcoTrace_Carbon_Audit.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
        element.classList.add('hidden');
        showToast("PDF Report exported successfully!", "success");
    });
});

function renderBenchmarking(total) {
    const pointer = document.getElementById('benchmarkPointer');
    // Scale: 0 to 800kg map to 0-100%
    let percent = (total / 800) * 100;
    percent = Math.max(0, Math.min(100, percent));
    pointer.style.left = `${percent}%`;
}

function toggleScenario(type) {
    activeScenarios[type] = !activeScenarios[type];
    const btn = document.getElementById(`scenario-${type}`);
    const toggle = btn.querySelector('.scenario-toggle');
    
    if (activeScenarios[type]) {
        btn.classList.add('bg-emerald-600', 'border-emerald-400');
        btn.classList.remove('bg-emerald-800/50', 'border-emerald-800');
        toggle.classList.add('translate-x-3', 'bg-white');
        toggle.classList.remove('left-0.5');
    } else {
        btn.classList.remove('bg-emerald-600', 'border-emerald-400');
        btn.classList.add('bg-emerald-800/50', 'border-emerald-800');
        toggle.classList.remove('translate-x-3', 'bg-white');
        toggle.classList.add('left-0.5');
    }
    
    updateProjectedScore();
}

function updateProjectedScore() {
    if (!currentResults) return;
    
    let simTotal = currentResults.totalScore;
    let breakdown = { ...currentResults };

    if (activeScenarios.ev) simTotal -= (breakdown.transportScore * 0.4);
    if (activeScenarios.vegan) simTotal -= (breakdown.dietScore * 0.5);
    if (activeScenarios.solar) simTotal -= (breakdown.electricityScore * 0.7);

    const projectedEl = document.getElementById('projectedScore');
    projectedEl.innerText = Math.max(0, simTotal).toFixed(2);
    projectedEl.classList.add('text-emerald-300', 'animate-pulse');
    setTimeout(() => projectedEl.classList.remove('animate-pulse'), 1000);
}

function resetScenarios() {
    activeScenarios = { ev: false, vegan: false, solar: false };
    ['ev', 'vegan', 'solar'].forEach(type => {
        const btn = document.getElementById(`scenario-${type}`);
        const toggle = btn.querySelector('.scenario-toggle');
        btn.classList.remove('bg-emerald-600', 'border-emerald-400');
        btn.classList.add('bg-emerald-800/50', 'border-emerald-800');
        toggle.classList.remove('translate-x-3', 'bg-white');
        toggle.classList.add('left-0.5');
    });
    updateProjectedScore();
}

function joinChallenge(btn, roleName) {
    btn.disabled = true;
    btn.innerText = "Joined!";
    btn.className = "bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-4 py-1.5 rounded-lg cursor-default";
    
    showToast(`Welcome ${roleName}! Challenge active.`, "success");
    
    // Add to user badge
    const badgeEl = document.getElementById('ecoBadge');
    const currentText = badgeEl.innerText;
    badgeEl.innerHTML = `<i data-lucide="shield-check" class="w-3 h-3"></i> ${currentText} (+${roleName})`;
    lucide.createIcons();
}

const shareImpactBtn = document.getElementById('shareImpactBtn');
const shareModal = document.getElementById('shareModal');
const shareModalContent = document.getElementById('shareModalContent');
const closeShareModal = document.getElementById('closeShareModal');
const shareText = document.getElementById('shareText');
const copyShareBtn = document.getElementById('copyShareBtn');

// Share Modal Logic
shareImpactBtn.addEventListener('click', () => {
    if (!currentResults) return;
    
    const text = `I just calculated my carbon footprint with EcoTrace AI! 🌿\n\nMonthly Impact: ${currentResults.totalScore.toFixed(2)} kg CO2\nRoadmap generated to help me reduce it. 🚀\n\nCheck yours here: ${window.location.href}`;
    shareText.value = text;
    
    shareModal.classList.remove('hidden');
    setTimeout(() => {
        shareModal.classList.remove('opacity-0');
        shareModalContent.classList.remove('scale-95');
    }, 10);
});

closeShareModal.addEventListener('click', () => {
    shareModal.classList.add('opacity-0');
    shareModalContent.classList.add('scale-95');
    setTimeout(() => shareModal.classList.add('hidden'), 300);
});

shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) closeShareModal.click();
});

copyShareBtn.addEventListener('click', () => {
    shareText.select();
    document.execCommand('copy');
    showToast("Message copied to clipboard!", "success");
    closeShareModal.click();
});

function showToast(message, type = "info") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const bgColor = type === "success" ? "bg-emerald-600" : "bg-slate-800";
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-lg transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto flex items-center gap-3`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i>
        <span class="font-medium">${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Trigger entry animation
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-[-10px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
