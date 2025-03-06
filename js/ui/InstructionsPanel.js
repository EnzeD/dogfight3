// Instructions Panel for displaying game instructions
export default class InstructionsPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.panel = null;

        // Create the panel
        this.createPanel();
    }

    /**
     * Create the instructions panel
     */
    createPanel() {
        // Create panel element
        this.panel = document.createElement('div');
        this.panel.id = 'instructions-panel';

        // Style the panel
        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.left = '10px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.panel.style.color = 'white';
        this.panel.style.padding = '15px';
        this.panel.style.fontFamily = 'Arial, sans-serif';
        this.panel.style.fontSize = '14px';
        this.panel.style.borderRadius = '8px';
        this.panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.panel.style.backdropFilter = 'blur(5px)';
        this.panel.style.border = '1px solid rgba(255,255,255,0.1)';
        this.panel.style.maxWidth = '300px';
        this.panel.style.transition = 'opacity 0.3s ease';
        this.panel.style.zIndex = '1000';

        // Set panel content
        this.panel.innerHTML = `
            <h2 style="margin-top: 0; color: #FFD700;">WW2 Dogfight Arena</h2>
            <p><strong>Flight Controls:</strong></p>
            <ul style="padding-left: 20px;">
                <li>W or Z - Increase throttle</li>
                <li>Shift + W/Z - Boost (3x acceleration)</li>
                <li>S - Decrease throttle</li>
                <li>A or Q - Roll left</li>
                <li>D - Roll right</li>
                <li>↑ - Pitch down</li>
                <li>↓ - Pitch up</li>
                <li>← - Yaw left</li>
                <li>→ - Yaw right</li>
                <li>F - Toggle auto-stabilization</li>
                <li>Space - Fire ammo</li>
            </ul>
            <p><strong>Camera Controls:</strong></p>
            <ul style="padding-left: 20px;">
                <li>Left Click + Drag - Rotate camera</li>
                <li>Right Click + Drag - Pan camera</li>
                <li>Scroll - Zoom in/out</li>
                <li>C - Toggle camera mode</li>
            </ul>
            <p><strong>Game Controls:</strong></p>
            <ul style="padding-left: 20px;">
                <li>E - Spawn 20 enemy planes</li>
            </ul>
            <p style="margin-bottom: 0; font-style: italic; text-align: center;">
                Click this panel to close
            </p>
        `;

        // Add click event to hide the panel
        this.panel.addEventListener('click', () => {
            this.hide();
        });

        // Initially hide the panel
        this.panel.style.display = 'none';
        this.panel.style.opacity = '0';

        // Add to document
        document.body.appendChild(this.panel);
    }

    /**
     * Show the instructions panel
     */
    show() {
        this.panel.style.display = 'block';

        // Use setTimeout to ensure the transition works
        setTimeout(() => {
            this.panel.style.opacity = '1';
        }, 10);
    }

    /**
     * Hide the instructions panel
     */
    hide() {
        this.panel.style.opacity = '0';

        // Remove from DOM after transition
        setTimeout(() => {
            this.panel.style.display = 'none';
        }, 300);
    }
} 