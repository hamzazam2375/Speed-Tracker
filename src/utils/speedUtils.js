// speedUtils.js
// Utility functions for speed calculations and conversions

/**
 * Convert speed from meters/second to kilometers/hour
 * @param {number} mps - Speed in meters per second
 * @returns {number} Speed in km/h
 */
export function mpsToKmh(mps) {
  return mps * 3.6;
}

/**
 * Convert speed from kilometers/hour to miles/hour
 * @param {number} kmh - Speed in km/h
 * @returns {number} Speed in mph
 */
export function kmhToMph(kmh) {
  return kmh * 0.621371;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
