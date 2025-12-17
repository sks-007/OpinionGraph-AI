document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // I. DOM ELEMENT SELECTORS
    // =================================================================================
    const dom = {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        fileList: document.getElementById('file-list'),
        analyzeBtn: document.getElementById('analyze-btn'),
        exportBtn: document.getElementById('export-btn'),
        resetBtn: document.getElementById('reset-btn'),
        errorMessage: document.getElementById('error-message'),
        progressSection: document.getElementById('progress-section'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        dashboardPlaceholder: document.getElementById('dashboard-placeholder'),
        analysisResults: document.getElementById('analysis-results'),
        wordCloudContainer: document.getElementById('word-cloud-container'),
        resultsTableBody: document.getElementById('results-table-body'),
        tableHeaders: document.querySelectorAll('.sortable'),
        totalCommentsEl: document.getElementById('total-comments'),
        overallSentimentEl: document.getElementById('overall-sentiment'),
        topKeywordEl: document.getElementById('top-keyword'),
        searchInput: document.getElementById('search-input'),
        paginationInfo: document.getElementById('pagination-info'),
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        sentimentChartCanvas: document.getElementById('sentiment-chart'),
        singleComment: {
            input: document.getElementById('single-comment-input'),
            analyzeBtn: document.getElementById('analyze-comment-btn'),
            error: document.getElementById('single-comment-error'),
            modal: document.getElementById('single-result-modal'),
            modalContent: document.getElementById('modal-content'),
            closeModalBtn: document.getElementById('close-modal-btn'),
        }
    };

    // =================================================================================
    // II. STATE MANAGEMENT
    // =================================================================================
    const state = {
        filesToProcess: [],
        allAnalysisData: [],
        filteredData: [],
        sentimentChartInstance: null,
        currentPage: 1,
        rowsPerPage: 10,
        sortColumn: 'filename',
        sortDirection: 'asc',
    };
    
    // =================================================================================
    // IV. INITIALIZATION & EVENT LISTENERS
    // =================================================================================
    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('drag-over'); });
    dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag-over'));
    dom.dropZone.addEventListener('drop', (e) => { e.preventDefault(); dom.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
    dom.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    dom.fileList.addEventListener('click', handleFileRemove);
    dom.analyzeBtn.addEventListener('click', processAndAnalyzeFiles);
    dom.resetBtn.addEventListener('click', resetApplicationState);
    dom.exportBtn.addEventListener('click', exportReportAsPDF);
    dom.singleComment.input.addEventListener('input', () => { dom.singleComment.analyzeBtn.disabled = dom.singleComment.input.value.trim().length === 0; });
    dom.singleComment.analyzeBtn.addEventListener('click', analyzeSingleComment);
    dom.singleComment.closeModalBtn.addEventListener('click', () => dom.singleComment.modal.classList.add('hidden'));
    dom.singleComment.modal.addEventListener('click', (e) => { if (e.target === dom.singleComment.modal) dom.singleComment.modal.classList.add('hidden'); });
    dom.searchInput.addEventListener('input', () => { state.currentPage = 1; renderTableAndPagination(); });
    dom.tableHeaders.forEach(header => header.addEventListener('click', handleSort));
    dom.prevPageBtn.addEventListener('click', () => { if(state.currentPage > 1) { state.currentPage--; renderTableAndPagination(); } });
    dom.nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage); if(state.currentPage < totalPages) { state.currentPage++; renderTableAndPagination(); } });

    // =================================================================================
    // V. FILE HANDLING LOGIC
    // =================================================================================
    function handleFiles(files) {
        const rejectedFiles = [];
        hideError();

        [...files].forEach(file => {
            const allowedExtensions = ['.pdf', '.txt', '.csv'];
            const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-excel'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            const isAllowed = allowedMimeTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
            const isDuplicate = state.filesToProcess.some(f => f.name === file.name);

            if (isAllowed && !isDuplicate) {
                state.filesToProcess.push(file);
            } else if (!isAllowed) {
                rejectedFiles.push(file.name);
            }
        });

        if (rejectedFiles.length > 0) {
            showError(`Unsupported file(s): ${rejectedFiles.join(', ')}. Only PDF, TXT, and CSV are accepted.`);
        }

        renderFileList();
        dom.analyzeBtn.disabled = state.filesToProcess.length === 0;
    }

    function handleFileRemove(e) {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index);
            state.filesToProcess.splice(index, 1);
            renderFileList();
            dom.analyzeBtn.disabled = state.filesToProcess.length === 0;
        }
    }

    // CORRECTED CSV PARSING LOGIC
    async function extractCommentsFromFile(file) {
        return new Promise((resolve, reject) => {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

            if (fileExtension === '.csv') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    const rows = text.split('\n').map(row => row.trim()).filter(Boolean);
                    if (rows.length === 0) {
                        resolve([]);
                        return;
                    }
                    const header = rows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
                    let commentIndex = -1;
                    const commonHeaders = ['comment', 'text', 'feedback', 'suggestion'];
                    for (const h of commonHeaders) {
                        const idx = header.findIndex(col => col.includes(h));
                        if (idx !== -1) {
                            commentIndex = idx;
                            break;
                        }
                    }
                    if (commentIndex === -1) {
                        commentIndex = 0; 
                    }
                    const dataRows = rows.slice(1);
                    const comments = dataRows.map(row => {
                        const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Handles commas inside quotes
                        return columns[commentIndex] ? columns[commentIndex].trim().replace(/^"|"$/g, '') : '';
                    }).filter(Boolean);
                    resolve(comments);
                };
                reader.onerror = reject;
                reader.readAsText(file);
            } else if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                        let text = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += content.items.map(item => item.str).join(' ');
                        }
                        resolve([text]);
                    } catch (err) { reject(err); }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else { // txt
                const reader = new FileReader();
                reader.onload = (e) => resolve([e.target.result]);
                reader.onerror = reject;
                reader.readAsText(file);
            }
        });
    }

    // =================================================================================
    // VI. CORE ANALYSIS LOGIC
    // =================================================================================
    async function processAndAnalyzeFiles() {
        hideError();
        setLoading(true);
        
        let commentsToProcess = [];
        for (const file of state.filesToProcess) {
            try {
                const comments = await extractCommentsFromFile(file);
                comments.forEach(comment => {
                    if(comment.trim()){
                        commentsToProcess.push({ text: comment, filename: file.name });
                    }
                });
            } catch(e) {
                console.error(`Failed to extract text from ${file.name}:`, e);
                showError(`Could not extract text from ${file.name}.`);
            }
        }

        if (commentsToProcess.length === 0) {
            showError("No valid comments found in the uploaded files.");
            setLoading(false);
            return;
        }

        const analysisPromises = commentsToProcess.map((item, i) => 
            analyzeComment(item.text, item.filename)
                .then(result => {
                    const progress = Math.round(((i + 1) / commentsToProcess.length) * 100);
                    dom.progressBar.style.width = `${progress}%`;
                    dom.progressText.textContent = `Analyzed ${i + 1} of ${commentsToProcess.length} comments.`;
                    return result;
                })
                .catch(e => {
                    console.error(`Failed to process comment from ${item.filename}:`, e);
                    return { 
                        filename: item.filename, sentiment: 'Error', summary: 'Failed to analyze.', 
                        keywords: [], confidence: 0, fullText: item.text 
                    };
                })
        );
        
        state.allAnalysisData = await Promise.all(analysisPromises);
        displayAggregatedResults(state.allAnalysisData);
        setLoading(false);
    }
    
    async function analyzeSingleComment() {
        const commentText = dom.singleComment.input.value.trim();
        if (!commentText) return;

        dom.singleComment.analyzeBtn.disabled = true;
        dom.singleComment.analyzeBtn.innerHTML = '<div class="spinner !w-5 !h-5 !border-2"></div> Analyzing...';
        dom.singleComment.error.classList.add('hidden');

        try {
            const result = await analyzeComment(commentText, "Single Comment");
            displaySingleResultInModal(result);
        } catch (error) {
            console.error("Single comment analysis failed:", error);
            dom.singleComment.error.textContent = "Failed to analyze the comment. Ensure the backend is running.";
            dom.singleComment.error.classList.remove('hidden');
        } finally {
            dom.singleComment.analyzeBtn.disabled = false;
            dom.singleComment.analyzeBtn.innerHTML = 'Analyze Comment';
        }
    }
    
    // CORRECTED: Pointing to the local Flask backend
    async function analyzeComment(commentText, filename) {
        const flaskApiUrl = 'http://127.0.0.1:5000/analyze';
        const payload = { text: commentText };
        const response = await fetchWithRetry(flaskApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        data.filename = filename;
        data.fullText = commentText;
        if (!data.keywords) {
            data.keywords = [];
        }
        // The backend now returns sentiment as 'POSITIVE' or 'NEGATIVE', let's capitalize it
        data.sentiment = data.sentiment.charAt(0).toUpperCase() + data.sentiment.slice(1).toLowerCase();
        return data;
    }

    // =================================================================================
    // VII. UI RENDERING & DISPLAY LOGIC
    // =================================================================================
    function displayAggregatedResults(results) {
        const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0, Error: 0 };
        const allKeywords = [];
        results.forEach(res => {
            sentimentCounts[res.sentiment] = (sentimentCounts[res.sentiment] || 0) + 1;
            if(res.keywords && Array.isArray(res.keywords)) {
                allKeywords.push(...res.keywords.map(k => String(k).toLowerCase()));
            }
        });

        dom.totalCommentsEl.textContent = results.length;
        const keywordCounts = allKeywords.reduce((acc, word) => { acc[word] = (acc[word] || 0) + 1; return acc; }, {});
        const topKeyword = Object.keys(keywordCounts).length > 0 ? Object.keys(keywordCounts).reduce((a, b) => keywordCounts[a] > keywordCounts[b] ? a : b, '') : 'N/A';
        dom.topKeywordEl.textContent = topKeyword;
        const dominantSentiment = Object.keys(sentimentCounts).filter(k => k !== 'Error' && k !== 'Neutral').reduce((a, b) => sentimentCounts[a] > sentimentCounts[b] ? a : b, 'Neutral');
        dom.overallSentimentEl.textContent = dominantSentiment;
        dom.overallSentimentEl.className = 'text-4xl font-bold mt-2';
        if (dominantSentiment === 'Positive') dom.overallSentimentEl.classList.add('text-green-600');
        else if (dominantSentiment === 'Negative') dom.overallSentimentEl.classList.add('text-red-600');
        else dom.overallSentimentEl.classList.add('text-gray-600');

        renderSentimentChart(sentimentCounts);
        updateWordCloud(keywordCounts);
        renderTableAndPagination();
    }

    function renderFileList() {
        dom.fileList.innerHTML = '';
        state.filesToProcess.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'flex justify-between items-center text-sm p-2 bg-gray-100 rounded';
            fileElement.innerHTML = `<span class="truncate">${file.name}</span><button data-index="${index}" class="text-red-500 hover:text-red-700 font-bold">&times;</button>`;
            dom.fileList.appendChild(fileElement);
        });
    }

    function renderTableAndPagination() {
        const searchTerm = dom.searchInput.value.toLowerCase();
        state.filteredData = state.allAnalysisData.filter(item => 
            item.fullText.toLowerCase().includes(searchTerm) ||
            (item.summary && item.summary.toLowerCase().includes(searchTerm)) ||
            item.filename.toLowerCase().includes(searchTerm)
        );

        state.filteredData.sort((a, b) => {
            const valA = a[state.sortColumn];
            const valB = b[state.sortColumn];
            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });

        const startIndex = (state.currentPage - 1) * state.rowsPerPage;
        const endIndex = startIndex + state.rowsPerPage;
        const paginatedData = state.filteredData.slice(startIndex, endIndex);

        dom.resultsTableBody.innerHTML = '';
        paginatedData.forEach((res) => {
            let badgeClass;
            switch(res.sentiment) {
                case 'Positive': badgeClass = 'bg-green-100 text-green-800'; break;
                case 'Negative': badgeClass = 'bg-red-100 text-red-800'; break;
                case 'Error': badgeClass = 'bg-yellow-100 text-yellow-800'; break;
                default: badgeClass = 'bg-gray-100 text-gray-800';
            }
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-gray-50 cursor-pointer';
            tr.dataset.originalIndex = state.allAnalysisData.indexOf(res);
            const snippet = res.fullText.length > 100 ? res.fullText.substring(0, 100) + '...' : res.fullText;
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">${res.filename}</td>
                <td class="px-6 py-4 text-gray-600">${snippet}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${badgeClass}">${res.sentiment}</span></td>
                <td class="px-6 py-4">${res.confidence ? (res.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                <td class="px-6 py-4">${res.summary || 'N/A'}</td>
            `;
            dom.resultsTableBody.appendChild(tr);
        });
        
        updatePaginationControls();
        dom.resultsTableBody.removeEventListener('click', handleTableRowClick);
        dom.resultsTableBody.addEventListener('click', handleTableRowClick);
    }
    
    function updatePaginationControls() {
        const totalPages = Math.ceil(state.filteredData.length / state.rowsPerPage);
        const startItem = state.filteredData.length > 0 ? (state.currentPage - 1) * state.rowsPerPage + 1 : 0;
        const endItem = Math.min(startItem + state.rowsPerPage - 1, state.filteredData.length);
        dom.paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${state.filteredData.length} entries.`;
        dom.prevPageBtn.disabled = state.currentPage === 1;
        dom.nextPageBtn.disabled = state.currentPage === totalPages || totalPages === 0;
    }
    
    // CORRECTED CHART RENDERING LOGIC
    function renderSentimentChart(counts) {
        const ctx = dom.sentimentChartCanvas.getContext('2d');
        if (state.sentimentChartInstance) state.sentimentChartInstance.destroy();
        
        state.sentimentChartInstance = new Chart(ctx, { 
            type: 'doughnut', 
            data: { 
                labels: ['Positive', 'Negative', 'Neutral'], 
                datasets: [{ 
                    // This ensures that if a sentiment is missing (e.g., no neutral comments), it defaults to 0 instead of 'undefined'.
                    data: [counts.Positive || 0, counts.Negative || 0, counts.Neutral || 0], 
                    backgroundColor: ['#22c55e', '#ef4444', '#64748b'], 
                    borderColor: '#ffffff', 
                    borderWidth: 4 
                }] 
            }, 
            options: { 
                responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const clickedLabel = state.sentimentChartInstance.data.labels[elements[0].index];
                        dom.searchInput.value = clickedLabel;
                        state.currentPage = 1;
                        renderTableAndPagination();
                    }
                }
            } 
        });
    }
    
    function updateWordCloud(counts) {
        const words = Object.keys(counts).map(key => ({ text: key, size: 10 + Math.min(counts[key] * 5, 90) }));
        dom.wordCloudContainer.innerHTML = ''; 
        if (words.length === 0) {
            dom.wordCloudContainer.innerHTML = '<p class="text-gray-500">No keyword data to display.</p>';
            return;
        };

        setTimeout(() => {
            if (dom.wordCloudContainer.clientWidth === 0) return; // Prevent error if container is hidden
            const layout = d3.layout.cloud().size([dom.wordCloudContainer.clientWidth, dom.wordCloudContainer.clientHeight]).words(words).padding(5).rotate(() => 0).font("Inter").fontSize(d => d.size).on("end", draw);
            layout.start();
            function draw(drawnWords) {
                d3.select(dom.wordCloudContainer).append("svg").attr("width", layout.size()[0]).attr("height", layout.size()[1]).append("g").attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")").selectAll("text").data(drawnWords).enter().append("text").attr("class", "word-cloud-text").style("font-size", d => `${d.size}px`).style("fill", (d, i) => d3.scaleOrdinal(d3.schemeCategory10)(i)).attr("text-anchor", "middle").attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`).text(d => d.text);
            }
        }, 0);
    }
    
    function displaySingleResultInModal(result) {
        let badgeClass;
        switch(result.sentiment) {
            case 'Positive': badgeClass = 'bg-green-100 text-green-800'; break;
            case 'Negative': badgeClass = 'bg-red-100 text-red-800'; break;
            default: badgeClass = 'bg-gray-100 text-gray-800';
        }

        dom.singleComment.modalContent.innerHTML = `
            <div>
                <h4 class="font-semibold text-gray-600">Sentiment</h4>
                <p><span class="px-2 py-1 text-sm font-medium rounded-full ${badgeClass}">${result.sentiment}</span> with <strong>${(result.confidence * 100).toFixed(1)}%</strong> confidence.</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-600">AI-Generated Summary</h4>
                <p class="text-gray-700 p-3 bg-gray-50 rounded-md border">${result.summary}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-600">Key Themes</h4>
                <div class="flex flex-wrap gap-2 mt-1">
                    ${result.keywords.map(k => `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">${k}</span>`).join('')}
                </div>
            </div>
        `;
        dom.singleComment.modal.classList.remove('hidden');
    }

    // =================================================================================
    // VIII. EVENT HANDLER FUNCTIONS
    // =================================================================================
    function handleTableRowClick(e) {
        const row = e.target.closest('tr');
        const existingDetail = document.getElementById('detail-row');
        if (existingDetail && existingDetail.previousElementSibling === row) {
            existingDetail.remove();
            return;
        }
        if(existingDetail) existingDetail.remove();
        if (!row || row.id === 'detail-row' || row.dataset.originalIndex === undefined) return;
        
        const index = parseInt(row.dataset.originalIndex);
        const data = state.allAnalysisData[index];

        const detailRow = document.createElement('tr');
        detailRow.id = 'detail-row';
        detailRow.className = 'detail-row';
        detailRow.innerHTML = `<td colspan="5" class="p-4"><h4 class="font-semibold mb-2">Full Comment Text:</h4><div class="detail-text">${data.fullText}</div></td>`;
        row.after(detailRow);
    }
    
    function handleSort(e) {
        const newSortColumn = e.target.dataset.sort;
        if (state.sortColumn === newSortColumn) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = newSortColumn;
            state.sortDirection = 'asc';
        }
        dom.tableHeaders.forEach(h => {
            h.classList.remove('asc', 'desc');
            if (h.dataset.sort === state.sortColumn) {
                h.classList.add(state.sortDirection);
            }
        });
        state.currentPage = 1;
        renderTableAndPagination();
    }
    
    function resetApplicationState() {
        state.filesToProcess = [];
        state.allAnalysisData = [];
        state.filteredData = [];
        state.currentPage = 1;
        dom.searchInput.value = '';
        if(state.sentimentChartInstance) state.sentimentChartInstance.destroy();

        renderFileList();
        dom.analyzeBtn.disabled = true;
        dom.analysisResults.classList.add('hidden');
        dom.dashboardPlaceholder.classList.remove('hidden');
    }

    // =================================================================================
    // IX. UTILITY & HELPER FUNCTIONS
    // =================================================================================
    function exportReportAsPDF() {
        const { jsPDF } = window.jspdf;
        html2canvas(dom.analysisResults, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('PolicyPulse_Report.pdf');
        });
    }

    function setLoading(isLoading) {
        dom.analyzeBtn.disabled = isLoading;
        if (isLoading) {
            dom.progressSection.classList.remove('hidden');
            dom.dashboardPlaceholder.classList.add('hidden');
            dom.analysisResults.classList.add('hidden');
        } else {
            dom.progressSection.classList.add('hidden');
            dom.analysisResults.classList.remove('hidden');
        }
    }

    function showError(message) { dom.errorMessage.textContent = message; dom.errorMessage.classList.remove('hidden'); }
    function hideError() { dom.errorMessage.classList.add('hidden'); }

    async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.status !== 429) return response; 
                console.warn(`Rate limited. Retrying in ${delay / 1000}s...`);
            } catch (error) {
                if (i === retries - 1) throw error; 
                console.warn(`Network error. Retrying in ${delay / 1000}s...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; 
        }
        throw new Error("API request failed after multiple retries.");
    }
});
