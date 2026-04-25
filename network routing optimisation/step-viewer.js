// step-viewer.js — Interactive step-by-step algorithm trace viewer

const StepViewer = {
  steps: [],
  currentStep: 0,
  algorithmName: '',
  isPlaying: false,
  playInterval: null,
  playSpeed: 800, // ms per step
  onStepChange: null, // callback(step, index) for highlighting

  /**
   * Load steps from an algorithm result and show the viewer.
   */
  load(steps, algorithmName, onStepChange) {
    this.steps = steps;
    this.currentStep = 0;
    this.algorithmName = algorithmName;
    this.isPlaying = false;
    this.onStepChange = onStepChange;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.show();
    this.renderStep();
  },

  /**
   * Show the step viewer panel.
   */
  show() {
    const panel = document.getElementById('step-viewer-panel');
    if (panel) panel.classList.remove('hidden');
  },

  /**
   * Hide the step viewer panel.
   */
  hide() {
    const panel = document.getElementById('step-viewer-panel');
    if (panel) panel.classList.add('hidden');
    this.stop();
  },

  /**
   * Render the current step.
   */
  renderStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    // Update counter
    const counter = document.getElementById('step-counter');
    if (counter) {
      counter.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
    }

    // Update algorithm label
    const label = document.getElementById('step-algo-label');
    if (label) {
      label.textContent = this.algorithmName;
    }

    // Update progress bar
    const progress = document.getElementById('step-progress');
    if (progress) {
      const pct = this.steps.length > 1
        ? (this.currentStep / (this.steps.length - 1)) * 100
        : 100;
      progress.style.width = `${pct}%`;
    }

    // Update play/pause icon
    const playBtn = document.getElementById('step-play-btn');
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? SVG_PAUSE : SVG_PLAY;
      playBtn.title = this.isPlaying ? 'Pause' : 'Play';
    }

    // Enable/disable prev/next
    const prevBtn = document.getElementById('step-prev-btn');
    const nextBtn = document.getElementById('step-next-btn');
    if (prevBtn) prevBtn.disabled = this.currentStep === 0;
    if (nextBtn) nextBtn.disabled = this.currentStep === this.steps.length - 1;

    // Render step detail card
    this.renderDetailCard(step);

    // Render timeline dots
    this.renderTimeline();

    // Fire callback for graph highlighting
    if (this.onStepChange) {
      this.onStepChange(step, this.currentStep);
    }
  },

  /**
   * Render the detail card for the current step.
   */
  renderDetailCard(step) {
    const container = document.getElementById('step-detail');
    if (!container) return;

    // Map step type to visual style
    const typeConfig = {
      'init':           { icon: '🔧', color: 'cyan',   label: 'INIT' },
      'relax':          { icon: step.relaxed ? '✅' : '➖', color: step.relaxed ? 'emerald' : 'gray', label: step.relaxed ? 'RELAXED' : 'NO CHANGE' },
      'early-stop':     { icon: '⚡', color: 'amber',  label: 'EARLY STOP' },
      'negative-cycle': { icon: '⚠️', color: 'red',    label: 'NEG. CYCLE' },
      'check':          { icon: step.updated ? '✅' : '➖', color: step.updated ? 'emerald' : 'gray', label: step.updated ? 'UPDATED' : 'NO CHANGE' },
      'k-complete':     { icon: '📊', color: 'teal',   label: 'K DONE' },
      'bfs':            { icon: '🔍', color: 'blue',   label: 'BFS' },
      'bottleneck':     { icon: '🔻', color: 'amber',  label: 'BOTTLENECK' },
      'augment':        { icon: '💧', color: 'green',  label: 'AUGMENT' },
      'no-path':        { icon: '🚫', color: 'gray',   label: 'NO PATH' },
      'done':           { icon: '🏁', color: 'cyan',   label: 'COMPLETE' }
    };

    const config = typeConfig[step.type] || { icon: '•', color: 'gray', label: step.type };
    const isDone = step.type === 'done';

    let html = `
      <div class="step-card ${isDone ? 'step-done' : ''}" style="--accent: var(--step-${config.color})">
        <div class="step-card-header">
          <span class="step-icon">${config.icon}</span>
          <span class="step-type-badge step-badge-${config.color}">${config.label}</span>
          ${step.iteration != null && step.iteration > 0 ? `<span class="step-iteration">Iter ${step.iteration}</span>` : ''}
        </div>
        <p class="step-description">${step.description}</p>
    `;

    // Render additional context based on algorithm type
    if (step.distances && step.type !== 'done') {
      html += this.renderDistanceTable(step.distances);
    }

    if (step.type === 'check' && step.kNode) {
      html += `<div class="step-context">Checking via intermediate node <span class="text-teal-400 font-bold">${step.kNode}</span>: ${step.iNode} → ${step.kNode} → ${step.jNode}</div>`;
    }

    if (step.path && step.path.length > 0) {
      html += `<div class="step-path">${step.path.map((n, idx) => 
        `<span class="step-path-node">${n}</span>${idx < step.path.length - 1 ? '<span class="step-path-arrow">→</span>' : ''}`
      ).join('')}</div>`;
    }

    if (step.totalFlow != null && step.type !== 'init') {
      html += `<div class="step-flow-total">Total Flow: <span class="text-cyan font-bold font-mono">${step.totalFlow} Mbps</span></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Animate card in
    const card = container.querySelector('.step-card');
    if (card && typeof anime !== 'undefined') {
      anime({
        targets: card,
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 200,
        easing: 'easeOutQuad'
      });
    }
  },

  /**
   * Render distance table for Bellman-Ford steps.
   */
  renderDistanceTable(distances) {
    const entries = Object.entries(distances);
    if (entries.length === 0) return '';
    
    let html = '<div class="step-dist-table"><table><thead><tr>';
    for (const [node] of entries) {
      html += `<th>${node}</th>`;
    }
    html += '</tr></thead><tbody><tr>';
    for (const [, dist] of entries) {
      const val = dist === Infinity ? '∞' : dist;
      const cls = dist === Infinity ? 'text-gray-600' : 'text-emerald-400';
      html += `<td class="${cls}">${val}</td>`;
    }
    html += '</tr></tbody></table></div>';
    return html;
  },

  /**
   * Render timeline dots (mini scrubber).
   */
  renderTimeline() {
    const container = document.getElementById('step-timeline');
    if (!container) return;
    container.innerHTML = '';

    // For many steps, show condensed view
    const maxDots = 40;
    const totalSteps = this.steps.length;

    if (totalSteps <= maxDots) {
      for (let i = 0; i < totalSteps; i++) {
        const dot = document.createElement('button');
        dot.className = 'step-dot';
        if (i === this.currentStep) dot.classList.add('active');
        if (i < this.currentStep) dot.classList.add('past');
        
        // Color based on step type
        const step = this.steps[i];
        if (step.relaxed || step.updated) dot.classList.add('highlight');
        if (step.type === 'done') dot.classList.add('done');
        
        dot.title = `Step ${i + 1}: ${step.description.substring(0, 60)}...`;
        dot.addEventListener('click', () => this.goToStep(i));
        container.appendChild(dot);
      }
    } else {
      // Condensed: show a slider-like bar
      const bar = document.createElement('input');
      bar.type = 'range';
      bar.min = 0;
      bar.max = totalSteps - 1;
      bar.value = this.currentStep;
      bar.className = 'step-scrubber';
      bar.addEventListener('input', (e) => this.goToStep(parseInt(e.target.value)));
      container.appendChild(bar);
    }
  },

  // Navigation
  goToStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.renderStep();
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.stop();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  },

  first() {
    this.currentStep = 0;
    this.renderStep();
  },

  last() {
    this.currentStep = this.steps.length - 1;
    this.renderStep();
  },

  // Playback
  play() {
    if (this.isPlaying) return;
    if (this.currentStep >= this.steps.length - 1) {
      this.currentStep = 0; // restart from beginning
    }
    this.isPlaying = true;
    this.renderStep();
    this.playInterval = setInterval(() => {
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        this.renderStep();
      } else {
        this.stop();
      }
    }, this.playSpeed);
  },

  stop() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    // Update play button icon
    const playBtn = document.getElementById('step-play-btn');
    if (playBtn) {
      playBtn.innerHTML = SVG_PLAY;
      playBtn.title = 'Play';
    }
  },

  togglePlay() {
    if (this.isPlaying) this.stop();
    else this.play();
  },

  setSpeed(speed) {
    this.playSpeed = speed;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
    // Update speed label
    const label = document.getElementById('step-speed-label');
    if (label) {
      const speeds = { 1200: '0.5×', 800: '1×', 400: '2×', 200: '4×' };
      label.textContent = speeds[speed] || '1×';
    }
  }
};

// SVG icons
const SVG_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const SVG_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`;
