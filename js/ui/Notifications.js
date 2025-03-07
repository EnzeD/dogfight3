// Notifications class for displaying game notifications
export default class Notifications {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.notificationTimeout = null;

        // Create the notifications container
        this.createContainer();
    }

    /**
     * Create the notifications container
     */
    createContainer() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';

        // Style the container
        this.container.style.position = 'absolute';
        this.container.style.top = '60px';
        this.container.style.right = '10px';
        this.container.style.width = '250px';
        this.container.style.zIndex = '1000';

        // Add to document
        document.body.appendChild(this.container);
    }

    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, warning, error)
     */
    show(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        // Style the notification
        notification.style.backgroundColor = this.getBackgroundColor(type);
        notification.style.color = 'white';
        notification.style.padding = '12px 15px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.backdropFilter = 'blur(5px)';
        notification.style.border = '1px solid rgba(255,255,255,0.1)';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(50px)';
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        // Add icon based on type
        const icon = this.getIcon(type);

        // Set notification content
        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px;">${icon}</div>
                <div>${message}</div>
            </div>
        `;

        // Add to container
        this.container.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-remove after delay
        setTimeout(() => {
            this.hide(notification);
        }, 3000);

        // Add click event to dismiss
        notification.addEventListener('click', () => {
            this.hide(notification);
        });
    }

    /**
     * Hide a notification
     * @param {HTMLElement} notification - The notification element to hide
     */
    hide(notification) {
        // Start hide animation
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(50px)';

        // Remove from DOM after animation
        setTimeout(() => {
            if (notification.parentNode === this.container) {
                this.container.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Get background color based on notification type
     * @param {string} type - Notification type
     * @returns {string} Background color
     */
    getBackgroundColor(type) {
        switch (type) {
            case 'success':
                return 'rgba(76, 175, 80, 0.9)'; // Green
            case 'warning':
                return 'rgba(255, 152, 0, 0.9)'; // Orange
            case 'error':
                return 'rgba(244, 67, 54, 0.9)'; // Red
            case 'info':
            default:
                return 'rgba(33, 150, 243, 0.9)'; // Blue
        }
    }

    /**
     * Get icon based on notification type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     */
    getIcon(type) {
        switch (type) {
            case 'success':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            case 'warning':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            case 'error':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            case 'info':
            default:
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
    }
} 