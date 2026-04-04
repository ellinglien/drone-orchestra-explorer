/**
 * Metadata Display Component
 * Shows month info, artist names on hover, and navigation
 */

class MetadataDisplay {
  constructor() {
    this.monthInfoEl = null;
    this.artistHoverEl = null;
    this.changeMonthBtn = null;
    this.currentMonth = null;
    this.onChangeMonth = null; // Callback for change month button
  }

  /**
   * Initialize display elements
   */
  init() {
    // Create month info overlay (top-right corner)
    this.monthInfoEl = document.createElement('div');
    this.monthInfoEl.id = 'month-info';
    this.monthInfoEl.className = 'metadata-overlay';
    document.body.appendChild(this.monthInfoEl);

    // Create artist hover label (follows cursor)
    this.artistHoverEl = document.createElement('div');
    this.artistHoverEl.id = 'artist-hover';
    this.artistHoverEl.className = 'artist-label';
    this.artistHoverEl.style.display = 'none';
    document.body.appendChild(this.artistHoverEl);

    // Create change month button (top-left corner)
    this.changeMonthBtn = document.createElement('button');
    this.changeMonthBtn.id = 'change-month-btn';
    this.changeMonthBtn.className = 'change-month-button';
    this.changeMonthBtn.innerHTML = '◄ Change Month';
    this.changeMonthBtn.addEventListener('click', () => {
      if (this.onChangeMonth) {
        this.onChangeMonth();
      }
    });
    document.body.appendChild(this.changeMonthBtn);

    // Set up raycaster hover detection
    this.setupHoverDetection();
  }

  /**
   * Update month information display
   */
  setMonth(monthData) {
    this.currentMonth = monthData;

    if (this.monthInfoEl) {
      const themeText = monthData.theme ? `<div class="month-theme">Theme: ${monthData.theme}</div>` : '';
      this.monthInfoEl.innerHTML = `
        <div class="month-name">${monthData.name}</div>
        ${themeText}
        <div class="drone-count">${monthData.droneCount} Drone${monthData.droneCount !== 1 ? 's' : ''}</div>
      `;
    }
  }

  /**
   * Show artist name on hover
   */
  showArtist(artistName, x, y) {
    if (this.artistHoverEl) {
      this.artistHoverEl.textContent = artistName;
      this.artistHoverEl.style.left = `${x + 15}px`;
      this.artistHoverEl.style.top = `${y + 15}px`;
      this.artistHoverEl.style.display = 'block';
    }
  }

  /**
   * Hide artist label
   */
  hideArtist() {
    if (this.artistHoverEl) {
      this.artistHoverEl.style.display = 'none';
    }
  }

  /**
   * Setup hover detection for drone entities
   * This is a simplified implementation - could be enhanced with A-Frame cursor component
   */
  setupHoverDetection() {
    // Track mouse movement
    document.addEventListener('mousemove', (event) => {
      // Simple implementation: check if hovering over any drone entity
      // In production, this would use A-Frame's raycaster
      const hoveredEntity = this.findHoveredDrone(event);

      if (hoveredEntity && hoveredEntity.dataset.artist) {
        this.showArtist(hoveredEntity.dataset.artist, event.clientX, event.clientY);
      } else {
        this.hideArtist();
      }
    });
  }

  /**
   * Find drone entity under cursor (simplified)
   */
  findHoveredDrone(event) {
    // This is a simplified version - in practice, A-Frame's raycaster would be used
    // For now, we'll just hide the artist label since proper raycasting requires A-Frame integration
    return null;
  }

  /**
   * Hide all metadata (when returning to month selector)
   */
  hide() {
    if (this.monthInfoEl) this.monthInfoEl.style.display = 'none';
    if (this.changeMonthBtn) this.changeMonthBtn.style.display = 'none';
    this.hideArtist();
  }

  /**
   * Show all metadata (when month is loaded)
   */
  show() {
    if (this.monthInfoEl) this.monthInfoEl.style.display = 'block';
    if (this.changeMonthBtn) this.changeMonthBtn.style.display = 'block';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetadataDisplay;
}
