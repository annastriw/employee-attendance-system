import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@attendance/ui";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { openStreetMapUrl } from "../../lib/map-link";

interface AttendanceMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  label: string;
}

// Custom modern SVG marker matching Linear design tokens (emerald accent)
const createMarkerIcon = () => {
  return L.divIcon({
    className: "attendance-map-marker",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 24px;
          height: 24px;
          background: rgba(16, 185, 129, 0.3);
          border-radius: 50%;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          width: 14px;
          height: 14px;
          background: #10b981;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border-radius: 50%;
        "></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export function AttendanceMap({
  latitude,
  longitude,
  accuracyMeters,
  label,
}: AttendanceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let mapInstance: L.Map | null = null;
    let tileTimeout: ReturnType<typeof setTimeout> | undefined;
    setMapError(false);
    setTilesLoading(true);

    try {
      // In jsdom or SSR, L.map might not have client dimensions
      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent accidental scroll capture on page scroll
      });
      mapInstance = map;

      const tileLayer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        },
      );

      tileLayer.on("load", () => {
        setTilesLoading(false);
        if (tileTimeout) clearTimeout(tileTimeout);
      });
      tileLayer.on("tileerror", () => {
        setMapError(true);
        setTilesLoading(false);
        if (tileTimeout) clearTimeout(tileTimeout);
      });

      tileTimeout = setTimeout(() => {
        setMapError(true);
        setTilesLoading(false);
      }, 10000);
      tileLayer.addTo(map);

      // Add accuracy circle
      if (accuracyMeters > 0) {
        L.circle([latitude, longitude], {
          radius: accuracyMeters,
          color: "#10b981",
          weight: 1.5,
          fillColor: "#10b981",
          fillOpacity: 0.15,
        }).addTo(map);
      }

      // Add position marker
      L.marker([latitude, longitude], {
        icon: createMarkerIcon(),
      }).addTo(map);

      // Force layout invalidation once attached
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch {
      queueMicrotask(() => {
        setMapError(true);
        setTilesLoading(false);
      });
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      if (tileTimeout) clearTimeout(tileTimeout);
    };
  }, [latitude, longitude, accuracyMeters]);

  return (
    <div className="attendance-map-wrapper">
      <div
        ref={containerRef}
        className="attendance-map-container"
        data-testid="attendance-map"
        data-allow-zoom
        role="region"
        aria-label={`Peta ${label}: koordinat ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
      >
      </div>
      {tilesLoading && <div className="attendance-map-loading" role="status" aria-label="Memuat peta"><Skeleton className="attendance-map-skeleton" /></div>}
      {mapError && <div className="attendance-map-fallback" role="status">
        <p>Peta tidak dapat dimuat. Koordinat tetap tersedia.</p>
        <code>{latitude.toFixed(6)}, {longitude.toFixed(6)}</code>
        <a href={openStreetMapUrl(latitude, longitude)} target="_blank" rel="noopener noreferrer">Buka di OpenStreetMap</a>
      </div>}
    </div>
  );
}
