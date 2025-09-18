/**
 * خدمة الحصول على عنوان IP الحقيقي والموقع الجغرافي
 * تستخدم عدة خدمات مجانية للحصول على معلومات دقيقة
 */

export interface IPInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
  status?: string;
}

export interface LocationInfo {
  ip: string;
  location: string;
  country: string;
  city: string;
  region: string;
  timezone: string;
  isp: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export class IPLocationService {
  private static readonly TIMEOUT = 5000; // 5 ثوانٍ timeout
  
  /**
   * الحصول على عنوان IP الحقيقي للمستخدم
   */
  static async getRealIPAddress(): Promise<string> {
    console.log('🌐 بدء الحصول على عنوان IP الحقيقي...');
    
    // قائمة خدمات مجانية للحصول على IP
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip',
      'https://api.my-ip.io/ip.json',
      'https://ipinfo.io/json',
      'https://api.seeip.org/jsonip?',
      'https://geolocation-db.com/json/',
      'https://ip-api.com/json/'
    ];
    
    for (const service of ipServices) {
      try {
        console.log(`🔍 محاولة الحصول على IP من: ${service}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
        
        const response = await fetch(service, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          // استخراج IP من الاستجابة المختلفة لكل خدمة
          let ip = data.ip || data.query || data.IPv4 || data.origin;
          
          if (ip && this.isValidIP(ip)) {
            console.log(`✅ تم الحصول على IP: ${ip} من ${service}`);
            return ip;
          }
        }
      } catch (error) {
        console.log(`⚠️ فشل في الحصول على IP من ${service}:`, error);
        continue;
      }
    }
    
    // إذا فشلت جميع الخدمات، استخدم fallback
    console.log('⚠️ فشل في الحصول على IP الحقيقي، استخدام fallback');
    return this.getFallbackIP();
  }
  
  /**
   * الحصول على معلومات الموقع الجغرافي بناءً على IP
   */
  static async getLocationInfo(ip?: string): Promise<LocationInfo> {
    console.log('📍 بدء الحصول على معلومات الموقع الجغرافي...');
    
    // إذا لم يتم تمرير IP، احصل عليه أولاً
    if (!ip) {
      ip = await this.getRealIPAddress();
    }
    
    // قائمة خدمات الموقع الجغرافي المجانية
    const locationServices = [
      {
        url: `https://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        parser: (data: any) => this.parseIPAPI(data)
      },
      {
        url: `https://ipapi.co/${ip}/json/`,
        parser: (data: any) => this.parseIPAPICO(data)
      },
      {
        url: `https://geolocation-db.com/json/${ip}`,
        parser: (data: any) => this.parseGeolocationDB(data)
      },
      {
        url: `https://ipinfo.io/${ip}/json`,
        parser: (data: any) => this.parseIPInfo(data)
      }
    ];
    
    for (const service of locationServices) {
      try {
        console.log(`🔍 محاولة الحصول على الموقع من: ${service.url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
        
        const response = await fetch(service.url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const locationInfo = service.parser(data);
          
          if (locationInfo && locationInfo.country) {
            console.log(`✅ تم الحصول على معلومات الموقع:`, locationInfo);
            return locationInfo;
          }
        }
      } catch (error) {
        console.log(`⚠️ فشل في الحصول على الموقع من ${service.url}:`, error);
        continue;
      }
    }
    
    // إذا فشلت جميع الخدمات، إرجاع معلومات افتراضية
    console.log('⚠️ فشل في الحصول على معلومات الموقع، استخدام معلومات افتراضية');
    return this.getFallbackLocation(ip);
  }
  
  /**
   * الحصول على معلومات شاملة (IP + الموقع)
   */
  static async getCompleteInfo(): Promise<LocationInfo> {
    try {
      const ip = await this.getRealIPAddress();
      const locationInfo = await this.getLocationInfo(ip);
      return locationInfo;
    } catch (error) {
      console.error('❌ خطأ في الحصول على المعلومات الشاملة:', error);
      return this.getFallbackLocation('غير معروف');
    }
  }
  
  /**
   * تحليل استجابة IP-API
   */
  private static parseIPAPI(data: any): LocationInfo | null {
    if (data.status === 'fail') return null;
    
    return {
      ip: data.query || 'غير معروف',
      location: this.formatLocation(data.city, data.regionName, data.country),
      country: data.country || 'غير معروف',
      city: data.city || 'غير معروف',
      region: data.regionName || data.region || 'غير معروف',
      timezone: data.timezone || 'غير معروف',
      isp: data.isp || data.org || 'غير معروف',
      coordinates: data.lat && data.lon ? {
        lat: data.lat,
        lon: data.lon
      } : undefined
    };
  }
  
  /**
   * تحليل استجابة IPAPI.CO
   */
  private static parseIPAPICO(data: any): LocationInfo | null {
    if (data.error) return null;
    
    return {
      ip: data.ip || 'غير معروف',
      location: this.formatLocation(data.city, data.region, data.country_name),
      country: data.country_name || 'غير معروف',
      city: data.city || 'غير معروف',
      region: data.region || 'غير معروف',
      timezone: data.timezone || 'غير معروف',
      isp: data.org || 'غير معروف',
      coordinates: data.latitude && data.longitude ? {
        lat: data.latitude,
        lon: data.longitude
      } : undefined
    };
  }
  
  /**
   * تحليل استجابة GeolocationDB
   */
  private static parseGeolocationDB(data: any): LocationInfo | null {
    return {
      ip: data.IPv4 || 'غير معروف',
      location: this.formatLocation(data.city, data.state, data.country_name),
      country: data.country_name || 'غير معروف',
      city: data.city || 'غير معروف',
      region: data.state || 'غير معروف',
      timezone: 'غير معروف',
      isp: 'غير معروف'
    };
  }
  
  /**
   * تحليل استجابة IPInfo
   */
  private static parseIPInfo(data: any): LocationInfo | null {
    const [city, region] = (data.city || '').split(',');
    
    return {
      ip: data.ip || 'غير معروف',
      location: this.formatLocation(city?.trim(), region?.trim(), data.country),
      country: data.country || 'غير معروف',
      city: city?.trim() || 'غير معروف',
      region: region?.trim() || 'غير معروف',
      timezone: data.timezone || 'غير معروف',
      isp: data.org || 'غير معروف',
      coordinates: data.loc ? {
        lat: parseFloat(data.loc.split(',')[0]),
        lon: parseFloat(data.loc.split(',')[1])
      } : undefined
    };
  }
  
  /**
   * تنسيق الموقع بشكل مقروء
   */
  private static formatLocation(city?: string, region?: string, country?: string): string {
    const parts = [city, region, country].filter(part => part && part !== 'غير معروف');
    return parts.length > 0 ? parts.join(', ') : 'غير محدد';
  }
  
  /**
   * التحقق من صحة عنوان IP
   */
  private static isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
  
  /**
   * الحصول على IP احتياطي
   */
  private static getFallbackIP(): string {
    // محاولة الحصول على IP من window.location إذا كان متاحاً
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    }
    return '127.0.0.1';
  }
  
  /**
   * الحصول على معلومات موقع احتياطية
   */
  private static getFallbackLocation(ip: string): LocationInfo {
    return {
      ip: ip || 'غير معروف',
      location: 'غير محدد',
      country: 'غير معروف',
      city: 'غير معروف',
      region: 'غير معروف',
      timezone: 'غير معروف',
      isp: 'غير معروف'
    };
  }
}

export default IPLocationService;
export { IPInfo, LocationInfo };
