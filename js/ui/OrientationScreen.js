/**
 * OrientationScreen.js - Handles device orientation instructions for mobile
 * Provides UI for instructing users to rotate their device to landscape orientation
 */
export default class OrientationScreen {
    /**
     * Create an orientation screen
     * @param {Function} onLandscape - Callback function when device orientation is correct
     */
    constructor(onLandscape) {
        this.onLandscape = onLandscape;
        this.element = null;
        this.isShowing = false;
        this.orientationHandler = this.checkOrientation.bind(this);
    }

    /**
     * Check if device is in landscape orientation
     * @returns {boolean} True if device is in landscape orientation
     */
    isLandscape() {
        return window.innerWidth > window.innerHeight;
    }

    /**
     * Handle device orientation change
     */
    checkOrientation() {
        if (this.isLandscape() && this.isShowing) {
            this.isShowing = false;
            // Add transition class for smooth fade out
            this.element.classList.add('fade-out');

            // Wait for animation to complete before removing
            setTimeout(() => {
                this.forceRemove();
                // Call the callback
                if (this.onLandscape) {
                    this.onLandscape();
                }
            }, 500); // Match the CSS transition duration
        }
    }

    /**
     * Force remove the orientation screen from DOM
     */
    forceRemove() {
        // Remove event listeners
        window.removeEventListener('resize', this.orientationHandler);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchend', this.handleTouchEnd);

        // Remove from DOM with multiple safety checks
        if (this.element) {
            // First make it invisible immediately
            this.element.style.display = 'none';

            if (this.element.parentNode) {
                try {
                    this.element.parentNode.removeChild(this.element);
                } catch (e) {
                    console.error('Error removing orientation screen:', e);
                    // Fallback: Try to force hide if removal fails
                    this.element.style.visibility = 'hidden';
                    this.element.style.opacity = '0';
                    this.element.style.pointerEvents = 'none';
                    this.element.style.zIndex = '-1000';
                }
            }

            this.element = null;
        }

        // Extra cleanup for any left-behind elements
        const leftoverScreens = document.querySelectorAll('.orientation-screen');
        leftoverScreens.forEach(screen => {
            if (screen && screen.parentNode) {
                screen.parentNode.removeChild(screen);
            }
        });
    }

    /**
     * Create and show the orientation screen
     */
    show() {
        // Only show if not already in landscape
        if (this.isLandscape()) {
            if (this.onLandscape) {
                this.onLandscape();
            }
            return;
        }

        // Create orientation screen element
        this.element = document.createElement('div');
        this.element.className = 'orientation-screen';

        // Add content
        this.element.innerHTML = `
            <div class="orientation-content">
                <div class="rotate-icon">
                    <div class="device-outline">
                        <div class="device-screen"></div>
                    </div>
                    <div class="rotation-arrow">↻</div>
                </div>
                <h2>ROTATE YOUR DEVICE</h2>
                <p>Please rotate your device to landscape orientation for the best dogfighting experience.</p>
                <p class="swipe-instruction">Once in landscape mode, swipe up to continue</p>
            </div>
        `;

        // Add to body
        document.body.appendChild(this.element);
        this.isShowing = true;

        // Listen for orientation changes
        window.addEventListener('resize', this.orientationHandler);

        // Setup swipe detection for landscape mode
        this.setupSwipeDetection();
    }

    /**
     * Setup swipe detection for landscape mode
     */
    setupSwipeDetection() {
        let touchStartY = 0;
        const MIN_SWIPE_DISTANCE = 50;

        const handleTouchStart = (e) => {
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {
            if (!this.isLandscape()) return;

            const touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;

            if (swipeDistance > MIN_SWIPE_DISTANCE) {
                // It's a swipe up
                if (this.isShowing) {
                    this.isShowing = false;
                    // Add transition class for smooth fade out
                    this.element.classList.add('fade-out');

                    // Wait for animation to complete before removing
                    setTimeout(() => {
                        this.forceRemove();
                        // Call the callback
                        if (this.onLandscape) {
                            this.onLandscape();
                        }
                    }, 500); // Match the CSS transition duration
                }
            }
        };

        this.handleTouchStart = handleTouchStart;
        this.handleTouchEnd = handleTouchEnd;

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
    }

    /**
     * Hide and remove the orientation screen
     */
    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.isShowing = false;
        window.removeEventListener('resize', this.orientationHandler);
    }
} 