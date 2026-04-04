/**
 * Month Selector Component
 * Fetches months.json and displays selection overlay
 */

class MonthSelector {
  constructor() {
    this.overlay = null;
    this.monthsList = null;
    this.monthsData = null;
    this.onMonthSelected = null; // Callback for when month is selected
  }

  /**
   * Initialize selector and fetch months data
   */
  async init() {
    try {
      // Fetch months.json
      const response = await fetch('/data/months.json');
      if (!response.ok) {
        throw new Error(`Failed to load months: ${response.status}`);
      }

      this.monthsData = await response.json();

      // Create and show overlay
      this.createOverlay();
      this.renderMonths();
      this.show();
    } catch (error) {
      console.error('Month selector error:', error);
      this.showError('Failed to load months. Please refresh the page.');
    }
  }

  /**
   * Create overlay DOM structure
   */
  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'month-selector-overlay';
    this.overlay.innerHTML = `
      <div class="month-selector-content">
        <h1>Drone Orchestra Archive</h1>
        <p class="subtitle">Select a month to explore</p>
        <div id="months-list" class="months-list"></div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.monthsList = document.getElementById('months-list');
  }

  /**
   * Render months list from data
   */
  renderMonths() {
    if (!this.monthsData || !this.monthsData.months) {
      this.showError('No months available.');
      return;
    }

    // Months are already sorted newest first in JSON
    this.monthsData.months.forEach((month, index) => {
      const monthElement = document.createElement('div');
      monthElement.className = 'month-item';
      if (index === 0) {
        monthElement.classList.add('latest'); // Highlight latest month
      }

      monthElement.innerHTML = `
        <div class="month-name">${month.name}${month.theme ? ' - ' + month.theme : ''}</div>
        <div class="month-info">${month.droneCount} drone${month.droneCount !== 1 ? 's' : ''}</div>
      `;

      monthElement.addEventListener('click', () => {
        this.selectMonth(month);
      });

      this.monthsList.appendChild(monthElement);
    });
  }

  /**
   * Handle month selection
   */
  selectMonth(month) {
    console.log('Month selected:', month.id);

    // Call callback if provided
    if (this.onMonthSelected) {
      this.onMonthSelected(month);
    }

    // Hide overlay
    this.hide();
  }

  /**
   * Show overlay
   */
  show() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
    }
  }

  /**
   * Hide overlay with fade
   */
  hide() {
    if (this.overlay) {
      this.overlay.classList.add('fade-out');
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.overlay.classList.remove('fade-out');
      }, 500);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.monthsList) {
      this.monthsList.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthSelector;
}
