import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, MapPin, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const originIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DeliveryLocation {
  lat: number;
  lng: number;
  timestamp?: string;
}

interface DeliveryMapProps {
  orderId: string;
  origin?: DeliveryLocation;
  destination?: DeliveryLocation;
  currentLocation?: DeliveryLocation;
  deliveryStatus?: string;
  estimatedTime?: string;
  trackingNumber?: string;
}

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const DeliveryMap = ({
  orderId,
  origin = { lat: 6.1319, lng: 1.2228 }, // Lomé, Togo default
  destination = { lat: 6.1725, lng: 1.2314 },
  currentLocation,
  deliveryStatus = "in_transit",
  estimatedTime = "30 min",
  trackingNumber,
}: DeliveryMapProps) => {
  const [animatedPosition, setAnimatedPosition] = useState<[number, number]>(
    currentLocation ? [currentLocation.lat, currentLocation.lng] : [origin.lat, origin.lng]
  );

  // Simulate delivery movement for demo
  useEffect(() => {
    if (!currentLocation) {
      const interval = setInterval(() => {
        setAnimatedPosition((prev) => {
          const progress = Math.random() * 0.001;
          const newLat = prev[0] + (destination.lat - prev[0]) * progress;
          const newLng = prev[1] + (destination.lng - prev[1]) * progress;
          return [newLat, newLng];
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentLocation, destination]);

  const routePositions: [number, number][] = [
    [origin.lat, origin.lng],
    animatedPosition,
    [destination.lat, destination.lng],
  ];

  const getStatusColor = () => {
    switch (deliveryStatus) {
      case "pending":
        return "bg-yellow-500";
      case "preparing":
        return "bg-blue-500";
      case "in_transit":
        return "bg-primary";
      case "delivered":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = () => {
    switch (deliveryStatus) {
      case "pending":
        return "En attente";
      case "preparing":
        return "Préparation";
      case "in_transit":
        return "En route";
      case "delivered":
        return "Livré";
      default:
        return "Inconnu";
    }
  };

  const steps = [
    { status: "pending", label: "Commande confirmée", icon: Package },
    { status: "preparing", label: "Préparation", icon: Package },
    { status: "in_transit", label: "En livraison", icon: Truck },
    { status: "delivered", label: "Livré", icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.status === deliveryStatus);

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="bg-gradient-hero text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Suivi de livraison</CardTitle>
              {trackingNumber && (
                <p className="text-sm opacity-80">N° {trackingNumber}</p>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor()} text-white`}>
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Map */}
        <div className="h-64 md:h-80 relative">
          <MapContainer
            center={animatedPosition}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={animatedPosition} />
            
            {/* Origin Marker */}
            <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
              <Popup>
                <div className="text-center">
                  <Package className="w-6 h-6 mx-auto mb-1 text-secondary" />
                  <strong>Point de départ</strong>
                </div>
              </Popup>
            </Marker>

            {/* Current Location / Delivery */}
            <Marker position={animatedPosition} icon={deliveryIcon}>
              <Popup>
                <div className="text-center">
                  <Truck className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <strong>Livreur en route</strong>
                  <p className="text-sm text-muted-foreground">Arrivée estimée: {estimatedTime}</p>
                </div>
              </Popup>
            </Marker>

            {/* Destination Marker */}
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
              <Popup>
                <div className="text-center">
                  <MapPin className="w-6 h-6 mx-auto mb-1 text-accent" />
                  <strong>Destination</strong>
                </div>
              </Popup>
            </Marker>

            {/* Route Line */}
            <Polyline
              positions={routePositions}
              color="hsl(var(--primary))"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          </MapContainer>

          {/* ETA Overlay */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-lg z-[1000]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">Arrivée estimée:</span>
              <span className="text-primary font-bold">{estimatedTime}</span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.status} className="flex flex-col items-center flex-1">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ 
                      scale: index <= currentStepIndex ? 1 : 0.8,
                      backgroundColor: index <= currentStepIndex 
                        ? "hsl(var(--primary))" 
                        : "hsl(var(--muted))"
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index <= currentStepIndex ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div 
                      className={`absolute top-5 left-10 w-full h-0.5 ${
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ width: "calc(100% - 2.5rem)" }}
                    />
                  )}
                </div>
                <span className={`text-xs mt-2 text-center ${
                  index <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryMap;
