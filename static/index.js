/**
 * OpinionGraph AI - Application Logic (Enterprise Version)
 */

// ==========================================
// 1. App Router
// ==========================================
class Router {
    constructor() {
        this.routes = [
            'home', 'platform', 'problem', 'solution', 'why', 'features', 'how', 
            'demo', 'live', 'dashboard', 'summary', 'explorer', 'topic', 'wordcloud', 
            'analytics', 'report', 'history', 'docs'
        ];
        this.init();
    }
    init() {
        window.addEventListener('hashchange', () => this.handleRouting());
        if (!window.location.hash) window.location.hash = '#home';
        else this.handleRouting();
    }
    handleRouting() {
        let hash = window.location.hash.substring(1);
        if (!this.routes.includes(hash)) hash = 'home';
        
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const targetView = document.getElementById(`view-${hash}`);
        if(targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
        if (activeLink) activeLink.classList.add('active');

        if (hash === 'history') appHistory.renderHistoryTable();
    }
    navigate(route) {
        window.location.hash = `#${route}`;
    }
}

// ==========================================
// 2. UI Content Generation
// ==========================================
class UIBuilder {
    static renderFeatures() {
        const container = document.querySelector('.features-grid');
        if(!container) return;
        const features = [
            { icon: 'brain-circuit', title: 'Sentiment Analysis', desc: 'Accurately classify stakeholder feedback into support, opposition, or neutral observations.' },
            { icon: 'file-text', title: 'AI Summaries', desc: 'Distill 10-page responses into actionable executive summaries.' },
            { icon: 'network', title: 'Topic Discovery', desc: 'Automatically cluster feedback into thematic issues without predefined tags.' },
            { icon: 'hash', title: 'Keyword Extraction', desc: 'Identify the most frequently debated terms across the entire consultation.' },
            { icon: 'bar-chart-2', title: 'Visual Analytics', desc: 'Interactive dashboards displaying real-time opinion distribution and trends.' },
            { icon: 'download', title: 'Report Generation', desc: 'Export comprehensive PDF reports ready for executive review.' }
        ];
        container.innerHTML = `<div class="grid-3">${features.map(f => `
            <div class="feature-card">
                <i data-lucide="${f.icon}"></i>
                <h4>${f.title}</h4>
                <p>${f.desc}</p>
            </div>`).join('')}</div>`;
    }

    static renderWorkflow() {
        const container = document.querySelector('.workflow-timeline');
        if(!container) return;
        const steps = [
            { title: 'Data Ingestion', desc: 'Upload bulk PDFs or CSVs.' },
            { title: 'AI Extraction', desc: 'System parses text and isolates arguments.' },
            { title: 'Semantic Analysis', desc: 'Models determine sentiment and summarize intent.' },
            { title: 'Insight Generation', desc: 'Dashboards populate with aggregated analytics.' }
        ];
        container.innerHTML = `<div class="grid-4" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem;">${steps.map((s,i) => `
            <div style="text-align:center; padding:1rem;">
                <div style="width:40px; height:40px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem auto; font-weight:bold;">${i+1}</div>
                <h4>${s.title}</h4>
                <p style="font-size:0.875rem;">${s.desc}</p>
            </div>`).join('')}</div>`;
    }
}

// ==========================================
// 3. History Management
// ==========================================
class HistoryManager {
    saveAnalysis(data) {
        let history = JSON.parse(localStorage.getItem('og_history') || '[]');
        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            datasetName: 'Consultation Upload',
            totalResponses: data.length,
            overallSentiment: DashboardManager.calculateOverallSentiment(data),
            data: data
        };
        history.push(record);
        localStorage.setItem('og_history', JSON.stringify(history));
    }
    
    getHistory() {
        return JSON.parse(localStorage.getItem('og_history') || '[]');
    }

    renderHistoryTable() {
        const history = this.getHistory();
        const tbody = document.getElementById('history-tbody');
        if(!tbody) return;
        if(history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No history found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = history.reverse().map(h => `
            <tr>
                <td>${h.date}</td>
                <td><strong>${h.datasetName}</strong></td>
                <td>${h.totalResponses}</td>
                <td><span class="badge-status ${h.overallSentiment === 'Positive' ? 'badge-pos' : h.overallSentiment === 'Negative' ? 'badge-neg' : 'badge-neu'}">${h.overallSentiment}</span></td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="appEngine.loadFromHistory(${h.id})">Load</button>
                    <button class="btn btn-outline btn-small" style="color:var(--danger); border-color:var(--danger)" onclick="appHistory.deleteRecord(${h.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    deleteRecord(id) {
        let history = this.getHistory();
        history = history.filter(h => h.id !== id);
        localStorage.setItem('og_history', JSON.stringify(history));
        this.renderHistoryTable();
    }
}

// ==========================================
// 4. Dashboard & Visualizations
// ==========================================
class DashboardManager {
    static currentChart = null;
    static currentAdvancedChart = null;
    static currentCategoryChart = null;
    static analyticsCharts = [];
    static explorerData = [];

    static calculateOverallSentiment(data) {
        const counts = { Positive: 0, Negative: 0, Neutral: 0 };
        data.forEach(d => { if(counts[d.sentiment] !== undefined) counts[d.sentiment]++; });
        if(counts.Positive > counts.Negative && counts.Positive > counts.Neutral) return 'Positive';
        if(counts.Negative > counts.Positive && counts.Negative > counts.Neutral) return 'Negative';
        return 'Neutral';
    }

    static populateDashboard(data) {
        document.getElementById('dashboard-empty-state').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');

        // Basic Stats
        document.getElementById('dash-total').textContent = data.length;
        const overall = this.calculateOverallSentiment(data);
        const sentimentEl = document.getElementById('dash-sentiment');
        sentimentEl.textContent = overall;
        sentimentEl.className = overall === 'Positive' ? 'text-success' : overall === 'Negative' ? 'text-danger' : 'text-muted';
        
        let totalConf = 0;
        // Build aggregate keyword frequency map using frequency data from API
        const allKeywordFreqs = {};
        data.forEach(d => {
            totalConf += (d.confidence || 0);
            // Use keyword_frequencies if available for accurate sizing, fallback to keywords array
            if (d.keyword_frequencies) {
                Object.entries(d.keyword_frequencies).forEach(([word, freq]) => {
                    allKeywordFreqs[word] = (allKeywordFreqs[word] || 0) + freq;
                });
            } else if (d.keywords) {
                d.keywords.forEach(kw => {
                    allKeywordFreqs[kw] = (allKeywordFreqs[kw] || 0) + 1;
                });
            }
        });
        document.getElementById('dash-conf').textContent = data.length ? ((totalConf / data.length) * 100).toFixed(1) + '%' : '0%';
        
        // Topic (Most frequent keyword)
        const topKw = Object.keys(allKeywordFreqs).length ? Object.keys(allKeywordFreqs).reduce((a, b) => allKeywordFreqs[a] > allKeywordFreqs[b] ? a : b) : 'N/A';
        document.getElementById('dash-topic').textContent = topKw;

        this.renderSentimentChart(data);
        this.renderConfidenceHistogram(data);
        this.renderCategoryChart(data);
        this.renderWordCloud(allKeywordFreqs, 'dash-wordcloud');
        this.renderWordCloud(allKeywordFreqs, 'interactive-wordcloud');

        this.explorerData = data;
        this.bindExplorerEvents();
        this.renderExplorerTable();

        this.populateSummary(data, allKeywordFreqs);
        this.renderAdvancedAnalytics(data, allKeywordFreqs);
    }

    static renderSentimentChart(data) {
        const ctx = document.getElementById('chart-sentiment').getContext('2d');
        if(this.currentChart) this.currentChart.destroy();
        
        let pos=0, neg=0, neu=0;
        data.forEach(d => {
            if(d.sentiment === 'Positive') pos++;
            else if(d.sentiment === 'Negative') neg++;
            else neu++;
        });

        this.currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Negative', 'Neutral'],
                datasets: [{
                    data: [pos, neg, neu],
                    backgroundColor: ['#10b981', '#ef4444', '#94a3b8'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    static renderConfidenceHistogram(data) {
        const ctx = document.getElementById('chart-advanced');
        if(!ctx) return;
        if(this.currentAdvancedChart) this.currentAdvancedChart.destroy();
        
        let buckets = { '< 50%': 0, '50-65%': 0, '65-80%': 0, '80-100%': 0 };
        data.forEach(d => {
            const conf = d.confidence || 0;
            if(conf < 0.5) buckets['< 50%']++;
            else if(conf < 0.65) buckets['50-65%']++;
            else if(conf < 0.8) buckets['65-80%']++;
            else buckets['80-100%']++;
        });

        this.currentAdvancedChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    label: 'Number of Responses',
                    data: Object.values(buckets),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    static renderCategoryChart(data) {
        const ctx = document.getElementById('chart-category');
        if(!ctx) return;
        if(this.currentCategoryChart) this.currentCategoryChart.destroy();
        
        const categories = [...new Set(data.map(d => d.category).filter(c => c && c !== 'Unknown' && c !== 'System'))];
        if (!categories.length) {
            ctx.parentElement.innerHTML = '<div class="center text-muted py-4" style="height:100%; display:flex; align-items:center; justify-content:center;"><p>No category column detected in your dataset. Add a "Category" or "Stakeholder" column to see this chart.</p></div>';
            return;
        }
        
        const posData = [], negData = [], neuData = [];
        categories.forEach(cat => {
            const subset = data.filter(d => d.category === cat);
            posData.push(subset.filter(d => d.sentiment === 'Positive').length);
            negData.push(subset.filter(d => d.sentiment === 'Negative').length);
            neuData.push(subset.filter(d => d.sentiment === 'Neutral').length);
        });

        this.currentCategoryChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    { label: 'Positive', data: posData, backgroundColor: '#10b981' },
                    { label: 'Negative', data: negData, backgroundColor: '#ef4444' },
                    { label: 'Neutral', data: neuData, backgroundColor: '#94a3b8' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    static renderWordCloud(freqMap, elementId) {
        const container = document.getElementById(elementId);
        if(!container) return;
        container.innerHTML = '';

        const entries = Object.entries(freqMap).filter(([word]) => word.length >= 4);
        if (entries.length === 0) {
            container.innerHTML = '<div class="center p-4">No keywords found.</div>';
            return;
        }

        const maxFreq = Math.max(...entries.map(([,f]) => f));
        const words = entries.map(([text, freq]) => ({ text, size: 12 + Math.round((freq / maxFreq) * 50) }));

        setTimeout(() => {
            if(container.clientWidth === 0) return;
            const colors = ['#1d4ed8', '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#0891b2'];
            const layout = d3.layout.cloud()
                .size([container.clientWidth, Math.max(container.clientHeight, 250)])
                .words(words)
                .padding(6)
                .rotate(() => (Math.random() > 0.7 ? 90 : 0))
                .font("Inter")
                .fontSize(d => d.size)
                .on("end", draw);
            layout.start();
            
            function draw(drawnWords) {
                d3.select(container).append("svg")
                    .attr("width", layout.size()[0])
                    .attr("height", layout.size()[1])
                    .append("g")
                    .attr("transform", `translate(${layout.size()[0]/2},${layout.size()[1]/2})`)
                    .selectAll("text")
                    .data(drawnWords).enter().append("text")
                    .style("font-size", d => `${d.size}px`)
                    .style("font-family", "Inter")
                    .style("font-weight", "700")
                    .style("fill", () => colors[Math.floor(Math.random() * colors.length)])
                    .attr("text-anchor", "middle")
                    .attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                    .style("cursor", "pointer")
                    .text(d => d.text)
                    .on("click", function(event, d) {
                        // Support both D3 v5 and D3 v6+ (d might be first or second arg)
                        const wordText = d ? d.text : event.text; 
                        
                        // Switch to explorer tab using app router
                        if (typeof appRouter !== 'undefined') {
                            appRouter.navigate('explorer');
                        }

                        // Set search input and trigger filter
                        setTimeout(() => {
                            const searchInput = document.getElementById('explorer-search');
                            if (searchInput) {
                                searchInput.value = wordText;
                                searchInput.dispatchEvent(new Event('input'));
                            }
                        }, 100);
                    });
            }
        }, 100);
    }

    static bindExplorerEvents() {
        const searchInput = document.getElementById('explorer-search');
        const filterSelect = document.getElementById('explorer-filter');
        if(searchInput) {
            // Remove old listener by cloning
            const fresh = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(fresh, searchInput);
            fresh.addEventListener('input', () => this.renderExplorerTable());
        }
        if(filterSelect) {
            const fresh = filterSelect.cloneNode(true);
            filterSelect.parentNode.replaceChild(fresh, filterSelect);
            fresh.addEventListener('change', () => this.renderExplorerTable());
        }
    }

    static renderExplorerTable() {
        const searchInput = document.getElementById('explorer-search');
        const filterSelect = document.getElementById('explorer-filter');
        const tbody = document.getElementById('explorer-tbody');
        const pagination = document.getElementById('explorer-pagination');
        const query = searchInput ? searchInput.value.toLowerCase() : '';
        const filter = filterSelect ? filterSelect.value : '';

        let filteredData = this.explorerData.filter(d => {
            const text = (d.original || '').toLowerCase();
            const summary = (d.summary || '').toLowerCase();
            const category = (d.category || '').toLowerCase();
            const matchesSearch = !query || text.includes(query) || summary.includes(query) || category.includes(query);
            const matchesFilter = !filter || d.sentiment === filter;
            return matchesSearch && matchesFilter;
        });

        // Show ALL rows, no pagination
        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No results found.</td></tr>';
            if(pagination) pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = filteredData.map((d) => {
            const badgeClass = d.sentiment === 'Positive' ? 'badge-pos' : d.sentiment === 'Negative' ? 'badge-neg' : 'badge-neu';
            const snippet = d.original.length > 100 ? d.original.substring(0,100) + '...' : d.original;
            const safeOrig = d.original.replace(/\\/g, '\\\\').replace(/`/g, "'").replace(/\n/g, ' ');
            return `
            <tr>
                <td style="font-weight:600; font-size:0.875rem;">${d.category || 'N/A'}</td>
                <td title="${d.original.replace(/"/g, '&quot;')}">${snippet}</td>
                <td><span class="badge-status ${badgeClass}">${d.sentiment}</span></td>
                <td style="font-size:0.875rem">${d.summary || d.original}</td>
                <td><button class="btn btn-secondary btn-small" onclick="DashboardManager.showCommentModal(${filteredData.indexOf(d)})">View</button></td>
            </tr>`;
        }).join('');

        if(pagination) pagination.innerHTML = `<span class="text-muted" style="font-size:0.875rem;">Showing ${filteredData.length} of ${this.explorerData.length} comments</span>`;
    }

    static showCommentModal(index) {
        const d = this.explorerData[index];
        if(!d) return;
        const badgeClass = d.sentiment === 'Positive' ? 'badge-pos' : d.sentiment === 'Negative' ? 'badge-neg' : 'badge-neu';
        const keywords = (d.keywords || []).join(', ') || 'N/A';
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;padding:2rem;max-width:700px;width:90%;max-height:80vh;overflow-y:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <h3 style="color:#0f172a;">Full Comment Details</h3>
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="border:none;background:#f1f5f9;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;">Close</button>
                </div>
                <div style="margin-bottom:1rem;padding:0.5rem 1rem;background:#f8fafc;border-radius:8px;">
                    <strong>Category:</strong> ${d.category || 'N/A'} &nbsp;|&nbsp; <span class="badge-status ${badgeClass}">${d.sentiment}</span> &nbsp;|&nbsp; <strong>Confidence:</strong> ${((d.confidence||0)*100).toFixed(1)}%
                </div>
                <div style="margin-bottom:1rem;">
                    <strong style="display:block;margin-bottom:0.5rem;">Original Comment:</strong>
                    <p style="background:#f8fafc;padding:1rem;border-radius:8px;line-height:1.7;color:#0f172a;">${d.original}</p>
                </div>
                <div style="margin-bottom:1rem;">
                    <strong style="display:block;margin-bottom:0.5rem;">AI Summary:</strong>
                    <p style="background:#e0e7ff;padding:1rem;border-radius:8px;line-height:1.7;color:#1d4ed8;">${d.summary || d.original}</p>
                </div>
                <div>
                    <strong>Key Terms:</strong> <span style="color:#64748b;">${keywords}</span>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    }

    static populateSummary(data, allKeywordFreqs) {
        const counts = { Positive: 0, Negative: 0, Neutral: 0 };
        data.forEach(d => { if(counts[d.sentiment] !== undefined) counts[d.sentiment]++; });
        const total = data.length;
        const posPct = ((counts.Positive / total) * 100).toFixed(1);
        const negPct = ((counts.Negative / total) * 100).toFixed(1);
        const neuPct = ((counts.Neutral / total) * 100).toFixed(1);
        const avgConf = ((data.reduce((s, d) => s + (d.confidence || 0), 0) / total) * 100).toFixed(1);
        const topKeywords = Object.entries(allKeywordFreqs)
            .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w).join(', ');
        const overall = this.calculateOverallSentiment(data);

        document.getElementById('exec-summary-text').innerHTML = `
            <p>A total of <strong>${total}</strong> stakeholder responses were analyzed. The overall consultation sentiment is <strong>${overall}</strong>.</p>
            <ul style="margin-top:1rem; padding-left:1.5rem; line-height:2;">
                <li><strong>Positive responses:</strong> ${counts.Positive} (${posPct}%)</li>
                <li><strong>Negative responses:</strong> ${counts.Negative} (${negPct}%)</li>
                <li><strong>Neutral responses:</strong> ${counts.Neutral} (${neuPct}%)</li>
                <li><strong>Average AI Confidence:</strong> ${avgConf}%</li>
                <li><strong>Top Discussion Terms:</strong> ${topKeywords || 'N/A'}</li>
            </ul>
            <p style="margin-top:1rem;">Below are the most significant positive and negative observations extracted by the AI from individual submissions.</p>
        `;
        
        // Show all positive & negative summaries, not capped at 5
        let pos = [], neg = [];
        data.forEach(d => {
            const text = d.summary && d.summary !== d.original ? d.summary : d.original;
            if(d.sentiment === 'Positive' && text) pos.push({ text, original: d.original });
            if(d.sentiment === 'Negative' && text) neg.push({ text, original: d.original });
        });

        const renderList = (items) => items.map(item => `
            <li style="margin-bottom:0.75rem;">
                <span style="display:block;color:#0f172a;">${item.text}</span>
                ${item.text !== item.original ? `<small style="color:#94a3b8;">Original: "${item.original.substring(0,80)}${item.original.length>80?'...':''}"</small>` : ''}
            </li>
        `).join('');

        document.getElementById('positive-obs').innerHTML = pos.length ? renderList(pos) : '<li>No positive observations extracted.</li>';
        document.getElementById('negative-obs').innerHTML = neg.length ? renderList(neg) : '<li>No negative observations extracted.</li>';
    }

    static renderAdvancedAnalytics(data, allKeywordFreqs) {
        // Destroy old charts
        this.analyticsCharts.forEach(c => c.destroy());
        this.analyticsCharts = [];

        // 1. Sentiment Pie
        const ctxSent = document.getElementById('chart-analytics-sentiment');
        if(ctxSent) {
            let pos=0, neg=0, neu=0;
            data.forEach(d => { if(d.sentiment==='Positive') pos++; else if(d.sentiment==='Negative') neg++; else neu++; });
            this.analyticsCharts.push(new Chart(ctxSent.getContext('2d'), {
                type: 'pie',
                data: { labels: ['Positive','Negative','Neutral'], datasets: [{ data: [pos,neg,neu], backgroundColor: ['#10b981','#ef4444','#94a3b8'], borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            }));
        }

        // 2. Comment Length Histogram
        const ctxLen = document.getElementById('chart-analytics-length');
        if(ctxLen) {
            const lengths = data.map(d => (d.original||'').split(' ').length);
            const buckets = { '1-5 words': 0, '6-15 words': 0, '16-30 words': 0, '31-50 words': 0, '50+ words': 0 };
            lengths.forEach(l => {
                if(l <= 5) buckets['1-5 words']++;
                else if(l <= 15) buckets['6-15 words']++;
                else if(l <= 30) buckets['16-30 words']++;
                else if(l <= 50) buckets['31-50 words']++;
                else buckets['50+ words']++;
            });
            this.analyticsCharts.push(new Chart(ctxLen.getContext('2d'), {
                type: 'bar',
                data: { labels: Object.keys(buckets), datasets: [{ label: 'Comments', data: Object.values(buckets), backgroundColor: '#6366f1' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
            }));
        }

        // 3. Top Keywords Bar
        const ctxKw = document.getElementById('chart-analytics-keywords');
        if(ctxKw) {
            const top10 = Object.entries(allKeywordFreqs).sort((a,b) => b[1]-a[1]).slice(0,10);
            this.analyticsCharts.push(new Chart(ctxKw.getContext('2d'), {
                type: 'bar',
                data: { labels: top10.map(([w])=>w), datasets: [{ label: 'Frequency', data: top10.map(([,f])=>f), backgroundColor: '#0891b2' }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            }));
        }

        // 4. Confidence Distribution
        const ctxConf = document.getElementById('chart-analytics-confidence');
        if(ctxConf) {
            const buckets = { '< 50%': 0, '50-65%': 0, '65-80%': 0, '80-100%': 0 };
            data.forEach(d => {
                const c = d.confidence || 0;
                if(c < 0.5) buckets['< 50%']++;
                else if(c < 0.65) buckets['50-65%']++;
                else if(c < 0.8) buckets['65-80%']++;
                else buckets['80-100%']++;
            });
            this.analyticsCharts.push(new Chart(ctxConf.getContext('2d'), {
                type: 'bar',
                data: { labels: Object.keys(buckets), datasets: [{ label: 'Responses', data: Object.values(buckets), backgroundColor: '#f59e0b' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
            }));
        }
    }
}




// ==========================================
// 5. Analysis Engine (File handling & API)
// ==========================================
class AnalysisEngine {
    constructor() {
        this.files = [];
        this.bindEvents();
    }
    bindEvents() {
        const dropZone = document.getElementById('demo-drop-zone');
        const fileInput = document.getElementById('demo-file-input');
        const analyzeBtn = document.getElementById('demo-analyze-btn');
        
        if(dropZone) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); this.handleFiles(e.dataTransfer.files); });
        }
        if(fileInput) {
            fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
        }
        if(analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }
    }

    handleFiles(filesList) {
        this.files = Array.from(filesList);
        const listEl = document.getElementById('demo-file-list');
        listEl.innerHTML = this.files.map(f => `<div class="text-sm mt-1 p-2 bg-light border-radius-sm" style="color: var(--text-dark); font-weight: 500;"><i data-lucide="file" style="width:14px; vertical-align:middle;"></i> ${f.name}</div>`).join('');
        lucide.createIcons();
        document.getElementById('demo-analyze-btn').disabled = this.files.length === 0;
    }
    
    detectCommentColumn(rows) {
        if (!rows.length) return null;
        const headers = Object.keys(rows[0]);
        const preferred = headers.find(h => /comment|observation|suggestion|feedback/i.test(h));
        if (preferred) return preferred;
        return headers.reduce((best, h) => {
            const avg = rows.slice(0,5).reduce((s, r) => s + (String(r[h])||'').length, 0) / 5;
            return avg > (best.avg||0) ? { col: h, avg } : best;
        }, {}).col;
    }
    
    detectCategoryColumn(rows) {
        if (!rows.length) return null;
        const headers = Object.keys(rows[0]);
        return headers.find(h => /category|type|stakeholder/i.test(h));
    }

    async extractFromCSV(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data;
                    const commentCol = this.detectCommentColumn(rows);
                    const catCol = this.detectCategoryColumn(rows);
                    if(!commentCol) resolve([]);
                    
                    const extracted = rows.map(r => ({
                        text: String(r[commentCol]).trim(),
                        category: catCol ? String(r[catCol]).trim() : 'Unknown'
                    })).filter(r => r.text.length > 15);
                    resolve(extracted);
                }
            });
        });
    }
    
    async extractFromExcel(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws);
                const commentCol = this.detectCommentColumn(rows);
                const catCol = this.detectCategoryColumn(rows);
                if(!commentCol) resolve([]);
                
                const extracted = rows.map(r => ({
                    text: String(r[commentCol]).trim(),
                    category: catCol ? String(r[catCol]).trim() : 'Unknown'
                })).filter(r => r.text.length > 15);
                resolve(extracted);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async startAnalysis() {
        appRouter.navigate('live');
        const steps = ['Reading Files...', 'Extracting Feedback...', 'Running Bulk AI Analysis...', 'Generating Executive Summaries...', 'Building Intelligence Dashboard...'];
        const listEl = document.getElementById('processing-steps-list');
        const progressEl = document.getElementById('processing-progress');
        const titleEl = document.getElementById('processing-title');
        
        listEl.innerHTML = steps.map(s => `<li><i data-lucide="circle"></i> <span>${s}</span></li>`).join('');
        lucide.createIcons();
        const lis = listEl.querySelectorAll('li');
        
        const markDone = (index, stepText) => {
            lis[index].classList.remove('active');
            lis[index].classList.add('done');
            lis[index].innerHTML = `<i data-lucide="check-circle"></i> <span>${stepText}</span>`;
            lucide.createIcons();
        };

        // 1 & 2. Extraction
        lis[0].classList.add('active'); progressEl.style.width = '10%'; titleEl.textContent = steps[0];
        let allComments = [];
        for(let file of this.files) {
            if(file.name.endsWith('.csv')) {
                const extracted = await this.extractFromCSV(file);
                allComments.push(...extracted);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const extracted = await this.extractFromExcel(file);
                allComments.push(...extracted);
            }
        }
        
        if(allComments.length === 0) allComments = [{ text: "This is a fallback comment since parsing failed.", category: "System" }];
        
        markDone(0, steps[0]);
        markDone(1, steps[1]);
        
        // 3 & 4. Batch API Call
        lis[2].classList.add('active'); progressEl.style.width = '40%'; titleEl.textContent = `Analyzing ${allComments.length} comments via AI Engine...`;
        
        // We only send texts to the backend. We'll map categories back after.
        const texts = allComments.map(c => c.text);
        let results = [];
        
        try {
            const res = await fetch('/analyze-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: texts })
            });
            if(res.ok) {
                const data = await res.json();
                results = data.results.map((r, i) => ({
                    ...r,
                    category: allComments[i].category
                }));
                if (data.fast_summary_used) {
                    setTimeout(() => {
                        const toast = document.createElement('div');
                        toast.innerHTML = `
                            <div style="padding: 1rem; background: var(--surface); border-left: 4px solid var(--primary); box-shadow: var(--shadow-lg); border-radius: 8px; font-size: 0.9rem; color: var(--text-dark);">
                                <strong>⚡ Performance Optimization Triggered</strong><br><br>
                                Due to the dataset size (≥100 comments), the system extracted the first two sentences for each comment instead of running the heavy AI summarizer.<br><br>
                                This ensures your analysis completes in seconds.
                            </div>
                        `;
                        toast.style.position = 'fixed';
                        toast.style.bottom = '20px';
                        toast.style.right = '20px';
                        toast.style.zIndex = '9999';
                        toast.style.maxWidth = '350px';
                        toast.style.animation = 'slideIn 0.3s ease-out';
                        document.body.appendChild(toast);
                        
                        // Auto remove after 8 seconds
                        setTimeout(() => {
                            toast.style.opacity = '0';
                            toast.style.transition = 'opacity 0.3s';
                            setTimeout(() => toast.remove(), 300);
                        }, 8000);
                    }, 500);
                }
            } else {
                throw new Error("Batch API failed");
            }
        } catch(e) {
            console.error('API Error', e);
            titleEl.innerHTML = `<span style="color:var(--danger)">Analysis Failed: Backend Unreachable</span>`;
            listEl.innerHTML = `<li class="active" style="color:var(--danger)">Please ensure the Python Flask server is running on localhost:5000.<br><br><button class="btn btn-secondary" onclick="appRouter.navigate('demo')">Go Back</button></li>`;
            return;
        }

        progressEl.style.width = '80%';
        markDone(2, steps[2]);
        markDone(3, steps[3]);
        lis[4].classList.add('active');
        progressEl.style.width = '100%'; titleEl.textContent = 'Finalizing Dashboard...';
        
        // 5. Finalize
        setTimeout(() => {
            appHistory.saveAnalysis(results);
            DashboardManager.populateDashboard(results);
            appRouter.navigate('dashboard');
        }, 1500);
    }

    loadFromHistory(id) {
        const history = appHistory.getHistory();
        const record = history.find(h => h.id === id);
        if(record) {
            DashboardManager.populateDashboard(record.data);
            appRouter.navigate('dashboard');
        }
    }
}

// ==========================================
// 6. Global Exports & Helpers
// ==========================================
window.appRouter = new Router();
window.appHistory = new HistoryManager();
window.appEngine = new AnalysisEngine();

document.addEventListener('DOMContentLoaded', () => {
    UIBuilder.renderFeatures();
    UIBuilder.renderWorkflow();
    lucide.createIcons();
    appRouter.init();

    // Export CSV
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!DashboardManager.allResults || DashboardManager.allResults.length === 0) {
                alert("No data to export!");
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Original Comment,Sentiment,Confidence,Summary\n";
            DashboardManager.allResults.forEach(r => {
                let comment = '"' + r.original.replace(/"/g, '""') + '"';
                let summary = '"' + r.summary.replace(/"/g, '""') + '"';
                csvContent += `${comment},${r.sentiment},${r.confidence},${summary}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "opinion_graph_results.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Print Report
    const printBtn = document.getElementById('print-report-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
});

window.exportFullReport = () => {
    const { jsPDF } = window.jspdf;
    const btn = document.getElementById('btn-generate-report');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating PDF...';
    
    setTimeout(() => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 20;
        let y = 30;
        
        // Title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text("OpinionGraph AI - Executive Intelligence Report", margin, y);
        
        y += 15;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, y);
        pdf.text(`Total Responses Processed: ${DashboardManager.explorerData.length}`, margin, y + 10);
        pdf.text(`Overall Consultation Sentiment: ${DashboardManager.calculateOverallSentiment(DashboardManager.explorerData)}`, margin, y + 20);
        
        y += 40;
        pdf.setFont("helvetica", "bold");
        pdf.text("Executive Summary:", margin, y);
        
        y += 10;
        pdf.setFont("helvetica", "normal");
        const summary = document.getElementById('exec-summary-text').innerText;
        const splitText = pdf.splitTextToSize(summary, 170);
        pdf.text(splitText, margin, y);
        
        y += splitText.length * 7 + 10;
        
        pdf.setFont("helvetica", "bold");
        pdf.text("Top Positive Observations:", margin, y);
        y += 10;
        pdf.setFont("helvetica", "normal");
        const posText = document.getElementById('positive-obs').innerText.split('\n');
        posText.forEach(t => {
            const lines = pdf.splitTextToSize("• " + t, 170);
            pdf.text(lines, margin, y);
            y += lines.length * 7;
        });
        
        y += 10;
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Concerns / Negative Feedback:", margin, y);
        y += 10;
        pdf.setFont("helvetica", "normal");
        const negText = document.getElementById('negative-obs').innerText.split('\n');
        negText.forEach(t => {
            const lines = pdf.splitTextToSize("• " + t, 170);
            pdf.text(lines, margin, y);
            y += lines.length * 7;
        });
        
        pdf.save('OpinionGraph_Executive_Report.pdf');
        btn.innerHTML = originalText;
        lucide.createIcons();
    }, 1000);
};
