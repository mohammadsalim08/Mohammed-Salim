import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, Crosshair, Compass, Search, Loader2, AlertCircle } from 'lucide-react';
import { VIZAG_AREA_COORDINATES } from '../data/translations';

const HAS_MAPS_KEY = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

interface LocationPickerMapProps {
  area: string;
  address: string;
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onAddressSelect?: (formattedAddress: string) => void;
}

// Smoothly pans the map when coordinates change externally (area dropdown, GPS, or Place search)
const MapCameraController: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  return null;
};

// Places API (New) Autocomplete Search Bar inside APIProvider
const PlacesSearchBox: React.FC<{
  onPlacePicked: (lat: number, lng: number, formattedAddress?: string) => void;
}> = ({ onPlacePicked }) => {
  const placesLib = useMapsLibrary('places');
  const map = useMap();
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [queryText, setQueryText] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!placesLib || !queryText.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setIsSearching(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: queryText.trim(),
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
          locationBias: {
            center: { lat: 17.7225, lng: 83.315 },
            radius: 40000,
          },
        });
        setSuggestions(res.suggestions || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.toLowerCase().includes('quota')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [placesLib, queryText]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        const loc = place.location;
        if (loc) {
          const lat = Math.round(loc.lat() * 100000) / 100000;
          const lng = Math.round(loc.lng() * 100000) / 100000;
          if (place.viewport && map) {
            map.fitBounds(place.viewport);
          } else if (map) {
            map.panTo({ lat, lng });
            map.setZoom(16);
          }
          onPlacePicked(lat, lng, place.formattedAddress || place.displayName || undefined);
        }
        setQueryText(place.formattedAddress || suggestion.placePrediction.text.text || '');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.toLowerCase().includes('quota')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      } finally {
        sessionTokenRef.current = null;
        setSuggestions([]);
      }
    },
    [placesLib, map, onPlacePicked]
  );

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Search street, junction, or landmark in Visakhapatnam..."
          className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        {isSearching && (
          <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((suggestion, idx) => {
            const label = suggestion.placePrediction?.text.text;
            if (!label) return null;
            return (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  area,
  address,
  latitude,
  longitude,
  onLocationChange,
  onAddressSelect,
}) => {
  const defaultCoord = VIZAG_AREA_COORDINATES[area] || { lat: 17.7225, lng: 83.315 };
  const [currentLat, setCurrentLat] = useState<number>(latitude || defaultCoord.lat);
  const [currentLng, setCurrentLng] = useState<number>(longitude || defaultCoord.lng);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Sync external lat/lng props (for example when editing an existing listing or changing area)
  useEffect(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      setCurrentLat(latitude);
      setCurrentLng(longitude);
    }
  }, [latitude, longitude]);

  const commitCoords = useCallback(
    (lat: number, lng: number, statusText?: string) => {
      const roundedLat = Math.round(lat * 100000) / 100000;
      const roundedLng = Math.round(lng * 100000) / 100000;
      setCurrentLat(roundedLat);
      setCurrentLng(roundedLng);
      onLocationChange(roundedLat, roundedLng);
      setLocationStatus(
        statusText || `Pin set at ${roundedLat.toFixed(4)}° N, ${roundedLng.toFixed(4)}° E`
      );
    },
    [onLocationChange]
  );

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Accessing device GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        commitCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          `GPS Locked: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`
        );
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(`Could not get GPS (${err.message}). Click or drag pin on map.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-2.5 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Pin Exact Shop / Factory Location on Google Maps *</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Search your street, tap the map, or drag the red pin to set your exact navigation coordinates
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 shadow-2xs transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <Crosshair className={`w-3.5 h-3.5 text-teal-600 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
        </button>
      </div>

      {HAS_MAPS_KEY ? (
        <>
          <PlacesSearchBox
            onPlacePicked={(lat, lng, formattedAddr) => {
              commitCoords(
                lat,
                lng,
                formattedAddr
                  ? `Selected: ${formattedAddr.slice(0, 48)}`
                  : `Pin set at ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`
              );
              if (formattedAddr && onAddressSelect && !address.trim()) {
                onAddressSelect(formattedAddr);
              }
            }}
          />

          <div className="w-full h-60 sm:h-72 rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-200">
            <GoogleMap
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={{ lat: currentLat, lng: currentLng }}
              defaultZoom={14}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={false}
              onClick={(e) => {
                const latLng = e.detail.latLng;
                if (latLng) {
                  commitCoords(latLng.lat, latLng.lng);
                }
              }}
            >
              <MapCameraController lat={currentLat} lng={currentLng} />
              <AdvancedMarker
                position={{ lat: currentLat, lng: currentLng }}
                draggable
                title="Drag to adjust exact shop location"
                onDragEnd={(e) => {
                  if (e.latLng) {
                    commitCoords(e.latLng.lat(), e.latLng.lng());
                  }
                }}
              >
                <Pin background="#dc2626" borderColor="#991b1b" glyphColor="#ffffff" />
              </AdvancedMarker>
            </GoogleMap>
          </div>
        </>
      ) : (
        <div className="w-full rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Google Maps API key not configured.</strong> Using area coordinates for{' '}
            <strong>{area}</strong> or your GPS button above.
          </div>
        </div>
      )}

      {/* Coordinate Display & Confirmation */}
      <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200">
          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Coordinates:</span>
          <strong className="text-blue-950">
            {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
          </strong>
        </div>

        {locationStatus && (
          <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
            {locationStatus}
          </span>
        )}
      </div>
    </div>
  );
};
