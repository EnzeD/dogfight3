// Debug Panel for displaying performance metrics
export default class DebugPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.panel = null;
        this.visible = false;
        this.metrics = {
            fps: 0,
            frameTime: 0,
            jsHeapSize: 0,
            jsHeapSizeLimit: 0,
            jsHeapSizeUsed: 0,
            renderTime: 0,
            updateTime: 0,
            objectCount: 0,
            triangleCount: 0
        };
        this.memoryLeakInfo = null;
        this.showMemoryTrend = false;

        // Create elements
        this.createPanel();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for debug panel
     */
    setupEventListeners() {
        // Listen for FPS updates
        this.eventBus.on('fps.update', (fps) => {
            this.metrics.fps = fps;
            this.updateDisplay();
        });

        // Listen for performance metrics updates
        this.eventBus.on('debug.metrics', (metrics) => {
            Object.assign(this.metrics, metrics);
            this.updateDisplay();
        });

        // Listen for memory leak detection
        this.eventBus.on('debug.memory.leak', (info) => {
            this.memoryLeakInfo = info;
            this.updateDisplay();
        });

        // Toggle visibility with F3 key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F3') {
                this.toggleVisibility();
            }
        });
    }

    /**
     * Create the debug panel
     */
    createPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';

        // Style the panel
        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.right = '10px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.panel.style.color = '#00FF00';
        this.panel.style.padding = '10px';
        this.panel.style.fontFamily = 'monospace';
        this.panel.style.fontSize = '12px';
        this.panel.style.borderRadius = '5px';
        this.panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
        this.panel.style.width = '280px';
        this.panel.style.maxHeight = '80vh';
        this.panel.style.overflowY = 'auto';
        this.panel.style.zIndex = '1001';
        this.panel.style.display = 'none'; // Hidden by default
        this.panel.style.backdropFilter = 'blur(5px)';
        this.panel.style.border = '1px solid rgba(0, 255, 0, 0.3)';

        // Add title
        const title = document.createElement('div');
        title.textContent = 'DEBUG PERFORMANCE MONITOR';
        title.style.marginBottom = '8px';
        title.style.fontSize = '14px';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #00FF00';
        title.style.paddingBottom = '5px';
        this.panel.appendChild(title);

        // Add subtitle and keybind info
        const subTitle = document.createElement('div');
        subTitle.textContent = 'Press F3 to toggle';
        subTitle.style.marginBottom = '10px';
        subTitle.style.fontSize = '11px';
        subTitle.style.opacity = '0.7';
        this.panel.appendChild(subTitle);

        // Add content container
        const contentContainer = document.createElement('div');
        contentContainer.id = 'debug-content';
        this.panel.appendChild(contentContainer);

        // Add memory snapshot button
        const actionContainer = document.createElement('div');
        actionContainer.style.marginTop = '10px';
        actionContainer.style.display = 'flex';
        actionContainer.style.justifyContent = 'space-between';

        const snapshotButton = document.createElement('button');
        snapshotButton.textContent = 'Take Memory Snapshot';
        snapshotButton.style.backgroundColor = '#333';
        snapshotButton.style.color = '#00FF00';
        snapshotButton.style.border = '1px solid #00FF00';
        snapshotButton.style.padding = '5px 10px';
        snapshotButton.style.borderRadius = '3px';
        snapshotButton.style.cursor = 'pointer';
        snapshotButton.style.fontSize = '11px';
        snapshotButton.onclick = () => {
            this.eventBus.emit('debug.memory.snapshot.request');
        };

        const toggleTrendButton = document.createElement('button');
        toggleTrendButton.textContent = 'Show Memory Trend';
        toggleTrendButton.style.backgroundColor = '#333';
        toggleTrendButton.style.color = '#00FF00';
        toggleTrendButton.style.border = '1px solid #00FF00';
        toggleTrendButton.style.padding = '5px 10px';
        toggleTrendButton.style.borderRadius = '3px';
        toggleTrendButton.style.cursor = 'pointer';
        toggleTrendButton.style.fontSize = '11px';
        toggleTrendButton.onclick = () => {
            this.showMemoryTrend = !this.showMemoryTrend;
            toggleTrendButton.textContent = this.showMemoryTrend ? 'Hide Memory Trend' : 'Show Memory Trend';
            this.updateDisplay();
        };

        actionContainer.appendChild(snapshotButton);
        actionContainer.appendChild(toggleTrendButton);

        // Add memory trend graph container
        const trendContainer = document.createElement('div');
        trendContainer.id = 'memory-trend-container';
        trendContainer.style.marginTop = '10px';
        trendContainer.style.display = 'none';
        trendContainer.style.height = '120px';
        trendContainer.style.border = '1px solid #555';

        this.panel.appendChild(actionContainer);
        this.panel.appendChild(trendContainer);

        // Add to document
        document.body.appendChild(this.panel);
    }

    /**
     * Update the debug panel display
     */
    updateDisplay() {
        const contentContainer = document.getElementById('debug-content');
        if (!contentContainer) return;

        // Format memory sizes
        const formatMemory = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Create HTML content
        let html = '';

        // Section 1: Rendering Performance
        html += '<div style="margin-bottom: 15px;">';
        html += '<div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Rendering Performance</div>';

        // FPS with colored indicator
        let fpsColor = this.metrics.fps >= 50 ? '#4CAF50' : this.metrics.fps >= 30 ? '#FF9800' : '#F44336';
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>FPS:</span>
                   <span style="color: ${fpsColor}">${this.metrics.fps}</span>
                 </div>`;

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>Frame Time:</span>
                   <span>${this.metrics.frameTime.toFixed(2)} ms</span>
                 </div>`;

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>Render Time:</span>
                   <span>${this.metrics.renderTime.toFixed(2)} ms</span>
                 </div>`;

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>Update Time:</span>
                   <span>${this.metrics.updateTime.toFixed(2)} ms</span>
                 </div>`;
        html += '</div>';

        // Section 2: Memory Usage
        html += '<div style="margin-bottom: 15px;">';
        html += '<div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Memory Usage</div>';

        // Only display if memory info is available
        if (this.metrics.jsHeapSizeUsed > 0) {
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                       <span>Used Heap:</span>
                       <span>${formatMemory(this.metrics.jsHeapSizeUsed)}</span>
                     </div>`;

            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                       <span>Total Heap:</span>
                       <span>${formatMemory(this.metrics.jsHeapSize)}</span>
                     </div>`;

            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                       <span>Heap Limit:</span>
                       <span>${formatMemory(this.metrics.jsHeapSizeLimit)}</span>
                     </div>`;

            // Calculate and display percentage of used memory
            const usedPercentage = this.metrics.jsHeapSizeLimit ?
                (this.metrics.jsHeapSizeUsed / this.metrics.jsHeapSizeLimit * 100).toFixed(1) : 0;

            const memoryColor = usedPercentage > 80 ? '#F44336' : usedPercentage > 60 ? '#FF9800' : '#4CAF50';

            html += `<div style="margin-top: 5px;">
                       <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                         <span>Memory Usage:</span>
                         <span style="color: ${memoryColor}">${usedPercentage}%</span>
                       </div>
                       <div style="width: 100%; height: 6px; background-color: #444; border-radius: 3px; overflow: hidden;">
                         <div style="width: ${usedPercentage}%; height: 100%; background-color: ${memoryColor};"></div>
                       </div>
                     </div>`;

            // Show memory leak warning if detected
            if (this.memoryLeakInfo) {
                const growthRateKB = Math.round(this.memoryLeakInfo.growthRate / 1024);
                const totalGrowthMB = (this.memoryLeakInfo.memoryGrowth / (1024 * 1024)).toFixed(2);

                html += `<div style="margin-top: 8px; padding: 5px; background-color: rgba(255,0,0,0.2); border: 1px solid #F44336; border-radius: 3px;">
                           <div style="color: #F44336; font-weight: bold;">Possible Memory Leak Detected!</div>
                           <div style="font-size: 11px; margin-top: 3px;">Growth Rate: ${growthRateKB} KB/s</div>
                           <div style="font-size: 11px;">Total Growth: ${totalGrowthMB} MB</div>
                         </div>`;
            }
        } else {
            html += '<div style="color: #F44336;">Memory API not available in this browser</div>';
        }
        html += '</div>';

        // Section 3: Scene Statistics
        html += '<div style="margin-bottom: 15px;">';
        html += '<div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Scene Statistics</div>';

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>Objects:</span>
                   <span>${this.metrics.objectCount}</span>
                 </div>`;

        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                   <span>Triangles:</span>
                   <span>${this.metrics.triangleCount.toLocaleString()}</span>
                 </div>`;
        html += '</div>';

        // Update the content
        contentContainer.innerHTML = html;

        // Update memory trend graph if visible
        const trendContainer = document.getElementById('memory-trend-container');
        if (trendContainer) {
            trendContainer.style.display = this.showMemoryTrend ? 'block' : 'none';

            if (this.showMemoryTrend) {
                // Request memory trend data
                this.eventBus.emit('debug.memory.trend.request', (trendData) => {
                    this.renderMemoryTrend(trendData);
                });
            }
        }
    }

    /**
     * Render memory trend graph
     * @param {Object} trendData - Memory trend data
     */
    renderMemoryTrend(trendData) {
        if (!trendData || !trendData.timestamps || trendData.timestamps.length === 0) {
            return;
        }

        const container = document.getElementById('memory-trend-container');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Create simple line graph
        const width = container.clientWidth;
        const height = container.clientHeight;
        const padding = 20;

        // Find max value for scaling
        const maxMemory = Math.max(...trendData.memoryValues) * 1.1; // Add 10% margin

        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.backgroundColor = '#222';

        // Draw axes
        const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axisLine.setAttribute('x1', padding);
        axisLine.setAttribute('y1', height - padding);
        axisLine.setAttribute('x2', width - padding);
        axisLine.setAttribute('y2', height - padding);
        axisLine.setAttribute('stroke', '#555');
        axisLine.setAttribute('stroke-width', '1');
        svg.appendChild(axisLine);

        // Calculate points
        let points = '';
        const xStep = (width - 2 * padding) / (trendData.timestamps.length - 1);

        for (let i = 0; i < trendData.timestamps.length; i++) {
            const x = padding + i * xStep;
            const y = height - padding - (trendData.memoryValues[i] / maxMemory) * (height - 2 * padding);
            points += `${x},${y} `;
        }

        // Draw line
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#00FF00');
        polyline.setAttribute('stroke-width', '2');
        svg.appendChild(polyline);

        // Add title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', width / 2);
        title.setAttribute('y', 15);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('fill', '#aaa');
        title.setAttribute('font-size', '10');
        title.textContent = 'Memory Usage Over Time (MB)';
        svg.appendChild(title);

        // Add max value
        const maxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        maxLabel.setAttribute('x', padding - 5);
        maxLabel.setAttribute('y', padding);
        maxLabel.setAttribute('text-anchor', 'end');
        maxLabel.setAttribute('fill', '#aaa');
        maxLabel.setAttribute('font-size', '9');
        maxLabel.textContent = Math.round(maxMemory) + 'MB';
        svg.appendChild(maxLabel);

        // Add to container
        container.appendChild(svg);
    }

    /**
     * Toggle debug panel visibility
     */
    toggleVisibility() {
        this.visible = !this.visible;
        this.panel.style.display = this.visible ? 'block' : 'none';
        // Notify about visibility change for possible performance optimizations
        this.eventBus.emit('debug.visibility', this.visible);
    }

    /**
     * Show the debug panel
     */
    show() {
        this.visible = true;
        this.panel.style.display = 'block';
    }

    /**
     * Hide the debug panel
     */
    hide() {
        this.visible = false;
        this.panel.style.display = 'none';
    }
} 