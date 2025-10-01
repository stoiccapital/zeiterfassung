/**
 * Zeiterfassung Application - Main Entry Point
 * Simple application without time tracking functionality
 */

class ZeiterfassungApp {
  constructor() {
    this.init();
  }

  private init(): void {
    console.log('Zeiterfassung application initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Add any event listeners here if needed
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM loaded - Zeiterfassung ready');
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ZeiterfassungApp();
});
