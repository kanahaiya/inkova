import { INKOVA_LICENSING_CONFIG } from './config';

export interface LicenseData {
  isPro: boolean;
  licenseKey: string | null;
  instanceId: string | null;
  userEmail: string | null;
  userName: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

const STORAGE_KEY = 'inkova_license_data';
const INSTANCE_NAME_KEY = 'inkova_device_instance_id';

export class LicenseManager {
  private static instance: LicenseManager | null = null;
  private state: LicenseData = {
    isPro: false,
    licenseKey: null,
    instanceId: null,
    userEmail: null,
    userName: null,
    activatedAt: null,
    expiresAt: null
  };

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.state = {
              ...this.state,
              ...parsed
            };
          }
        }
      }
    } catch (e) {
      console.warn('LicenseManager: Failed to read from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.warn('LicenseManager: Failed to save to localStorage:', e);
    }
  }

  public getState(): LicenseData {
    return { ...this.state };
  }

  public isPro(): boolean {
    return this.state.isPro;
  }

  public isToolLocked(toolId: string): boolean {
    if (this.state.isPro) return false;
    return INKOVA_LICENSING_CONFIG.proTools.includes(toolId);
  }

  public getProTools(): string[] {
    return [...INKOVA_LICENSING_CONFIG.proTools];
  }

  public getDeviceInstanceName(): string {
    if (typeof localStorage === 'undefined') return 'Windows PC';
    let id = localStorage.getItem(INSTANCE_NAME_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      id = `Inkova-PC-${rand}`;
      localStorage.setItem(INSTANCE_NAME_KEY, id);
    }
    return id;
  }

  public async activate(rawKey: string): Promise<{ success: boolean; message: string }> {
    const key = rawKey.trim();
    if (!key) {
      return { success: false, message: 'Please enter a valid license key.' };
    }

    // Demo/Offline test bypass for instant local testing & review
    if (key.toUpperCase() === 'INKOVA-PRO-DEMO' || key.toUpperCase() === 'DEMO-PRO-TEST-KEY') {
      this.state = {
        isPro: true,
        licenseKey: key.toUpperCase(),
        instanceId: 'demo-instance-id',
        userEmail: 'demo@inkova.app',
        userName: 'Demo Presenter',
        activatedAt: new Date().toISOString(),
        expiresAt: null
      };
      this.saveToStorage();
      return { success: true, message: 'Demo Pro License activated successfully!' };
    }

    try {
      const instanceName = this.getDeviceInstanceName();
      const body = new URLSearchParams();
      body.append('license_key', key);
      body.append('instance_name', instanceName);

      const res = await fetch(`${INKOVA_LICENSING_CONFIG.apiBaseUrl}/activate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const errorMsg = data.error || data.message || 'License activation failed. Please check your key.';
        return { success: false, message: errorMsg };
      }

      if (data.activated) {
        this.state = {
          isPro: true,
          licenseKey: key,
          instanceId: data.instance?.id || null,
          userEmail: data.meta?.customer_email || data.meta?.user_email || null,
          userName: data.meta?.customer_name || data.meta?.user_name || null,
          activatedAt: new Date().toISOString(),
          expiresAt: data.license_key?.expires_at || null
        };
        this.saveToStorage();
        return { success: true, message: 'Inkova Pro activated successfully! Welcome aboard.' };
      } else {
        return { success: false, message: data.message || 'License key could not be activated.' };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message || 'Unable to contact license server. Check your internet connection.'}`
      };
    }
  }

  public async deactivate(): Promise<{ success: boolean; message: string }> {
    if (!this.state.licenseKey) {
      return { success: false, message: 'No active license to deactivate.' };
    }

    // If demo key, just clear local state
    if (this.state.licenseKey.startsWith('DEMO-') || this.state.licenseKey.startsWith('INKOVA-PRO-DEMO')) {
      this.reset();
      return { success: true, message: 'License deactivated on this device.' };
    }

    try {
      if (this.state.instanceId) {
        const body = new URLSearchParams();
        body.append('license_key', this.state.licenseKey);
        body.append('instance_id', this.state.instanceId);

        await fetch(`${INKOVA_LICENSING_CONFIG.apiBaseUrl}/deactivate`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });
      }
    } catch (e) {
      console.warn('Deactivate remote call error (proceeding with local cleanup):', e);
    }

    this.reset();
    return { success: true, message: 'License deactivated on this device.' };
  }

  public reset(): void {
    this.state = {
      isPro: false,
      licenseKey: null,
      instanceId: null,
      userEmail: null,
      userName: null,
      activatedAt: null,
      expiresAt: null
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
}
