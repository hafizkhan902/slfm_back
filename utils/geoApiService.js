/**
 * BD-GeoAPI Integration Service with In-Memory Caching and Resilient Error Handling
 * Source: https://bdgeoapi.rajumia.com/api/v1/
 */

const DEFAULT_BASE_URL = 'https://bdgeoapi.rajumia.com/api/v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours (Administrative boundaries rarely change)
const REQUEST_TIMEOUT_MS = 8000; // 8 seconds timeout

class GeoApiService {
  constructor() {
    this.cache = new Map();
  }

  getBaseUrl() {
    const raw = process.env.BD_GEO_API_URL || DEFAULT_BASE_URL;
    return raw.replace(/\/+$/, '');
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      // Keep stale data available in case upstream goes down, but mark expired
      return { data: cached.data, isStale: true };
    }
    return { data: cached.data, isStale: false };
  }

  setCache(key, data, ttl = CACHE_TTL_MS) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      updatedAt: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ShahLajuk-Furniture-Mart-GeoService/1.0',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`BD-GeoAPI responded with HTTP status ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`BD-GeoAPI request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
      }
      throw err;
    }
  }

  /**
   * Fetch all pages if an endpoint is paginated
   */
  async fetchAllPages(initialUrl) {
    let results = [];
    let currentUrl = initialUrl;
    let pageCount = 0;
    const maxPages = 20; // Safety guard against infinite loops

    while (currentUrl && pageCount < maxPages) {
      pageCount++;
      const res = await this.fetchWithTimeout(currentUrl);
      if (!res || !res.success) {
        throw new Error(res?.message || 'Failed to fetch data from BD-GeoAPI');
      }

      if (Array.isArray(res.data)) {
        results = results.concat(res.data);
      } else if (res.data) {
        return res.data;
      }

      // Check pagination next
      if (res.pagination && res.pagination.next) {
        currentUrl = res.pagination.next;
      } else {
        currentUrl = null;
      }
    }

    return results;
  }

  /**
   * Get all Divisions in Bangladesh
   */
  async getDivisions() {
    const cacheKey = 'divisions';
    const cached = this.getCache(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const url = `${this.getBaseUrl()}/divisions/`;
      const data = await this.fetchAllPages(url);
      const divisions = (Array.isArray(data) ? data : []).map(div => ({
        id: Number(div.id),
        name: String(div.name).trim(),
        nameBn: String(div.name_bn || div.nameBn || '').trim(),
        code: String(div.code || '').trim(),
        districtsCount: Number(div.districts_count || 0)
      }));

      this.setCache(cacheKey, divisions);
      return divisions;
    } catch (err) {
      if (cached && cached.data) {
        console.warn(`[GeoApiService] Upstream failed for divisions, using stale cache:`, err.message);
        return cached.data;
      }
      throw new Error(`Unable to fetch Bangladesh divisions: ${err.message}`);
    }
  }

  /**
   * Get all Districts for a specific Division
   */
  async getDistricts(divisionId) {
    const divId = Number(divisionId);
    if (!divId || isNaN(divId)) {
      throw new Error('Valid divisionId is required to fetch districts');
    }

    const cacheKey = `districts:${divId}`;
    const cached = this.getCache(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const url = `${this.getBaseUrl()}/districts/?division=${divId}`;
      const data = await this.fetchAllPages(url);
      const districts = (Array.isArray(data) ? data : []).map(dist => ({
        id: Number(dist.id),
        name: String(dist.name).trim(),
        nameBn: String(dist.name_bn || dist.nameBn || '').trim(),
        code: String(dist.code || '').trim(),
        divisionId: Number(dist.division?.id || divId),
        divisionName: String(dist.division?.name || '').trim(),
        upazilasCount: Number(dist.upazilas_count || 0)
      }));

      this.setCache(cacheKey, districts);
      return districts;
    } catch (err) {
      if (cached && cached.data) {
        console.warn(`[GeoApiService] Upstream failed for districts (division: ${divId}), using stale cache:`, err.message);
        return cached.data;
      }
      throw new Error(`Unable to fetch districts for division ${divId}: ${err.message}`);
    }
  }

  /**
   * Get all Upazilas for a specific District
   */
  async getUpazilas(districtId) {
    const distId = Number(districtId);
    if (!distId || isNaN(distId)) {
      throw new Error('Valid districtId is required to fetch upazilas');
    }

    const cacheKey = `upazilas:${distId}`;
    const cached = this.getCache(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const url = `${this.getBaseUrl()}/upazilas/?district=${distId}`;
      const data = await this.fetchAllPages(url);
      const upazilas = (Array.isArray(data) ? data : []).map(upz => ({
        id: Number(upz.id),
        name: String(upz.name).trim(),
        nameBn: String(upz.name_bn || upz.nameBn || '').trim(),
        code: String(upz.code || '').trim(),
        districtId: Number(upz.district?.id || distId),
        districtName: String(upz.district?.name || '').trim()
      }));

      this.setCache(cacheKey, upazilas);
      return upazilas;
    } catch (err) {
      if (cached && cached.data) {
        console.warn(`[GeoApiService] Upstream failed for upazilas (district: ${distId}), using stale cache:`, err.message);
        return cached.data;
      }
      throw new Error(`Unable to fetch upazilas for district ${distId}: ${err.message}`);
    }
  }

  /**
   * Global Search across BD divisions, districts, upazilas
   */
  async search(query) {
    const q = String(query || '').trim();
    if (!q) return [];

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = this.getCache(cacheKey);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    try {
      const url = `${this.getBaseUrl()}/search/?q=${encodeURIComponent(q)}`;
      const res = await this.fetchWithTimeout(url);
      const data = (res && Array.isArray(res.data)) ? res.data : [];

      this.setCache(cacheKey, data, 10 * 60 * 1000); // 10 min cache for search
      return data;
    } catch (err) {
      if (cached && cached.data) return cached.data;
      throw new Error(`BD-GeoAPI search failed: ${err.message}`);
    }
  }
}

export const geoApiService = new GeoApiService();
