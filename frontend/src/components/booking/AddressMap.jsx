import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiMapPin, FiNavigation } from "react-icons/fi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [15.8497, 74.4977]; // Belgaum

function DraggableMarker({ position, onDragEnd }) {
  useMapEvents({
    click(e) {
      onDragEnd(e.latlng.lat, e.latlng.lng);
    },
  });
  if (!position) return null;
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onDragEnd(lat, lng);
        },
      }}
    />
  );
}

export default function AddressMap({
  latitude,
  longitude,
  address,
  onAddressChange,
  onCoordsChange,
}) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);

  const position =
    latitude != null && longitude != null ? [Number(latitude), Number(longitude)] : null;

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onCoordsChange(lat, lng);
        await reverseGeocode(lat, lng);
      },
      () => setGpsDenied(true),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { Accept: "application/json" } },
      );
      const data = await res.json();
      if (data?.display_name) onAddressChange(data.display_name);
    } catch {
      /* manual address still allowed */
    }
  };

  const searchAddress = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`,
        { headers: { Accept: "application/json" } },
      );
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        onCoordsChange(lat, lng);
        onAddressChange(data[0].display_name);
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!position && !gpsDenied) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const center = position || DEFAULT_CENTER;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={detectLocation}>
          <FiNavigation aria-hidden />
          Detect current location
        </Button>
        {gpsDenied && (
          <p className="text-sm text-warning">GPS denied. Search for your address below.</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchAddress())}
        />
        <Button type="button" variant="secondary" disabled={searching} onClick={searchAddress}>
          Search
        </Button>
      </div>
      <div className="h-56 overflow-hidden rounded-lg border border-border sm:h-72">
        <MapContainer center={center} zoom={position ? 15 : 11} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker
            position={position}
            onDragEnd={(lat, lng) => {
              onCoordsChange(lat, lng);
              if (!address || address.trim() === "") {
                reverseGeocode(lat, lng);
              }
            }}
          />
        </MapContainer>
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1 text-sm font-medium">
          <FiMapPin aria-hidden />
          Formatted address
        </label>
        <textarea
          className="border-input bg-surface min-h-20 w-full rounded-md border px-3 py-2 text-base"
          value={address || ""}
          onChange={(e) => onAddressChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
}
