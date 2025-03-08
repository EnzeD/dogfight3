/**
 * LandingPage.js - Landing page for game mode selection
 * Provides UI for selecting solo/multiplayer mode and entering callsign
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
    }

    /**
     * Create and show the landing page
     */
    show() {
        // Create landing page element
        this.element = document.createElement('div');
        this.element.className = 'landing-page';

        // Create overlay background
        const overlay = document.createElement('div');
        overlay.className = 'landing-overlay';
        this.element.appendChild(overlay);

        // Create content container
        const content = document.createElement('div');
        content.className = 'landing-content';

        // Add corner brackets for military style
        const cornerTL = document.createElement('div');
        cornerTL.className = 'corner top-left';
        content.appendChild(cornerTL);

        const cornerTR = document.createElement('div');
        cornerTR.className = 'corner top-right';
        content.appendChild(cornerTR);

        const cornerBL = document.createElement('div');
        cornerBL.className = 'corner bottom-left';
        content.appendChild(cornerBL);

        const cornerBR = document.createElement('div');
        cornerBR.className = 'corner bottom-right';
        content.appendChild(cornerBR);

        // Add WW2 decorative elements
        const decorTop = document.createElement('div');
        decorTop.className = 'ww2-decoration top-left';
        decorTop.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24"><path fill="#f8d742" d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"/></svg>';
        content.appendChild(decorTop);

        const decorBottom = document.createElement('div');
        decorBottom.className = 'ww2-decoration bottom-right';
        decorBottom.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24"><path fill="#f8d742" d="M4,7A2,2 0 0,0 2,9V15A2,2 0 0,0 4,17H20A2,2 0 0,0 22,15V9A2,2 0 0,0 20,7H4M4,9H20V15H4V9M2,3H20V5H2V3M2,19H20V21H2V19Z"/></svg>';
        content.appendChild(decorBottom);

        // Add title and subtitle
        const title = document.createElement('h1');
        title.className = 'landing-title';
        title.textContent = 'WW2 DOGFIGHT ARENA';
        content.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'landing-subtitle';
        subtitle.textContent = 'The most intuitive free-to-play MMO combat flight sim, 100% made with AI in 500 prompts!';
        content.appendChild(subtitle);

        // Create mode selection container
        const modeSelection = document.createElement('div');
        modeSelection.className = 'mode-selection';

        // Solo mode option
        const soloOption = document.createElement('div');
        soloOption.className = 'mode-option';
        soloOption.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="plane-icon" width="70" height="70">
                <path fill="#f8d742" d="M470.7,233.3h-64c-5.9,0-10.8,3.9-12.3,9.2l-6,21.3c0,0-83.3-20.3-101.1-24.5
                c3.1-17,10.2-61.9,10.2-95.8c0-35.3-28.7-64-64-64s-64,28.7-64,64c0,33.9,7.2,78.8,10.2,95.8
                c-17.8,4.3-101.1,24.5-101.1,24.5l-6-21.3c-1.5-5.3-6.4-9.2-12.3-9.2h-64c-7.7,0-13.8,6.7-12.8,14.4
                c1.1,8.2,9.3,13.4,17.1,10.9l35.9-11.1c1.1-0.3,2.1-0.8,3.1-1.3l58.9,17.9l-10.7,37.3c-0.8,3-0.3,6.2,1.5,8.7
                c1.8,2.5,4.7,4,7.7,4h85.3c7,0,12.1-6.8,10-13.5l-12.3-36.8c57.6-6.4,87.5-9.7,106-11.8l-1.5,8.9
                c-1.5,8.7,5.1,16.7,13.8,16.7h85.3c3.1,0,5.9-1.5,7.7-4c1.8-2.5,2.3-5.7,1.5-8.7l-10.7-37.3l58.9-17.9
                c1,0.6,2.1,1,3.1,1.3l35.9,11.1c7.8,2.5,16-2.7,17.1-10.9C484.5,240,478.4,233.3,470.7,233.3z"/>
                <path fill="#f8d742" d="M256,126c8.8,0,16-7.2,16-16V78c0-8.8-7.2-16-16-16s-16,7.2-16,16v32C240,118.8,247.2,126,256,126z"/>
            </svg>
            <h3>SOLO MISSION</h3>
            <p>Take to the skies alone and face AI enemies</p>
        `;
        soloOption.addEventListener('click', () => this.selectMode('solo', soloOption, multiOption));
        modeSelection.appendChild(soloOption);

        // Multiplayer mode option
        const multiOption = document.createElement('div');
        multiOption.className = 'mode-option';
        multiOption.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="plane-icon" width="70" height="70">
                <path fill="#f8d742" d="M398.2,232.8l-82.5-24.3c0.7-8.2,2.3-20.4,4.4-33.7c4.2-25.8,9.5-55,12.1-72.5
                c1.1-7.3-4-14-11.3-15.1c-7.3-1.1-14,4-15.1,11.3c-2.7,18.1-8.2,48.3-12.4,74.3c-2.2,13.8-3.9,26.2-4.6,34.4
                c-20.2-6-35-10.3-35-10.3l-12.5-36.9c-3.2-9.6-13.4-14.9-23-11.7l-9.3,3.1c-9.6,3.2-14.9,13.4-11.7,23l14.1,41.6
                c-18.5,3.3-38.2,6.1-55.4,8.3c-2.3-15.2-7.7-52.9-7.7-78c0-25.4,11.7-48,29.9-62.9c3.1-2.6,0.3-7.5-3.6-6.5c-14.7,3.7-28,10.8-38.9,20.5
                c-21.2,18.8-34.5,46.2-34.5,76.8c0,26.4,5.8,66.7,8.1,82c-13.1,1.5-23.2,2.3-28.3,2.5c-4.3-16.8-11.6-36.9-12.9-41.1
                c-2.1-6.8-9.1-10.9-16.2-9.2c-7.6,1.8-12.1,9.5-9.9,17c0,0,10.6,33.2,13.4,44.5c1.6,6.5,7.3,11.4,14.1,11.8c26.4,1.4,92.3-3.3,158-17.1
                c65.7-13.8,116.5-32.1,139.6-40.4c6.4-2.3,10.5-8.6,10.1-15.2C409.6,238.2,404.5,234.7,398.2,232.8z"/>
                <path fill="#f8d742" d="M352.8,305.9l-49.9-20c-5.1-2-10.9,0.4-12.9,5.5c-2,5.1,0.4,10.9,5.5,12.9l49.9,20c5.1,2,10.9-0.4,12.9-5.5
                C360.3,313.7,357.9,308,352.8,305.9z"/>
                <path fill="#f8d742" d="M192.5,290.9c-44.5,5.5-77.4,7-92.4,7.4c1.3,6.6,3.1,16.1,4.8,25.7c2.5,13.8,5.1,28.1,5.1,34.2
                c0,1.6,0.1,3.1,0.3,4.6c1.1,7.3,7.9,12.2,15.1,11.1c7.3-1.1,12.2-7.9,11.1-15.1c-0.1-0.5-0.1-1-0.1-1.6c0-4.5-2.4-17.8-4.7-30.5
                c-0.7-3.9-1.4-7.7-2.1-11.3c15.1-0.5,46.5-2.1,87.8-7.1c5.5-0.7,9.4-5.7,8.8-11.2C225.6,294,205.8,289.2,192.5,290.9z"/>
            </svg>
            <h3>SQUADRON</h3>
            <p>Join other pilots in multiplayer aerial combat</p>
        `;
        multiOption.addEventListener('click', () => this.selectMode('multi', multiOption, soloOption));
        modeSelection.appendChild(multiOption);

        content.appendChild(modeSelection);

        // Create callsign input section (initially hidden)
        const callsignSection = document.createElement('div');
        callsignSection.className = 'callsign-section';
        callsignSection.innerHTML = `
            <h3>ENTER YOUR CALLSIGN, PILOT:</h3>
            <input type="text" class="callsign-input" placeholder="CALLSIGN (e.g. MAVERICK)" maxlength="15">
        `;
        this.callsignSection = callsignSection;
        content.appendChild(callsignSection);

        // Create sponsor section
        const sponsorSection = document.createElement('div');
        sponsorSection.className = 'sponsor-section';

        // Add collapsed sponsor call-to-action
        const sponsorCTA = document.createElement('button');
        sponsorCTA.className = 'sponsor-cta';
        sponsorCTA.textContent = 'BECOME A SPONSOR';
        sponsorSection.appendChild(sponsorCTA);

        // Create sponsor details container (initially hidden)
        const sponsorDetails = document.createElement('div');
        sponsorDetails.className = 'sponsor-details';

        // Add sponsor heading with period-appropriate wording
        const sponsorHeading = document.createElement('h3');
        sponsorHeading.className = 'sponsor-heading';
        sponsorHeading.textContent = 'SUPPORT THE WAR EFFORT';
        sponsorDetails.appendChild(sponsorHeading);

        // Add sponsor description
        const sponsorDesc = document.createElement('p');
        sponsorDesc.className = 'sponsor-desc';
        sponsorDesc.textContent = 'Purchase advertising space in the game and get your logo and name displayed for all pilots to see!';
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
                url: 'https://buy.stripe.com/eVa17v8WKa2U6OY144'
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
                url: 'https://buy.stripe.com/6oE6rP2yma2U0qA4gi'
            }
        ];

        sponsorProducts.forEach(product => {
            const option = document.createElement('div');
            option.className = 'sponsor-option';

            const optionHTML = `
                <img src="${product.image}" alt="${product.name}" class="sponsor-icon">
                <h4>${product.name}</h4>
                <div class="sponsor-price">
                    <span class="price">${product.price}</span>
                    <span class="interval">${product.interval}</span>
                </div>
                <a href="${product.url}" target="_blank" class="sponsor-button">PURCHASE</a>
            `;

            option.innerHTML = optionHTML;
            sponsorOptions.appendChild(option);
        });

        // Add disclaimer note
        const disclaimer = document.createElement('p');
        disclaimer.className = 'sponsor-disclaimer';
        disclaimer.textContent = '* All proceeds go to support ongoing development. Sponsorships do not affect gameplay.';

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'sponsor-close';
        closeButton.textContent = 'CLOSE';

        // Append everything to the sponsor details
        sponsorDetails.appendChild(sponsorOptions);
        sponsorDetails.appendChild(disclaimer);
        sponsorDetails.appendChild(closeButton);

        // Add the details container to the sponsor section
        sponsorSection.appendChild(sponsorDetails);

        // Add toggle functionality
        sponsorCTA.addEventListener('click', () => {
            sponsorDetails.classList.add('visible');
            sponsorCTA.style.display = 'none';
        });

        closeButton.addEventListener('click', () => {
            sponsorDetails.classList.remove('visible');
            sponsorCTA.style.display = 'block';
        });

        content.appendChild(sponsorSection);

        // Create start button (initially disabled)
        const startButton = document.createElement('button');
        startButton.className = 'start-button';
        startButton.textContent = 'TAKE OFF!';
        startButton.disabled = true;
        startButton.addEventListener('click', () => this.startGame());
        this.startButton = startButton;
        content.appendChild(startButton);

        // Add reference to callsign input
        this.callsignInput = callsignSection.querySelector('.callsign-input');
        this.callsignInput.addEventListener('input', () => this.validateForm());

        this.element.appendChild(content);
        document.body.appendChild(this.element);
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
            this.startButton.disabled = callsign.length < 2;
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

        // Fade out landing page
        this.element.style.opacity = 0;

        // After animation, remove element and call onStart
        setTimeout(() => {
            this.element.remove();
            this.onStart(options);
        }, 500);
    }
} 