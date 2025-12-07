// Reverse geocoding to get area name from coordinates
export const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'INTORZA-App/1.0',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    // Build a readable address from components
    const address = data.address;
    const parts = [];
    
    if (address.road || address.street) {
      parts.push(address.road || address.street);
    }
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) {
      parts.push(address.state);
    }
    
    return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(', ') || 'Unknown location';
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Location unavailable';
  }
};

// Format location for display
export const formatLocationDisplay = (location: any): { coords: string; area?: string } | null => {
  if (!location) return null;
  
  if (typeof location === 'object' && location.lat && location.lng) {
    return {
      coords: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
      area: location.address || location.area || undefined,
    };
  }
  
  return null;
};
