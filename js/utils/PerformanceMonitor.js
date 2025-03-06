/**
 * Utility for monitoring performance and tracking potential memory leaks
 */
export default class PerformanceMonitor {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.isEnabled = false;
        this.memorySnapshots = [];
        this.maxSnapshots = 10; // Keep only the last 10 snapshots
        this.snapshotInterval = 30000; // Take snapshot every 30 seconds
        this.lastSnapshotTime = 0;

        // Objects to monitor for potential leaks
        this.monitoredObjectCounts = {
            'meshes': 0,
            'materials': 0,
            'textures': 0,
            'geometries': 0,
            'lights': 0,
            'cameras': 0
        };

        // Initialize event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start/stop monitoring based on debug panel visibility
        this.eventBus.on('debug.visibility', (isVisible) => {
            this.isEnabled = isVisible;

            // Take an initial snapshot when enabled
            if (isVisible) {
                this.takeMemorySnapshot();
            }
        });

        // Register for frame updates to take periodic snapshots
        this.eventBus.on('fps.update', () => {
            if (this.isEnabled) {
                const currentTime = performance.now();
                if (currentTime - this.lastSnapshotTime > this.snapshotInterval) {
                    this.takeMemorySnapshot();
                    this.lastSnapshotTime = currentTime;
                }
            }
        });

        // Listen for manual snapshot requests
        this.eventBus.on('debug.memory.snapshot.request', () => {
            this.takeMemorySnapshot();
            this.eventBus.emit('notification', {
                message: 'Memory snapshot taken',
                type: 'info'
            });
        });

        // Listen for memory trend data requests
        this.eventBus.on('debug.memory.trend.request', (callback) => {
            if (typeof callback === 'function') {
                callback(this.getMemoryTrendData());
            }
        });
    }

    /**
     * Takes a snapshot of current memory usage
     */
    takeMemorySnapshot() {
        // Only proceed if memory API is available
        if (!window.performance || !window.performance.memory) {
            this.eventBus.emit('notification', {
                message: 'Memory API not available in this browser',
                type: 'error'
            });
            return;
        }

        const memory = window.performance.memory;
        const timestamp = Date.now();

        // Create snapshot object
        const snapshot = {
            timestamp,
            totalHeap: memory.totalJSHeapSize,
            usedHeap: memory.usedJSHeapSize,
            heapLimit: memory.jsHeapSizeLimit,
            objectCounts: { ...this.monitoredObjectCounts }
        };

        // Add to snapshots array
        this.memorySnapshots.push(snapshot);

        // Keep array at max length
        if (this.memorySnapshots.length > this.maxSnapshots) {
            this.memorySnapshots.shift();
        }

        // Analyze for potential memory leaks
        this.analyzeMemoryTrend();
    }

    /**
     * Analyzes memory usage trends to detect potential leaks
     */
    analyzeMemoryTrend() {
        // Need at least 3 snapshots for trend analysis
        if (this.memorySnapshots.length < 3) {
            return;
        }

        const snapshotsCount = this.memorySnapshots.length;
        const oldestSnapshot = this.memorySnapshots[0];
        const newestSnapshot = this.memorySnapshots[snapshotsCount - 1];

        // Calculate memory growth
        const memoryGrowth = newestSnapshot.usedHeap - oldestSnapshot.usedHeap;
        const timeElapsed = (newestSnapshot.timestamp - oldestSnapshot.timestamp) / 1000; // in seconds
        const growthRate = memoryGrowth / timeElapsed; // bytes per second

        // Check if memory is consistently growing
        let isGrowing = true;
        for (let i = 1; i < snapshotsCount; i++) {
            const prevSnapshot = this.memorySnapshots[i - 1];
            const currSnapshot = this.memorySnapshots[i];

            // If any snapshot shows memory decrease, it's not consistently growing
            if (currSnapshot.usedHeap < prevSnapshot.usedHeap) {
                isGrowing = false;
                break;
            }
        }

        // Emit warning if memory usage is consistently growing and rate is significant
        if (isGrowing && growthRate > 50000) { // More than 50KB per second
            this.eventBus.emit('notification', {
                message: `Warning: Possible memory leak detected. Memory growing at ${Math.round(growthRate / 1024)} KB/s`,
                type: 'warning'
            });

            // Emit detailed metrics for debug panel
            this.eventBus.emit('debug.memory.leak', {
                growthRate,
                totalTimeElapsed: timeElapsed,
                memoryGrowth
            });
        }
    }

    /**
     * Update monitored object counts from THREE.js renderer
     * @param {THREE.WebGLRenderer} renderer - The THREE.js renderer
     */
    updateMonitoredObjectCounts(renderer) {
        if (!renderer || !renderer.info) {
            return;
        }

        const info = renderer.info;

        this.monitoredObjectCounts = {
            'meshes': info.memory ? info.memory.geometries : 0,
            'materials': info.memory ? info.memory.textures : 0,
            'textures': info.memory ? info.memory.textures : 0,
            'geometries': info.memory ? info.memory.geometries : 0,
            'calls': info.render ? info.render.calls : 0,
            'triangles': info.render ? info.render.triangles : 0
        };
    }

    /**
     * Get memory trend data for visualization
     * @returns {Object} Memory trend data
     */
    getMemoryTrendData() {
        const timestamps = [];
        const memoryValues = [];

        this.memorySnapshots.forEach(snapshot => {
            timestamps.push(new Date(snapshot.timestamp).toLocaleTimeString());
            memoryValues.push(snapshot.usedHeap / (1024 * 1024)); // Convert to MB
        });

        return {
            timestamps,
            memoryValues
        };
    }
} 