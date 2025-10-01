/**
 * Zeiterfassung Application
 * Manual entry, CSV export/import, PDF download, monthly timesheet view
 */

// Types
type Session = {
  id: string;
  startUtc: string;
  endUtc?: string;
  notes?: string;
};

type Store = {
  version: 1;
  sessions: Session[];
  userName?: string;
};

// Storage utilities
const STORAGE_KEY = 'zeiterfassung.store';
const CURRENT_VERSION = 1;

function getStore(): Store {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { version: CURRENT_VERSION, sessions: [], userName: '' };
    }
    return JSON.parse(stored) as Store;
  } catch (error) {
    console.warn('Failed to load store:', error);
    return { version: CURRENT_VERSION, sessions: [], userName: '' };
  }
}

function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save store:', error);
    throw new Error('Failed to save data. Storage may be full.');
  }
}

function addSession(session: Session): void {
  const store = getStore();
  store.sessions.push(session);
  saveStore(store);
}

function updateSession(sessionId: string, updates: Partial<Session>): void {
  const store = getStore();
  const index = store.sessions.findIndex(s => s.id === sessionId);
  if (index === -1) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }
  store.sessions[index] = { ...store.sessions[index], ...updates };
  saveStore(store);
}

function deleteSessionFromStore(sessionId: string): void {
  const store = getStore();
  store.sessions = store.sessions.filter(s => s.id !== sessionId);
  saveStore(store);
}

function getAllSessions(): Session[] {
  return getStore().sessions;
}

function getUserName(): string {
  return getStore().userName || '';
}

function setUserName(name: string): void {
  const store = getStore();
  store.userName = name;
  saveStore(store);
}

// Time utilities
function formatTotal(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function utcIsoToLocalDate(utcIso: string): string {
  const date = new Date(utcIso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function utcIsoToLocalTime(utcIso: string): string {
  const date = new Date(utcIso);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function localToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function getTodayTotal(sessions: Session[]): number {
  const today = getTodayString();
  return sessions
    .filter(session => session.endUtc && utcIsoToLocalDate(session.startUtc) === today)
    .reduce((total, session) => {
      if (!session.endUtc) return total;
      return total + (new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime());
    }, 0);
}

function getCurrentWeekTotal(sessions: Session[]): number {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return sessions
    .filter(session => {
      if (!session.endUtc) return false;
      const sessionDate = new Date(session.startUtc);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    })
    .reduce((total, session) => {
      if (!session.endUtc) return total;
      return total + (new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime());
    }, 0);
}

function getCurrentMonthTotal(sessions: Session[]): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  return sessions
    .filter(session => {
      if (!session.endUtc) return false;
      const sessionDate = new Date(session.startUtc);
      return sessionDate.getFullYear() === year && sessionDate.getMonth() === month;
    })
    .reduce((total, session) => {
      if (!session.endUtc) return total;
      return total + (new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime());
    }, 0);
}

function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = daysInMonth; day >= 1; day--) {
    const date = new Date(year, month, day);
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    days.push(`${yearStr}-${monthStr}-${dayStr}`);
  }
  
  return days;
}

function getAvailableMonths(sessions: Session[]): Array<{year: number, month: number, label: string}> {
  const months = new Set<string>();
  const today = new Date();
  
  months.add(`${today.getFullYear()}-${today.getMonth()}`);
  
  sessions.forEach(session => {
    const date = new Date(session.startUtc);
    months.add(`${date.getFullYear()}-${date.getMonth()}`);
  });
  
  const result = Array.from(months).map(m => {
    const [year, month] = m.split('-').map(Number);
    const date = new Date(year, month, 1);
    return {
      year,
      month,
      label: date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
    };
  });
  
  return result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

// DOM utilities
function qs<T extends Element = Element>(selector: string, parent: Document | Element = document): T | null {
  return parent.querySelector<T>(selector);
}

function setText(element: Element, text: string): void {
  element.textContent = text;
}

function setValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  element.value = value;
}

function show(element: Element): void {
  element.classList.remove('hidden');
}

function hide(element: Element): void {
  element.classList.add('hidden');
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function showStatusMessage(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
  const existing = document.querySelector('.status-message');
  if (existing) {
    existing.remove();
  }
  
  const statusElement = document.createElement('div');
  statusElement.className = `status-message ${type}`;
  statusElement.setAttribute('aria-live', 'polite');
  statusElement.textContent = message;
  
  document.body.appendChild(statusElement);
  
  setTimeout(() => {
    if (statusElement.parentNode) {
      statusElement.parentNode.removeChild(statusElement);
    }
  }, 5000);
}

// UI rendering
function updateTotals(sessions: Session[]): void {
  const dailyTotal = getTodayTotal(sessions);
  const weeklyTotal = getCurrentWeekTotal(sessions);
  const monthlyTotal = getCurrentMonthTotal(sessions);
  
  const dailyElement = qs('#daily-total');
  const weeklyElement = qs('#weekly-total');
  const monthlyElement = qs('#monthly-total');
  
  if (dailyElement) {
    setText(dailyElement, formatTotal(dailyTotal));
  }
  
  if (weeklyElement) {
    setText(weeklyElement, formatTotal(weeklyTotal));
  }
  
  if (monthlyElement) {
    setText(monthlyElement, formatTotal(monthlyTotal));
  }
}

function renderTimesheetTable(sessions: Session[], year: number, month: number): void {
  const tbody = qs('#timesheet-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const days = getDaysInMonth(year, month);
  const sessionsByDate = new Map<string, Session[]>();
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.startUtc);
    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth();
    
    if (sessionYear === year && sessionMonth === month) {
      const dateStr = utcIsoToLocalDate(session.startUtc);
      if (!sessionsByDate.has(dateStr)) {
        sessionsByDate.set(dateStr, []);
      }
      sessionsByDate.get(dateStr)!.push(session);
    }
  });
  
  days.forEach(date => {
    const daySessions = sessionsByDate.get(date) || [];
    
    if (daySessions.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDateString(date)}</td>
        <td>-</td>
        <td>-</td>
        <td>0h 0m</td>
        <td>-</td>
        <td>-</td>
      `;
      tbody.appendChild(row);
    } else {
      daySessions.forEach((session, index) => {
        const duration = session.endUtc 
          ? formatTotal(new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime())
          : 'Unvollständig';
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${index === 0 ? formatDateString(date) : ''}</td>
          <td>${utcIsoToLocalTime(session.startUtc)}</td>
          <td>${session.endUtc ? utcIsoToLocalTime(session.endUtc) : '-'}</td>
          <td class="duration-cell">${duration}</td>
          <td class="notes-cell">
            <div class="notes-display" onclick="editNotes('${session.id}', this)">${session.notes || 'Notizen hinzufügen'}</div>
          </td>
          <td>
            <button class="table-action-button" onclick="handleDeleteSession('${session.id}')">Löschen</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  });
}

function formatDateString(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  if (checkDate.getTime() === today.getTime()) {
    return 'Heute';
  } else if (checkDate.getTime() === yesterday.getTime()) {
    return 'Gestern';
  } else {
    return date.toLocaleDateString('de-DE');
  }
}

function showManualForm(): void {
  const formSection = qs('#manual-form-section');
  if (formSection) {
    show(formSection);
    
    const dateInput = qs<HTMLInputElement>('#manual-date');
    const startInput = qs<HTMLInputElement>('#manual-start');
    
    if (dateInput) {
      setValue(dateInput, new Date().toISOString().split('T')[0]);
    }
    if (startInput) {
      setValue(startInput, new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  }
}

function hideManualForm(): void {
  const formSection = qs('#manual-form-section');
  if (formSection) {
    hide(formSection);
    const form = qs<HTMLFormElement>('#manual-form');
    if (form) {
      form.reset();
    }
  }
}

function clearManualFormFields(): void {
  const startInput = qs<HTMLInputElement>('#manual-start');
  const endInput = qs<HTMLInputElement>('#manual-end');
  const notesInput = qs<HTMLTextAreaElement>('#manual-notes');
  
  if (startInput) setValue(startInput, '');
  if (endInput) setValue(endInput, '');
  if (notesInput) setValue(notesInput, '');
  
  if (startInput) startInput.focus();
}

function getManualFormData(): { date: string; startTime: string; endTime: string; notes: string } | null {
  const dateInput = qs<HTMLInputElement>('#manual-date');
  const startInput = qs<HTMLInputElement>('#manual-start');
  const endInput = qs<HTMLInputElement>('#manual-end');
  const notesInput = qs<HTMLTextAreaElement>('#manual-notes');
  
  if (!dateInput || !startInput || !endInput || !notesInput) {
    return null;
  }
  
  return {
    date: dateInput.value,
    startTime: startInput.value,
    endTime: endInput.value,
    notes: notesInput.value
  };
}

// PDF Generation
function generatePDF(sessions: Session[], userName: string, year: number, month: number): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showStatusMessage('Bitte erlauben Sie Pop-ups zum Herunterladen des PDFs', 'error');
    return;
  }
  
  const days = getDaysInMonth(year, month);
  const sessionsByDate = new Map<string, Session[]>();
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.startUtc);
    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth();
    
    if (sessionYear === year && sessionMonth === month) {
      const dateStr = utcIsoToLocalDate(session.startUtc);
      if (!sessionsByDate.has(dateStr)) {
        sessionsByDate.set(dateStr, []);
      }
      sessionsByDate.get(dateStr)!.push(session);
    }
  });
  
  let tableRows = '';
  let monthTotal = 0;
  
  days.forEach(date => {
    const daySessions = sessionsByDate.get(date) || [];
    
    if (daySessions.length === 0) {
      tableRows += `
        <tr>
          <td>${formatDateString(date)}</td>
          <td>-</td>
          <td>-</td>
          <td>0h 0m</td>
          <td>-</td>
        </tr>
      `;
    } else {
      daySessions.forEach((session, index) => {
        if (session.endUtc) {
          monthTotal += new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime();
        }
        
        const duration = session.endUtc 
          ? formatTotal(new Date(session.endUtc).getTime() - new Date(session.startUtc).getTime())
          : 'Unvollständig';
        
        tableRows += `
          <tr>
            <td>${index === 0 ? formatDateString(date) : ''}</td>
            <td>${utcIsoToLocalTime(session.startUtc)}</td>
            <td>${session.endUtc ? utcIsoToLocalTime(session.endUtc) : '-'}</td>
            <td>${duration}</td>
            <td>${session.notes || '-'}</td>
          </tr>
        `;
      });
    }
  });
  
  const monthLabel = new Date(year, month, 1).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Zeiterfassung - ${userName || 'Stundenzettel'} - ${monthLabel}</title>
      <style>
        @page { margin: 2cm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .header h1 { margin: 0 0 10px 0; color: #2563eb; font-size: 28px; }
        .header .user-name { font-size: 20px; font-weight: bold; margin: 10px 0; }
        .header .month { font-size: 18px; font-weight: 600; margin: 10px 0; color: #111827; }
        .header .date { font-size: 14px; color: #6b7280; }
        .totals { display: flex; justify-content: center; gap: 40px; margin: 20px 0 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; }
        .total-item { text-align: center; }
        .total-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
        .total-value { font-size: 20px; font-weight: 600; color: #111827; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; color: #111827; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Zeiterfassung</h1>
        ${userName ? `<div class="user-name">${userName}</div>` : ''}
        <div class="month">${monthLabel}</div>
        <div class="date">Erstellt am ${currentDate}</div>
      </div>
      
      <div class="totals">
        <div class="total-item">
          <div class="total-label">Monatssumme</div>
          <div class="total-value">${formatTotal(monthTotal)}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Start</th>
            <th>Ende</th>
            <th>Dauer</th>
            <th>Notizen</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Zeiterfassung Stundenzettel - ${monthLabel}</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 100);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

// Global functions for inline event handlers
(window as any).editNotes = function(sessionId: string, element: HTMLElement): void {
  const currentNotes = element.textContent || '';
  const input = document.createElement('textarea');
  input.className = 'notes-input';
  input.value = currentNotes;
  input.rows = 1;
  
  element.style.display = 'none';
  element.parentNode?.insertBefore(input, element);
  input.focus();
  input.select();
  
  const saveNotes = () => {
    const newNotes = input.value;
    element.textContent = newNotes || 'Notizen hinzufügen';
    element.style.display = 'block';
    input.remove();
    
    try {
      updateSession(sessionId, { notes: newNotes });
      app.updateUI();
    } catch (error) {
      showStatusMessage('Fehler beim Aktualisieren der Notizen', 'error');
    }
  };
  
  input.addEventListener('blur', saveNotes);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNotes();
    } else if (e.key === 'Escape') {
      element.style.display = 'block';
      input.remove();
    }
  });
};

(window as any).handleDeleteSession = function(sessionId: string): void {
  try {
    deleteSessionFromStore(sessionId);
    app.sessions = app.sessions.filter(s => s.id !== sessionId);
    app.updateUI();
    showStatusMessage('Eintrag gelöscht');
  } catch (error) {
    showStatusMessage('Fehler beim Löschen des Eintrags', 'error');
  }
};

// Main App Class
class ZeiterfassungApp {
  public sessions: Session[] = [];
  private userName: string = '';
  private currentYear: number;
  private currentMonth: number;

  constructor() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.init();
  }

  private init(): void {
    this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.populateMonthSelector();
  }

  private loadData(): void {
    this.sessions = getAllSessions();
    this.userName = getUserName();
    
    const nameInput = qs<HTMLInputElement>('#user-name');
    if (nameInput) {
      setValue(nameInput, this.userName);
    }
  }

  private populateMonthSelector(): void {
    const monthSelect = qs<HTMLSelectElement>('#month-select');
    if (!monthSelect) return;
    
    const availableMonths = getAvailableMonths(this.sessions);
    monthSelect.innerHTML = '';
    
    availableMonths.forEach(({year, month, label}) => {
      const option = document.createElement('option');
      option.value = `${year}-${month}`;
      option.textContent = label;
      if (year === this.currentYear && month === this.currentMonth) {
        option.selected = true;
      }
      monthSelect.appendChild(option);
    });
  }

  private setupEventListeners(): void {
    const nameInput = qs<HTMLInputElement>('#user-name');
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        this.userName = nameInput.value;
        setUserName(this.userName);
      });
    }

    const monthSelect = qs<HTMLSelectElement>('#month-select');
    if (monthSelect) {
      monthSelect.addEventListener('change', () => {
        const [year, month] = monthSelect.value.split('-').map(Number);
        this.currentYear = year;
        this.currentMonth = month;
        this.updateUI();
      });
    }

    const prevButton = qs<HTMLButtonElement>('#prev-month');
    if (prevButton) {
      prevButton.addEventListener('click', () => this.navigateMonth(-1));
    }

    const nextButton = qs<HTMLButtonElement>('#next-month');
    if (nextButton) {
      nextButton.addEventListener('click', () => this.navigateMonth(1));
    }

    const exportPdfButton = qs<HTMLButtonElement>('#export-pdf');
    if (exportPdfButton) {
      exportPdfButton.addEventListener('click', () => this.handleExportPDF());
    }

    const exportButton = qs<HTMLButtonElement>('#export-csv');
    if (exportButton) {
      exportButton.addEventListener('click', () => this.handleExportCSV());
    }

    const importInput = qs<HTMLInputElement>('#import-csv');
    if (importInput) {
      importInput.addEventListener('change', (e) => this.handleImportCSV(e));
    }

    const addManualButton = qs<HTMLButtonElement>('#add-manual');
    if (addManualButton) {
      addManualButton.addEventListener('click', () => this.handleAddManual());
    }

    const manualForm = qs<HTMLFormElement>('#manual-form');
    if (manualForm) {
      manualForm.addEventListener('submit', (e) => this.handleManualFormSubmit(e));
    }

    const cancelManualButton = qs<HTMLButtonElement>('#cancel-manual');
    if (cancelManualButton) {
      cancelManualButton.addEventListener('click', () => this.handleCancelManual());
    }
  }

  private navigateMonth(direction: number): void {
    const newMonth = this.currentMonth + direction;
    
    if (newMonth < 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    } else if (newMonth > 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    } else {
      this.currentMonth = newMonth;
    }
    
    const monthSelect = qs<HTMLSelectElement>('#month-select');
    if (monthSelect) {
      monthSelect.value = `${this.currentYear}-${this.currentMonth}`;
    }
    
    this.updateUI();
    this.populateMonthSelector();
  }

  public updateUI(): void {
    updateTotals(this.sessions);
    renderTimesheetTable(this.sessions, this.currentYear, this.currentMonth);
  }

  private handleExportPDF(): void {
    try {
      generatePDF(this.sessions, this.userName, this.currentYear, this.currentMonth);
      showStatusMessage('PDF erfolgreich erstellt');
    } catch (error) {
      showStatusMessage('Fehler beim Erstellen des PDFs', 'error');
    }
  }

  private handleExportCSV(): void {
    try {
      const headers = ['id', 'startUtc', 'endUtc', 'notes'];
      const rows = this.sessions.map(session => [
        session.id,
        session.startUtc,
        session.endUtc || '',
        session.notes || ''
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const filename = `zeiterfassung-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatusMessage('Daten erfolgreich exportiert');
    } catch (error) {
      showStatusMessage('Fehler beim Exportieren der Daten', 'error');
    }
  }

  private async handleImportCSV(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        showStatusMessage('CSV-Datei ist leer oder ungültig', 'error');
        return;
      }
      
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 3) {
          const session: Session = {
            id: values[0] || generateId(),
            startUtc: values[1],
            endUtc: values[2] || undefined,
            notes: values[3] || undefined
          };
          addSession(session);
          imported++;
        }
      }
      
      this.loadData();
      this.populateMonthSelector();
      this.updateUI();
      showStatusMessage(`Erfolgreich ${imported} Einträge importiert`);
      
    } catch (error) {
      showStatusMessage('Fehler beim Importieren der CSV-Datei', 'error');
    } finally {
      input.value = '';
    }
  }

  private handleAddManual(): void {
    showManualForm();
  }

  private handleManualFormSubmit(event: Event): void {
    event.preventDefault();
    
    const formData = getManualFormData();
    if (!formData) {
      showStatusMessage('Fehler beim Abrufen der Formulardaten', 'error');
      return;
    }

    if (!formData.date || !formData.startTime || !formData.endTime) {
      showStatusMessage('Bitte füllen Sie alle erforderlichen Felder aus', 'error');
      return;
    }

    try {
      const startUtc = localToUtcIso(formData.date, formData.startTime);
      const endUtc = localToUtcIso(formData.date, formData.endTime);
      
      const session: Session = {
        id: generateId(),
        startUtc,
        endUtc,
        notes: formData.notes || undefined
      };

      addSession(session);
      this.sessions.push(session);
      
      clearManualFormFields();
      this.populateMonthSelector();
      this.updateUI();
      showStatusMessage('Manueller Eintrag erfolgreich hinzugefügt');
      
    } catch (error) {
      showStatusMessage('Fehler beim Hinzufügen des manuellen Eintrags', 'error');
    }
  }

  private handleCancelManual(): void {
    hideManualForm();
  }
}

// Initialize the app
let app: ZeiterfassungApp;

document.addEventListener('DOMContentLoaded', () => {
  app = new ZeiterfassungApp();
});
