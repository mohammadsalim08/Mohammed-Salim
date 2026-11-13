import React, { useState, useCallback } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Navigation,
  MapPin,
  Building2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BusinessListing, TourismDestination } from '../types';
import { VIZAG_TOURISM_DESTINATIONS } from '../data/tourismData';
import { VIZAG_AREAS, BUSINESS_SCALES } from '../data/mockData';
import { VIZAG_AREA_COORDINATES } from '../data/translations';
import { BusinessContactActions } from './BusinessContactActions';

const HAS_MAPS_KEY = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const MapBusinessPin: React.FC<{
  business: BusinessListing;
  isSelected: boolean;
  onSelect: (biz: BusinessListing, marker: google.maps.marker.AdvancedMarkerElement) => void;
}> = ({ business, isSelected, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const fallback = VIZAG_AREA_COORDINATES[business.area] || { lat: 17.7225, lng: 83.315 };
  const lat = typeof business.latitude === 'number' ? business.latitude : fallback.lat;
  const lng = typeof business.longitude === 'number' ? business.longitude : fallback.lng;

  const pinBg =
    business.scale === 'Large Manufacturing Factory'
      ? '#f59e0b'
      : business.scale === 'Medium Enterprise'
      ? '#2563eb'
      : '#0d9488';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat, lng }}
      title={business.name}
      zIndex={isSelected ? 1000 : 10}
      onClick={() => {
        if (marker) onSelect(business, marker);
      }}
    >
      <Pin background={isSelected ? '#0f172a' : pinBg} borderColor="#ffffff" glyphColor="#ffffff" />
    </AdvancedMarker>
  );
};

const MapTourismPin: React.FC<{
  destination: TourismDestination;
  isSelected: boolean;
  onSelect: (dest: TourismDestination, marker: google.maps.marker.AdvancedMarkerElement) => void;
}> = ({ destination, isSelected, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: destination.latitude, lng: destination.longitude }}
      title={destination.name}
      zIndex={isSelected ? 1000 : 5}
      onClick={() => {
        if (marker) onSelect(destination, marker);
      }}
    >
      <Pin
        background={isSelected ? '#0f172a' : '#e11d48'}
        borderColor="#ffffff"
        glyphColor="#ffffff"
      />
    </AdvancedMarker>
  );
};

const MapControlsHelper: React.FC<{
  selectedArea: string;
  onSelectArea: (area: string) => void;
  customerLocation: { lat: number; lng: number } | null;
}> = ({ onSelectArea, customerLocation }) => {
  const map = useMap();

  const jumpZones = [
    'Gajuwaka & Ukkunagaram',
    'Parawada (Pharma City)',
    'Autonagar Industrial Estate',
    'Fishing Harbour & Port Area',
    'Jagadamba Junction',
    'Siripuram & VIP Road',
    'Madhurawada & Rushikonda',
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
      {customerLocation && (
        <button
          type="button"
          onClick={() => {
            if (map) {
              map.panTo(customerLocation);
              map.setZoom(14);
            }
          }}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white whitespace-nowrap flex items-center gap-1"
        >
          <Navigation className="w-3 h-3" />
          <span>Center on Me</span>
        </button>
      )}
      {jumpZones.map((zone) => {
        const coords = VIZAG_AREA_COORDINATES[zone];
        return (
          <button
            key={zone}
            type="button"
            onClick={() => {
              if (map && coords) {
                map.panTo(coords);
                map.setZoom(14);
              }
              onSelectArea(zone);
            }}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 whitespace-nowrap"
          >
            {zone}
          </button>
        );
      })}
    </div>
  );
};

export const MapScreen: React.FC = () => {
  const {
    approvedBusinesses,
    selectedArea,
    setSelectedArea,
    selectedScale,
    setSelectedScale,
    openBusinessModal,
    customerLocation,
    requestCustomerLocation,
    isLocatingCustomer,
  } = useApp();

  const [layerMode, setLayerMode] = useState<'all' | 'businesses' | 'tourism'>('all');
  const [mapQuery, setMapQuery] = useState('');
  const [selectedBiz, setSelectedBiz] = useState<BusinessListing | null>(null);
  const [selectedDest, setSelectedDest] = useState<TourismDestination | null>(null);
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const filteredBusinesses = approvedBusinesses.filter((b) => {
    const matchesArea = selectedArea === 'All Areas in Vizag' || b.area === selectedArea;
    const matchesScale = selectedScale === 'All Scales' || b.scale === selectedScale;
    const matchesQ =
      !mapQuery.trim() ||
      b.name.toLowerCase().includes(mapQuery.toLowerCase()) ||
      b.categoryLabel.toLowerCase().includes(mapQuery.toLowerCase()) ||
      b.area.toLowerCase().includes(mapQuery.toLowerCase());
    return matchesArea && matchesScale && matchesQ;
  });

  const filteredTourism = VIZAG_TOURISM_DESTINATIONS.filter((d) => {
    if (!mapQuery.trim()) return true;
    const q = mapQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.area.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  });

  const handleSelectBiz = useCallback(
    (biz: BusinessListing, marker: google.maps.marker.AdvancedMarkerElement) => {
      setSelectedDest(null);
      setSelectedBiz(biz);
      setSelectedMarker(marker);
    },
    []
  );

  const handleSelectDest = useCallback(
    (dest: TourismDestination, marker: google.maps.marker.AdvancedMarkerElement) => {
      setSelectedBiz(null);
      setSelectedDest(dest);
      setSelectedMarker(marker);
    },
    []
  );

  return (
    <div className="pb-24 pt-2 max-w-6xl mx-auto px-4 space-y-3.5">
      {/* Header Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-700" />
              <span>Explore Visakhapatnam on Map</span>
            </h2>
            <p className="text-xs text-slate-500">
              Verified local businesses, industrial hubs &amp; 15 iconic Vizag tourist destinations
            </p>
          </div>

          <button
            type="button"
            onClick={requestCustomerLocation}
            disabled={isLocatingCustomer}
            className={`self-start sm:self-auto min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              customerLocation
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-blue-900 hover:bg-blue-800 text-white'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocatingCustomer ? 'animate-spin' : ''}`} />
            <span>
              {customerLocation ? 'My GPS Location Active' : isLocatingCustomer ? 'Detecting GPS...' : 'Detect My GPS'}
            </span>
          </button>
        </div>

        {/* Layer Switcher & Search */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setLayerMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layerMode === 'all' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Pins ({filteredBusinesses.length + filteredTourism.length})
            </button>
            <button
              type="button"
              onClick={() => setLayerMode('businesses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layerMode === 'businesses' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              Businesses ({filteredBusinesses.length})
            </button>
            <button
              type="button"
              onClick={() => setLayerMode('tourism')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layerMode === 'tourism' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              Tourism ({filteredTourism.length})
            </button>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Filter map markers by business, beach, museum, or Vizag area..."
              value={mapQuery}
              onChange={(e) => setMapQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Scale & Area Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
          >
            {VIZAG_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={selectedScale}
            onChange={(e) => setSelectedScale(e.target.value as typeof selectedScale)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
          >
            {BUSINESS_SCALES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600 pt-1">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Small / Artisan
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Medium Enterprise
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Large Factory
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Vizag Tourist Spot
          </span>
        </div>
      </div>

      {/* Live Google Map */}
      <div className="bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-sm">
        {HAS_MAPS_KEY ? (
          <div className="space-y-2">
            <div className="w-full h-[460px] sm:h-[540px] rounded-2xl overflow-hidden border border-slate-300 bg-slate-100">
              <GoogleMap
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={{ lat: 17.715, lng: 83.285 }}
                defaultZoom={12}
                gestureHandling="greedy"
                streetViewControl={false}
              >
                {customerLocation && (
                  <AdvancedMarker position={customerLocation} title="Your GPS Location">
                    <Pin background="#059669" borderColor="#ffffff" glyphColor="#ffffff" />
                  </AdvancedMarker>
                )}

                {(layerMode === 'all' || layerMode === 'businesses') &&
                  filteredBusinesses.map((biz) => (
                    <MapBusinessPin
                      key={biz.id}
                      business={biz}
                      isSelected={selectedBiz?.id === biz.id}
                      onSelect={handleSelectBiz}
                    />
                  ))}

                {(layerMode === 'all' || layerMode === 'tourism') &&
                  filteredTourism.map((dest) => (
                    <MapTourismPin
                      key={dest.id}
                      destination={dest}
                      isSelected={selectedDest?.id === dest.id}
                      onSelect={handleSelectDest}
                    />
                  ))}

                {selectedBiz && selectedMarker && (
                  <InfoWindow
                    anchor={selectedMarker}
                    pixelOffset={[0, -6]}
                    onCloseClick={() => {
                      setSelectedBiz(null);
                      setSelectedMarker(null);
                    }}
                  >
                    <div className="max-w-[260px] space-y-2 p-1 text-slate-900">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-teal-700">
                          {selectedBiz.scale}
                        </span>
                        <h4 className="font-extrabold text-sm leading-tight">{selectedBiz.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {selectedBiz.area} • {selectedBiz.address}
                        </p>
                      </div>
                      <BusinessContactActions business={selectedBiz} variant="card" showInquire={false} />
                      <button
                        type="button"
                        onClick={() => openBusinessModal(selectedBiz)}
                        className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs py-1.5 rounded-lg"
                      >
                        View Full Profile
                      </button>
                    </div>
                  </InfoWindow>
                )}

                {selectedDest && selectedMarker && (
                  <InfoWindow
                    anchor={selectedMarker}
                    pixelOffset={[0, -6]}
                    onCloseClick={() => {
                      setSelectedDest(null);
                      setSelectedMarker(null);
                    }}
                  >
                    <div className="max-w-[260px] space-y-2 p-1 text-slate-900">
                      <img
                        src={selectedDest.imageUrl}
                        alt={selectedDest.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase text-rose-600">
                          {selectedDest.category}
                        </span>
                        <h4 className="font-extrabold text-sm leading-tight">{selectedDest.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{selectedDest.area}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {selectedDest.timings}
                        </p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDest.latitude},${selectedDest.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs py-1.5 rounded-lg"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Google Maps Directions</span>
                      </a>
                    </div>
                  </InfoWindow>
                )}

                <MapControlsHelper
                  selectedArea={selectedArea}
                  onSelectArea={setSelectedArea}
                  customerLocation={customerLocation}
                />
              </GoogleMap>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) is required to display the interactive map.
            </span>
          </div>
        )}
      </div>

      {/* Empty business reminder */}
      {approvedBusinesses.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Showing Vizag’s 15 verified tourist destinations on the map. Approved local businesses also appear automatically with live contact markers once approved.
          </span>
        </div>
      )}
    </div>
  );
};
