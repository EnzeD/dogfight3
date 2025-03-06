// Event Bus for inter-module communication
export default class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[event] = this.listeners[event].filter(
                listener => listener !== callback
            );
        };
    }

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {any} data - Data to pass to listeners
     * @param {string} source - Optional source identifier for the event
     */
    emit(event, data, source) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                callback(data, source);
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    clear(event) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
} 