/**
 * LandingPage.js - Landing page for game mode selection
 * Provides UI for selecting solo/multiplayer mode and entering callsign
 * with optimized mobile experience
 */
export default class LandingPage {
    /**
     * Create a landing page
     * @param {Function} onStart - Callback function when game starts, receives mode and callsign
     */
    constructor(onStart) {
        this.onStart = onStart;
        this.selectedMode = null;
        this.callsign = '';
        this.element = null;
        this.callsignWarning = null;
        this.isMobile = window.innerWidth <= 768 || window.innerHeight <= 500 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.orientationChecked = false;
        this.touchStartY = 0;
        this.overlay = null;
        this.callsignSection = null;
        this.startButton = null;
        this.orientationWarningShown = false;

        // Add resize listener
        window.addEventListener('resize', this.handleResize.bind(this));

        console.log(`Device detected as ${this.isMobile ? 'mobile' : 'desktop'}, landscape: ${this.isLandscape}`);
    }

    /**
     * Create and show the landing page
     */
    show() {
        console.log("Showing landing page");
        // Create the landing page element
        this.element = document.createElement('div');
        this.element.className = 'landing-page';

        // Create overlay background
        const overlay = document.createElement('div');
        overlay.className = 'landing-overlay';
        this.element.appendChild(overlay);

        document.body.appendChild(this.element);

        // Add orientation change listener for mobile
        if (this.isMobile) {
            window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        }

        // Mobile orientation check screen
        if (this.isMobile) {
            // Check if we're in landscape mode already before showing orientation screen
            this.isLandscape = window.innerWidth > window.innerHeight;
            if (!this.isLandscape) {
                this.showOrientationScreen();
            } else {
                // Skip orientation screen if already in landscape mode
                this.orientationChecked = true;
                this.showMainContent();
            }
        } else {
            // Desktop view - show content directly
            this.showMainContent();
        }

        return this.element;
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        // Check if orientation changed to landscape
        const wasLandscape = this.isLandscape;
        this.isLandscape = window.innerWidth > window.innerHeight;

        // If orientation changed to landscape and we're on the orientation screen
        if (!wasLandscape && this.isLandscape && !this.orientationChecked && this.orientationScreen) {
            console.log("Device rotated to landscape, proceeding to main content");
            this.orientationScreen.classList.add('correct-orientation');

            // Short delay to show the correct orientation state before proceeding
            setTimeout(() => {
                this.proceedToMainContent();
            }, 500);
            return;
        }

        // Regular mobile sizing updates
        this.isMobile = window.innerWidth <= 768 || window.innerHeight <= 500;

        // Update mobile specific sizing
        if (this.isMobile) {
            const contentElement = document.querySelector('.landing-content');
            if (contentElement && !contentElement.classList.contains('mobile-optimized')) {
                contentElement.classList.add('mobile-optimized');
                // Recreate the content for mobile if needed
                this.removeContent();
                this.createContent();
            }
        } else {
            const contentElement = document.querySelector('.landing-content');
            if (contentElement && contentElement.classList.contains('mobile-optimized')) {
                contentElement.classList.remove('mobile-optimized');
                // Recreate the content for desktop if needed
                this.removeContent();
                this.createContent();
            }
        }

        // Apply mobile sizing adjustments
        this.resizeForMobile();
    }

    /**
     * Handle device orientation changes
     */
    handleOrientationChange() {
        // Add a short delay to ensure dimensions are updated
        setTimeout(() => {
            // Check if orientation changed to landscape
            const wasLandscape = this.isLandscape;
            this.isLandscape = window.innerWidth > window.innerHeight;

            console.log(`Orientation changed: ${this.isLandscape ? 'landscape' : 'portrait'}`);

            // If orientation changed to landscape and we're on the orientation screen
            if (!wasLandscape && this.isLandscape && !this.orientationChecked && this.orientationScreen) {
                console.log("Device orientation changed to landscape, proceeding to main content");
                this.orientationScreen.classList.add('correct-orientation');

                // Short delay to show the correct orientation state before proceeding
                setTimeout(() => {
                    this.proceedToMainContent();
                }, 500);
            } else {
                // Regular resize handling
                this.handleResize();
            }
        }, 300);
    }

    /**
     * Show the orientation guidance screen for mobile
     */
    showOrientationScreen() {
        // Create orientation screen
        const orientationScreen = document.createElement('div');
        orientationScreen.className = 'orientation-screen';
        if (this.isLandscape) {
            orientationScreen.classList.add('correct-orientation');
        }
        this.orientationScreen = orientationScreen;

        // Add WW2-style decorative elements
        const cornerTL = document.createElement('div');
        cornerTL.className = 'corner top-left';
        orientationScreen.appendChild(cornerTL);

        const cornerTR = document.createElement('div');
        cornerTR.className = 'corner top-right';
        orientationScreen.appendChild(cornerTR);

        const cornerBL = document.createElement('div');
        cornerBL.className = 'corner bottom-left';
        orientationScreen.appendChild(cornerBL);

        const cornerBR = document.createElement('div');
        cornerBR.className = 'corner bottom-right';
        orientationScreen.appendChild(cornerBR);

        // Title
        const title = document.createElement('h1');
        title.className = 'orientation-title';
        title.textContent = 'OPERATION LANDSCAPE';
        orientationScreen.appendChild(title);

        // Phone rotation icon
        const rotationIcon = document.createElement('div');
        rotationIcon.className = 'rotation-icon';
        rotationIcon.innerHTML = `
            <svg width="120" height="120" viewBox="0 0 24 24" class="phone-svg">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="#f8d742" stroke-width="1" fill="none"/>
                <line x1="5" y1="5" x2="19" y2="5" stroke="#f8d742" stroke-width="1"/>
                <line x1="5" y1="19" x2="19" y2="19" stroke="#f8d742" stroke-width="1"/>
                <circle cx="12" cy="22" r="0.8" fill="#f8d742"/>
                <path class="rotation-arrow" d="M2,12 A10,10 0 0,1 22,12" stroke="#f8d742" stroke-width="1.5" fill="none" stroke-dasharray="4,2"/>
                <polygon points="22,12 20,9 24,9" fill="#f8d742"/>
            </svg>
        `;
        orientationScreen.appendChild(rotationIcon);

        // Instructions
        const instructions = document.createElement('p');
        instructions.className = 'orientation-instructions';
        instructions.innerHTML = 'Rotate your device to landscape mode for optimal flight experience<br><span style="color:#f8d742;font-weight:bold;">Game will start automatically when rotated</span>';
        orientationScreen.appendChild(instructions);

        // Create swipe indicator (initially hidden if not in landscape)
        const swipeIndicator = document.createElement('div');
        swipeIndicator.className = 'swipe-indicator';
        swipeIndicator.innerHTML = `
            <div class="swipe-arrow">↑</div>
            <p>SWIPE UP TO CONTINUE</p>
        `;
        swipeIndicator.style.display = this.isLandscape ? 'flex' : 'none';
        this.swipeIndicator = swipeIndicator;
        orientationScreen.appendChild(swipeIndicator);

        this.element.appendChild(orientationScreen);

        // If already in landscape, show swipe indicator
        if (this.isLandscape) {
            setTimeout(() => {
                this.enableSwipeUp();
            }, 1000);
        }

        // Add touch/click events for orientation screen
        orientationScreen.addEventListener('click', () => {
            if (this.isLandscape) {
                this.proceedToMainContent();
            }
        });
    }

    /**
     * Enable swipe up gesture on orientation screen
     */
    enableSwipeUp() {
        if (!this.orientationScreen) return;

        if (this.swipeIndicator) {
            this.swipeIndicator.style.display = 'flex';
            this.swipeIndicator.classList.add('animate');
        }

        // Add touch event listeners for swipe detection
        this.orientationScreen.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.orientationScreen.addEventListener('touchmove', (e) => {
            if (!this.touchStartY) return;

            const touchY = e.touches[0].clientY;
            const diff = this.touchStartY - touchY;

            // If swiped up more than 50px, proceed
            if (diff > 50) {
                this.proceedToMainContent();
                this.touchStartY = 0;
            }
        }, { passive: true });
    }

    /**
     * Transition from orientation screen to main content
     */
    proceedToMainContent() {
        if (!this.orientationChecked && this.orientationScreen) {
            this.orientationScreen.classList.add('slide-up');

            setTimeout(() => {
                if (this.orientationScreen) {
                    this.orientationScreen.remove();
                    this.orientationScreen = null;
                }
                this.orientationChecked = true;
                this.showMainContent();
            }, 500);
        }
    }

    /**
     * Show the main content (mode selection, etc.)
     */
    showMainContent() {
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'landing-content';
        if (this.isMobile) {
            contentContainer.classList.add('mobile-optimized');
        }

        // Add corner brackets for military style
        const cornerTL = document.createElement('div');
        cornerTL.className = 'corner top-left';
        contentContainer.appendChild(cornerTL);

        const cornerTR = document.createElement('div');
        cornerTR.className = 'corner top-right';
        contentContainer.appendChild(cornerTR);

        const cornerBL = document.createElement('div');
        cornerBL.className = 'corner bottom-left';
        contentContainer.appendChild(cornerBL);

        const cornerBR = document.createElement('div');
        cornerBR.className = 'corner bottom-right';
        contentContainer.appendChild(cornerBR);

        // Add WW2 decorative elements (hidden on mobile)
        if (!this.isMobile) {
            const decorTop = document.createElement('div');
            decorTop.className = 'ww2-decoration top-left';
            decorTop.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24"><path fill="#f8d742" d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"/></svg>';
            contentContainer.appendChild(decorTop);

            const decorBottom = document.createElement('div');
            decorBottom.className = 'ww2-decoration bottom-right';
            decorBottom.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24"><path fill="#f8d742" d="M4,7A2,2 0 0,0 2,9V15A2,2 0 0,0 4,17H20A2,2 0 0,0 22,15V9A2,2 0 0,0 20,7H4M4,9H20V15H4V9M2,3H20V5H2V3M2,19H20V21H2V19Z"/></svg>';
            contentContainer.appendChild(decorBottom);
        }

        // Add title and subtitle (condensed for mobile)
        const title = document.createElement('h1');
        title.className = 'landing-title';
        title.textContent = 'WW2 DOGFIGHT ARENA';
        contentContainer.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'landing-subtitle';
        if (this.isMobile) {
            subtitle.textContent = 'Free-to-play MMO combat flight sim';
        } else {
            subtitle.textContent = 'The most intuitive free-to-play MMO combat flight sim, 100% made with AI in 500 prompts!';
        }
        contentContainer.appendChild(subtitle);

        // Create mode selection
        this.createModeSelection(contentContainer, false);

        // Create callsign input section (initially hidden)
        const callsignSection = document.createElement('div');
        callsignSection.className = 'callsign-section';
        callsignSection.innerHTML = `
            <h3>ENTER YOUR CALLSIGN, PILOT:</h3>
            <input type="text" class="callsign-input" placeholder="CALLSIGN (e.g. MAVERICK)" maxlength="15">
        `;
        this.callsignSection = callsignSection;
        contentContainer.appendChild(callsignSection);

        // Add input event listener to callsign input for real-time validation
        const callsignInput = callsignSection.querySelector('.callsign-input');
        this.callsignInput = callsignInput;
        callsignInput.addEventListener('input', () => this.validateForm());

        // Create combined settings and buttons row for mobile
        if (this.isMobile) {
            const bottomSection = document.createElement('div');
            bottomSection.className = 'bottom-section';

            // For mobile, create a simplified, more compact quality section
            const qualitySection = document.createElement('div');
            qualitySection.className = 'quality-section';

            const qualityTitle = document.createElement('h3');
            qualityTitle.textContent = 'PERFORMANCE';
            qualitySection.appendChild(qualityTitle);

            const qualityOptions = document.createElement('div');
            qualityOptions.className = 'quality-options mobile-grid';

            const options = [
                { value: 'ultralow', label: 'Ultra-Low' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
            ];

            options.forEach(option => {
                const qualityOption = document.createElement('div');
                qualityOption.className = 'quality-option';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'quality';
                radio.value = option.value;
                radio.id = `quality-${option.value}`;
                if (option.value === 'low') {
                    radio.checked = true;
                }

                const label = document.createElement('label');
                label.htmlFor = `quality-${option.value}`;
                label.className = 'quality-label';
                label.textContent = option.label;

                qualityOption.appendChild(radio);
                qualityOption.appendChild(label);
                qualityOptions.appendChild(qualityOption);
            });

            qualitySection.appendChild(qualityOptions);
            bottomSection.appendChild(qualitySection);

            // Create buttons row
            const buttonsRow = document.createElement('div');
            buttonsRow.className = 'buttons-row';

            // Create sponsor button
            const sponsorCTA = document.createElement('button');
            sponsorCTA.className = 'sponsor-cta';
            sponsorCTA.textContent = 'BECOME A SPONSOR';
            sponsorCTA.addEventListener('click', () => {
                this.showSponsorDetails();
            });
            buttonsRow.appendChild(sponsorCTA);

            // Create start button
            const startButton = document.createElement('button');
            startButton.className = 'start-button';
            startButton.textContent = 'TAKE OFF!';
            startButton.disabled = true;
            startButton.addEventListener('click', () => this.startGame());
            this.startButton = startButton;
            buttonsRow.appendChild(startButton);

            bottomSection.appendChild(buttonsRow);
            contentContainer.appendChild(bottomSection);
        } else {
            // Desktop layout - create quality settings section for desktop
            const qualitySection = document.createElement('div');
            qualitySection.className = 'quality-section';

            // HTML structure for quality settings
            let qualityHTML = `<h3>PERFORMANCE SETTINGS:</h3>
                <div class="quality-options">`;

            // All quality options from ultra-low to high
            const qualityOptions = [
                { value: 'ultra-low', label: 'ULTRA LOW', default: false },
                { value: 'low', label: 'LOW', default: false },
                { value: 'medium', label: 'MEDIUM', default: true },
                { value: 'high', label: 'HIGH', default: false }
            ];

            qualityOptions.forEach(option => {
                qualityHTML += `
                    <label class="quality-option">
                        <input type="radio" name="quality" value="${option.value}" ${option.default ? 'checked' : ''}>
                        <span class="quality-label">${option.label}</span>
                    </label>`;
            });

            qualityHTML += `</div>`;
            qualitySection.innerHTML = qualityHTML;
            this.qualitySection = qualitySection;
            contentContainer.appendChild(qualitySection);

            // Create sponsor button
            const sponsorCTA = document.createElement('button');
            sponsorCTA.className = 'sponsor-cta';
            sponsorCTA.textContent = 'BECOME A SPONSOR';
            sponsorCTA.addEventListener('click', () => {
                this.showSponsorDetails();
            });
            contentContainer.appendChild(sponsorCTA);

            // Create start button
            const startButton = document.createElement('button');
            startButton.className = 'start-button';
            startButton.textContent = 'TAKE OFF!';
            startButton.disabled = true;
            startButton.addEventListener('click', () => this.startGame());
            this.startButton = startButton;
            contentContainer.appendChild(startButton);
        }

        this.element.appendChild(contentContainer);
        this.resizeForMobile();
    }

    /**
     * Show sponsor details in a modal/overlay that's mobile-friendly
     */
    showSponsorDetails() {
        // Create modal overlay
        const sponsorModal = document.createElement('div');
        sponsorModal.className = 'sponsor-modal';

        // Create sponsor details container
        const sponsorDetails = document.createElement('div');
        sponsorDetails.className = 'sponsor-details mobile-friendly';

        // Add sponsor heading
        const sponsorHeading = document.createElement('h3');
        sponsorHeading.className = 'sponsor-heading';
        sponsorHeading.textContent = 'SUPPORT THE WAR EFFORT';
        sponsorDetails.appendChild(sponsorHeading);

        // Add sponsor description
        const sponsorDesc = document.createElement('p');
        sponsorDesc.className = 'sponsor-desc';
        sponsorDesc.textContent = 'Purchase advertising space in the game and get your logo displayed for all pilots to see!';
        sponsorDetails.appendChild(sponsorDesc);

        // Create sponsor options container
        const sponsorOptions = document.createElement('div');
        sponsorOptions.className = 'sponsor-options';

        // Add sponsor options with prices
        const sponsorProducts = [
            {
                name: 'Runway Billboards',
                price: '€29.00',
                interval: 'per month',
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4ZDc0MiI+PHBhdGggZD0iTTIwLDRINEMyLjg5LDQgMiw0Ljg5IDIsNlYxOEEyLDIgMCAwLDAgNCwyMEgyMEEyLDIgMCAwLDAgMjIsMThWNkMyMiw0Ljg5IDIxLjEsNCAyMCw0TTQsNkgyMFY4SDRWNk00LDE4VjEySDE0VjE4SDRNMjAsMThIMTZWMTJIMjBWMThNNiwxNEg4VjE2SDZWMTRaIi8+PC9zdmc+',
                url: 'https://buy.stripe.com/eVa17v8WKa2U6OY144',
                sold: true
            },
            {
                name: 'Sponsor Village',
                price: '€100.00',
                interval: 'per month',
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4ZDc0MiI+PHBhdGggZD0iTTEwLDJ2MmgyVjJIMTBNNiw4SDQsTDIsMTB2MTBoMlYxMmgxNnY4aDJWMTBMMjAsOEgxOGgxMlYyMGgyVjhoLThWNmgySE05SDhINkM2LDggMSwxNCAxLDE0aDF2NmgybC0wLC0yaDJWMjBoNHYtNGgxNnY4aDJ2LTZoMUMzMCwxNSAyNSw4IDI1LDh2LTJoLTRWNGgydi0ySDEwdjJoMnYySDZNMTIsMTJoMnYyaC0ySE00TDIsMTB2MTBoMlYxMmgxNnY4aDJWMTBMMjAsMTBIMThaIi8+PC9zdmc+',
                url: 'https://buy.stripe.com/4gw2bz4Gu2As8X65kl'
            },
            {
                name: 'Main Building',
                price: '€500.00',
                interval: 'per month',
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4ZDc0MiI+PHBhdGggZD0iTTcsN1YxN0gxMFYxM0gxNFYxN0gxN1Y3SDdNOSwxNVY5SDE1VjE1SDlaTTEsMTFIN1YyMUgxVjE5SDVWMTdIMVYxNUg1VjEzSDFWMTFaTTE5LDExVjEzSDE5LjA5TDE3LjIsMTlINTBWMTdBMiwxIDAgMCwxIDE4LDE3VjE5SDE5TDIxLDEyLjUgTTIzLDExTDIzLDEzSDI0TDI0LDE1SDIzVjE3SDI0VjE5SDIzVjIxSDI3VjE5SDI2VjE3SDI3VjE1SDI2VjEzSDI3VjExSDIzWiIvPjwvc3ZnPg==',
                url: 'https://buy.stripe.com/7sI2bz8WK1wo2yI7sv'
            },
            {
                name: 'Runway Tower',
                price: '€500.00',
                interval: 'per month',
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4ZDc0MiI+PHBhdGggZD0iTTEyLDJMOSwxMkw5LDIxSDZWMjNIMThWMjFIMTVWMTJMMTIsMk0xMiwzLjl2MkgxMS42TDEyLDMuOU0xMS43LDhIMTIuM0wxMi42LDEwSDExLjRMMTEuNyw4TTEzLDEzSDExVjIxSDEzVjEzWiIvPjwvc3ZnPg==',
                url: 'https://buy.stripe.com/6oE6rP2yma2U0qA4gi',
                sold: true
            }
        ];

        // For mobile, use a more compact layout
        if (this.isMobile) {
            sponsorOptions.classList.add('compact-grid');
        }

        sponsorProducts.forEach(product => {
            const option = document.createElement('div');
            option.className = 'sponsor-option';

            // Create purchase button or sold label based on product availability
            const purchaseElement = product.sold
                ? `<div class="sponsor-sold">SOLD</div>`
                : `<a href="${product.url}" target="_blank" class="sponsor-button">PURCHASE</a>`;

            const optionHTML = `
                <img src="${product.image}" alt="${product.name}" class="sponsor-icon">
                <h4>${product.name}</h4>
                <div class="sponsor-price">
                    <span class="price">${product.price}</span>
                    <span class="interval">${product.interval}</span>
                </div>
                ${purchaseElement}
            `;

            option.innerHTML = optionHTML;
            sponsorOptions.appendChild(option);
        });

        // Add disclaimer note
        const disclaimer = document.createElement('p');
        disclaimer.className = 'sponsor-disclaimer';
        disclaimer.textContent = '* All proceeds support ongoing development.';

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'sponsor-close';
        closeButton.textContent = 'CLOSE';
        closeButton.addEventListener('click', () => {
            sponsorModal.classList.add('fade-out');
            setTimeout(() => {
                sponsorModal.remove();
            }, 300);
        });

        // Append all elements
        sponsorDetails.appendChild(sponsorOptions);
        sponsorDetails.appendChild(disclaimer);
        sponsorDetails.appendChild(closeButton);
        sponsorModal.appendChild(sponsorDetails);

        // Sponsor modal swipe-down to close (mobile)
        if (this.isMobile) {
            let touchStartY = 0;
            sponsorModal.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            sponsorModal.addEventListener('touchmove', (e) => {
                if (!touchStartY) return;

                const touchY = e.touches[0].clientY;
                const diff = touchY - touchStartY;

                // If swiped down more than 50px, close
                if (diff > 50) {
                    sponsorModal.classList.add('fade-out');
                    setTimeout(() => {
                        sponsorModal.remove();
                    }, 300);
                }
            }, { passive: true });
        }

        document.body.appendChild(sponsorModal);
        setTimeout(() => {
            sponsorModal.classList.add('visible');
        }, 10);
    }

    /**
     * Create mode selection component
     * @param {HTMLElement} parent - Parent element to append to
     * @param {boolean} hidden - Whether to initially hide the mode selection
     */
    createModeSelection(parent, hidden = false) {
        // Create mission type title
        const missionTypeTitle = document.createElement('h2');
        missionTypeTitle.className = 'mission-type-title';
        missionTypeTitle.textContent = 'SELECT MISSION TYPE:';
        parent.appendChild(missionTypeTitle);

        // Create mode selection container
        const modeSelection = document.createElement('div');
        modeSelection.className = 'mode-selection';
        if (hidden) {
            modeSelection.style.display = 'none';
        }
        this.modeSelectionDiv = modeSelection;

        // Solo mode option
        const soloOption = document.createElement('div');
        soloOption.className = 'mode-option';
        soloOption.innerHTML = `
            <h3>SOLO MISSION</h3>
            <p>Practice your skills against enemy planes</p>
        `;
        soloOption.addEventListener('click', () => this.selectMode('solo', soloOption, multiOption));
        modeSelection.appendChild(soloOption);

        // Add bullet point at left of solo option
        const soloBullet = document.createElement('div');
        soloBullet.className = 'mode-option-bullet';
        soloOption.prepend(soloBullet);

        // Multiplayer mode option
        const multiOption = document.createElement('div');
        multiOption.className = 'mode-option';
        multiOption.innerHTML = `
            <h3>MULTIPLAYER</h3>
            <p>Join real pilots in aerial combat</p>
        `;
        multiOption.addEventListener('click', () => this.selectMode('multi', multiOption, soloOption));
        modeSelection.appendChild(multiOption);

        // Add bullet point at left of multiplayer option
        const multiBullet = document.createElement('div');
        multiBullet.className = 'mode-option-bullet';
        multiOption.prepend(multiBullet);

        parent.appendChild(modeSelection);
    }

    /**
     * Handle mode selection
     * @param {string} mode - Selected mode ('solo' or 'multi')
     * @param {HTMLElement} selectedOption - The option element that was selected
     * @param {HTMLElement} otherOption - The other option element
     */
    selectMode(mode, selectedOption, otherOption) {
        this.selectedMode = mode;

        // Toggle selected class
        selectedOption.classList.add('selected');
        otherOption.classList.remove('selected');

        // Show/hide callsign input based on mode
        if (mode === 'multi') {
            this.callsignSection.classList.add('visible');
        } else {
            this.callsignSection.classList.remove('visible');
        }

        this.validateForm();
    }

    /**
     * Apply mobile-specific sizing and layout adjustments
     */
    resizeForMobile() {
        if (!this.isMobile) return;

        const content = document.querySelector('.landing-content');
        if (!content) return;

        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate content height vs viewport height
        const contentHeight = content.offsetHeight;

        // If content is too tall, apply more aggressive scaling
        if (contentHeight > viewportHeight * 0.95) {
            // Calculate scale factor needed
            const scaleFactor = Math.min(0.85, (viewportHeight * 0.95) / contentHeight);
            content.style.transform = `scale(${scaleFactor})`;
        }

        // Force quality options to be in a grid
        const qualityOptions = document.querySelector('.quality-options');
        if (qualityOptions) {
            qualityOptions.classList.add('mobile-grid');
        }
    }

    /**
     * Basic client-side check for potentially offensive words in callsign
     * This is just a simple first-pass filter, the server has the final say
     * @param {string} callsign - The callsign to check
     * @returns {boolean} - True if the callsign appears clean
     */
    checkCallsign(callsign) {
        if (!callsign || callsign.trim() === '') return false;

        // Basic list of offensive words to check against
        // This is a subset of the server's list for quick client-side validation
        const basicOffensiveWords = [
            "ass", "bastard", "bitch", "cunt", "damn", "dick", "fag", "faggot",
            "fuck", "nigger", "pussy", "shit", "slut", "whore"
        ];

        // Convert to lowercase for comparison
        const lowercaseCallsign = callsign.toLowerCase();

        // Check if the callsign contains any offensive words
        for (const word of basicOffensiveWords) {
            if (lowercaseCallsign.includes(word)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate form and update button state
     */
    validateForm() {
        if (!this.selectedMode) {
            this.startButton.disabled = true;
            return;
        }

        if (this.selectedMode === 'multi') {
            const callsign = this.callsignInput.value.trim();
            this.callsign = callsign;

            // Check callsign length and for offensive content
            const isValid = callsign.length >= 2 && this.checkCallsign(callsign);

            // Show warning if callsign is invalid due to offensive content
            if (callsign.length >= 2 && !this.checkCallsign(callsign)) {
                // Check if warning already exists
                if (!this.callsignWarning) {
                    this.callsignWarning = document.createElement('div');
                    this.callsignWarning.style.color = '#e74c3c';
                    this.callsignWarning.style.fontSize = '12px';
                    this.callsignWarning.style.marginTop = '5px';
                    this.callsignWarning.textContent = 'Inappropriate callsign. Please choose another.';
                    this.callsignSection.querySelector('.callsign-input').after(this.callsignWarning);
                }
            } else if (this.callsignWarning) {
                // Remove warning if callsign is now valid
                this.callsignWarning.remove();
                this.callsignWarning = null;
            }

            this.startButton.disabled = !isValid;
        } else {
            this.startButton.disabled = false;
        }
    }

    /**
     * Start the game with selected options
     */
    startGame() {
        // Gather game options
        const options = {
            mode: this.selectedMode,
            callsign: this.callsign
        };

        // Add mobile-specific settings if on mobile
        if (this.isMobile) {
            const qualityInputs = document.querySelectorAll('input[name="quality"]');
            let selectedQuality = 'ultra-low'; // Default

            qualityInputs.forEach(input => {
                if (input.checked) {
                    selectedQuality = input.value;
                }
            });

            options.isMobile = true;
            options.mobileQuality = selectedQuality;
        }

        // Fade out landing page
        this.element.style.opacity = 0;

        // After animation, remove element and call onStart
        setTimeout(() => {
            this.element.remove();

            // Call the provided onStart callback
            this.onStart(options);
        }, 500);
    }

    // Add helper method to remove content for recreation
    removeContent() {
        if (this.element) {
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
        }
    }

    // Add helper method to create content
    createContent() {
        this.showMainContent();
    }
} 