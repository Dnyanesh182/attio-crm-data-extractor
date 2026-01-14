// Shadow DOM Indicator for Attio CRM Data Extractor
// Provides visual feedback during extraction using Shadow DOM for style isolation

import type { IndicatorState, IndicatorMessage } from '../shared/types';

const INDICATOR_ID = 'attio-extractor-indicator';

let shadowRoot: ShadowRoot | null = null;
let indicatorElement: HTMLElement | null = null;

/**
 * Create the extraction indicator using Shadow DOM
 */
export function createIndicator(): void {
    // Remove existing indicator if present
    removeIndicator();

    // Create host element
    const host = document.createElement('div');
    host.id = INDICATOR_ID;
    host.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;

    // Attach shadow DOM for style isolation
    shadowRoot = host.attachShadow({ mode: 'closed' });

    // Add styles and initial content
    shadowRoot.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .indicator {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #e2e8f0;
        animation: slideIn 0.3s ease-out;
        max-width: 320px;
        pointer-events: auto;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(20px);
        }
      }
      
      .indicator.hiding {
        animation: slideOut 0.3s ease-in forwards;
      }
      
      .icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(99, 102, 241, 0.3);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .check-icon {
        color: #22c55e;
      }
      
      .error-icon {
        color: #ef4444;
      }
      
      .content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .status {
        font-weight: 500;
        color: #f8fafc;
      }
      
      .message {
        font-size: 11px;
        color: #94a3b8;
      }
      
      .progress-bar {
        width: 100%;
        height: 3px;
        background: rgba(99, 102, 241, 0.2);
        border-radius: 2px;
        margin-top: 6px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      .close-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 18px;
        height: 18px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s, background 0.2s;
      }
      
      .indicator:hover .close-btn {
        opacity: 1;
      }
      
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
    </style>
    
    <div class="indicator" id="indicator">
      <div class="icon">
        <div class="spinner"></div>
      </div>
      <div class="content">
        <span class="status">Initializing...</span>
        <span class="message"></span>
      </div>
      <button class="close-btn" id="closeBtn">×</button>
    </div>
  `;

    document.body.appendChild(host);
    indicatorElement = shadowRoot.getElementById('indicator');

    // Add close button handler
    const closeBtn = shadowRoot.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideIndicator();
        });
    }
}

/**
 * Update the indicator state
 */
export function updateIndicator(update: IndicatorMessage): void {
    if (!shadowRoot || !indicatorElement) {
        createIndicator();
    }

    if (!shadowRoot) return;

    const iconContainer = shadowRoot.querySelector('.icon');
    const statusElement = shadowRoot.querySelector('.status');
    const messageElement = shadowRoot.querySelector('.message');

    if (!iconContainer || !statusElement || !messageElement) return;

    // Update icon based on state
    switch (update.state) {
        case 'extracting':
            iconContainer.innerHTML = '<div class="spinner"></div>';
            (statusElement as HTMLElement).textContent = 'Extracting data...';
            break;

        case 'success':
            iconContainer.innerHTML = `
        <svg class="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
        </svg>
      `;
            (statusElement as HTMLElement).textContent = 'Extraction complete!';
            break;

        case 'error':
            iconContainer.innerHTML = `
        <svg class="error-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/>
        </svg>
      `;
            (statusElement as HTMLElement).textContent = 'Extraction failed';
            break;

        default:
            iconContainer.innerHTML = '<div class="spinner"></div>';
    }

    // Update message
    if (update.message) {
        (messageElement as HTMLElement).textContent = update.message;
        (messageElement as HTMLElement).style.display = 'block';
    } else {
        (messageElement as HTMLElement).style.display = 'none';
    }

    // Update progress bar if provided
    if (update.progress) {
        let progressBar = shadowRoot.querySelector('.progress-bar');
        if (!progressBar) {
            const content = shadowRoot.querySelector('.content');
            if (content) {
                const bar = document.createElement('div');
                bar.className = 'progress-bar';
                bar.innerHTML = '<div class="progress-fill" style="width: 0%"></div>';
                content.appendChild(bar);
                progressBar = bar;
            }
        }

        if (progressBar) {
            const fill = progressBar.querySelector('.progress-fill') as HTMLElement;
            if (fill) {
                const percent = Math.round((update.progress.current / update.progress.total) * 100);
                fill.style.width = `${percent}%`;
            }
        }
    }

    // Auto-hide on success or error after delay
    if (update.state === 'success' || update.state === 'error') {
        setTimeout(() => {
            hideIndicator();
        }, update.state === 'success' ? 2000 : 4000);
    }
}

/**
 * Hide and remove the indicator
 */
export function hideIndicator(): void {
    if (!indicatorElement) return;

    indicatorElement.classList.add('hiding');

    setTimeout(() => {
        removeIndicator();
    }, 300);
}

/**
 * Remove the indicator from DOM
 */
export function removeIndicator(): void {
    const existing = document.getElementById(INDICATOR_ID);
    if (existing) {
        existing.remove();
    }
    shadowRoot = null;
    indicatorElement = null;
}

/**
 * Show extracting state with optional message
 */
export function showExtracting(message?: string): void {
    updateIndicator({ state: 'extracting', message });
}

/**
 * Show success state with message
 */
export function showSuccess(message: string): void {
    updateIndicator({ state: 'success', message });
}

/**
 * Show error state with message
 */
export function showError(message: string): void {
    updateIndicator({ state: 'error', message });
}

/**
 * Update extraction progress
 */
export function showProgress(current: number, total: number, type: string): void {
    updateIndicator({
        state: 'extracting',
        message: `Processing ${type}...`,
        progress: { current, total },
    });
}
