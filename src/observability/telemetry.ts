export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 'system' | 'canvas' | 'ui' | 'update' | 'crash' | 'perf';

export interface TelemetryLogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SystemInfo {
  appVersion: string;
  userAgent: string;
  screenResolution: string;
  windowSize: string;
  devicePixelRatio: number;
  hardwareAcceleration: boolean;
  platform: string;
  language: string;
  online: boolean;
}

const STORAGE_LOGS_KEY = 'inkova_diagnostics_logs';
const STORAGE_TELEMETRY_OPTIN_KEY = 'inkova_telemetry_optin';
const MAX_LOG_ENTRIES = 60;

export class DiagnosticsManager {
  private static instance: DiagnosticsManager | null = null;
  private logs: TelemetryLogEntry[] = [];
  private appVersion = '0.1.6';
  private initialized = false;
  private optIn = true;

  private constructor() {
    this.loadState();
  }

  public static getInstance(): DiagnosticsManager {
    if (!DiagnosticsManager.instance) {
      DiagnosticsManager.instance = new DiagnosticsManager();
    }
    return DiagnosticsManager.instance;
  }

  public init(appVersion: string): void {
    if (this.initialized) return;
    this.initialized = true;
    this.appVersion = appVersion;

    this.setupGlobalHandlers();
    this.log('info', 'system', `Inkova v${appVersion} initialized`, {
      dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown'
    });
  }

  private loadState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedOptIn = localStorage.getItem(STORAGE_TELEMETRY_OPTIN_KEY);
        if (savedOptIn !== null) {
          this.optIn = savedOptIn === 'true';
        }

        const savedLogs = localStorage.getItem(STORAGE_LOGS_KEY);
        if (savedLogs) {
          const parsed = JSON.parse(savedLogs);
          if (Array.isArray(parsed)) {
            this.logs = parsed.slice(-MAX_LOG_ENTRIES);
          }
        }
      }
    } catch (e) {
      console.warn('DiagnosticsManager: Failed to read from localStorage:', e);
    }
  }

  private persistLogs(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(this.logs));
      }
    } catch (e) {
      console.warn('DiagnosticsManager: Failed to save logs to localStorage:', e);
    }
  }

  public setTelemetryOptIn(optIn: boolean): void {
    this.optIn = optIn;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_TELEMETRY_OPTIN_KEY, String(optIn));
      }
    } catch {}
    this.log('info', 'system', `Telemetry opt-in set to ${optIn}`);
  }

  public isTelemetryOptedIn(): boolean {
    return this.optIn;
  }

  public log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>
  ): void {
    const entry: TelemetryLogEntry = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.shift();
    }
    this.persistLogs();

    // Mirror to dev console for local debugging
    if (level === 'error') {
      console.error(`[Inkova:${category}]`, message, details || '');
    } else if (level === 'warn') {
      console.warn(`[Inkova:${category}]`, message, details || '');
    }
  }

  public trackEvent(name: string, metadata?: Record<string, any>): void {
    if (!this.optIn) return;
    this.log('info', 'ui', `Event: ${name}`, metadata);
  }

  public trackError(category: LogCategory, error: Error | string, extra?: Record<string, any>): void {
    const errorDetails: Record<string, any> = {
      ...extra,
      name: typeof error === 'object' ? error.name : 'Error',
      message: typeof error === 'object' ? error.message : String(error),
      stack: typeof error === 'object' ? error.stack : undefined
    };
    this.log('error', category, errorDetails.message, errorDetails);
  }

  public getLogs(): TelemetryLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_LOGS_KEY);
      }
    } catch {}
    this.log('info', 'system', 'Diagnostics logs cleared by user');
  }

  public getSystemInfo(): SystemInfo {
    const isBrowser = typeof window !== 'undefined';
    let hardwareAcceleration = false;

    if (isBrowser) {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        hardwareAcceleration = !!gl;
      } catch {
        hardwareAcceleration = false;
      }
    }

    return {
      appVersion: this.appVersion,
      userAgent: isBrowser ? navigator.userAgent : 'Node.js',
      screenResolution: isBrowser && window.screen ? `${window.screen.width}x${window.screen.height}` : 'unknown',
      windowSize: isBrowser ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      devicePixelRatio: isBrowser ? (window.devicePixelRatio || 1) : 1,
      hardwareAcceleration,
      platform: isBrowser ? (navigator.platform || 'Unknown') : 'Unknown',
      language: isBrowser ? (navigator.language || 'en') : 'en',
      online: isBrowser ? navigator.onLine : true
    };
  }

  public exportDiagnostics(): string {
    const sys = this.getSystemInfo();
    const payload = {
      timestamp: new Date().toISOString(),
      system: sys,
      recentLogs: this.logs
    };
    return JSON.stringify(payload, null, 2);
  }

  public async copyDiagnosticsToClipboard(): Promise<boolean> {
    try {
      const dump = this.exportDiagnostics();
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(dump);
        return true;
      }
    } catch (e) {
      console.warn('Failed to copy diagnostics:', e);
    }
    return false;
  }

  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event: ErrorEvent) => {
      this.trackError('crash', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      this.trackError('crash', reason instanceof Error ? reason : String(reason), {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  public attachCanvasListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('contextlost', (e) => {
      e.preventDefault();
      this.log('error', 'canvas', 'Canvas 2D graphics context was lost (GPU reset or driver reload)');
    });

    canvas.addEventListener('contextrestored', () => {
      this.log('info', 'canvas', 'Canvas 2D graphics context restored successfully');
    });
  }
}
