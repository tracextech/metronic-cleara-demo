import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, ZoomIn, ZoomOut, Maximize2, Search, MapPin, CheckCircle, XCircle, Eye, ChevronDown, Download, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationLocation {
  id: string;
  productionPlaceId: string;
  producerName?: string;
  area?: string;
  status: "valid" | "invalid";
  coordinates?: [number, number];
  errors?: string[];
}

interface GeoJSONValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geometryValid: boolean | null;
  satelliteValid: boolean | null;
  validationLocations?: ValidationLocation[];
}

const mockValidationLocations: ValidationLocation[] = [
  {
    id: "1",
    productionPlaceId: "PP-2430097491",
    producerName: "Silva Farms Ltd.",
    area: "15.2 hectares",
    status: "valid",
    coordinates: [7.4167, 51.2167]
  },
  {
    id: "2",
    productionPlaceId: "PP-2314566686",
    producerName: "Green Valley Co.",
    area: "8.7 hectares",
    status: "invalid",
    coordinates: [7.4200, 51.2200],
    errors: ["Polygon self-intersects", "Ring not closed properly"]
  },
  {
    id: "3",
    productionPlaceId: "PP-6454745",
    producerName: "Mountain Ridge Farms",
    area: "2.1 hectares",
    status: "invalid",
    coordinates: [7.4100, 51.2100],
    errors: ["Area below minimum threshold", "Missing coordinates"]
  },
  {
    id: "4",
    productionPlaceId: "PP-7585765",
    producerName: "Riverside Agriculture",
    area: "22.5 hectares",
    status: "invalid",
    coordinates: [7.4300, 51.2300],
    errors: ["Invalid geometry type", "Coordinate system mismatch"]
  },
  {
    id: "5",
    productionPlaceId: "PP-8901234",
    producerName: "Highland Estates",
    area: "45.3 hectares",
    status: "valid",
    coordinates: [7.4150, 51.2150]
  },
  {
    id: "6",
    productionPlaceId: "PP-5678901",
    producerName: "Coastal Palm Plantations",
    area: "12.8 hectares",
    status: "invalid",
    coordinates: [7.4250, 51.2250],
    errors: ["Overlapping boundaries", "Invalid coordinate reference system"]
  },
  {
    id: "7",
    productionPlaceId: "PP-3456789",
    producerName: "Forest Edge Agriculture",
    area: "33.7 hectares",
    status: "valid",
    coordinates: [7.4080, 51.2080]
  },
  {
    id: "8",
    productionPlaceId: "PP-9012345",
    producerName: "Valley View Farms",
    area: "7.2 hectares",
    status: "invalid",
    coordinates: [7.4320, 51.2320],
    errors: ["Geometry contains holes", "Invalid polygon orientation"]
  },
  {
    id: "9",
    productionPlaceId: "PP-6789012",
    producerName: "Sunrise Agricultural Co.",
    area: "28.9 hectares",
    status: "valid",
    coordinates: [7.4120, 51.2120]
  },
  {
    id: "10",
    productionPlaceId: "PP-4567890",
    producerName: "Tropical Grove Ventures",
    area: "19.6 hectares",
    status: "invalid",
    coordinates: [7.4180, 51.2180],
    errors: ["Duplicate vertices", "Self-intersecting boundaries"]
  },
  {
    id: "11",
    productionPlaceId: "PP-1234567",
    producerName: "Meadowland Holdings",
    area: "41.1 hectares",
    status: "valid",
    coordinates: [7.4070, 51.2070]
  },
  {
    id: "12",
    productionPlaceId: "PP-7890123",
    producerName: "Emerald Fields Ltd.",
    area: "16.4 hectares",
    status: "invalid",
    coordinates: [7.4270, 51.2270],
    errors: ["Insufficient vertex count", "Non-planar geometry"]
  }
];

export default function GeoJSONValidationModal({
  open,
  onOpenChange,
  geometryValid,
  satelliteValid,
  validationLocations = mockValidationLocations
}: GeoJSONValidationModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<string[]>([]);
  const [mapIframe, setMapIframe] = useState<HTMLIFrameElement | null>(null);

  const validLocations = validationLocations.filter(l => l.status === "valid");
  const invalidLocations = validationLocations.filter(l => l.status === "invalid");
  const allValid = invalidLocations.length === 0;

  // Calculate total area and number of locations
  const totalArea = validationLocations.reduce((sum, location) => {
    const area = parseFloat(location.area?.replace(' hectares', '') || '0');
    return sum + area;
  }, 0);
  
  const totalLocations = validationLocations.length;

  // Upload Integration Bridge - Send GeoJSON data to map iframe
  const sendGeoJSONToMap = (geoJsonData: any) => {
    if (mapIframe && mapIframe.contentWindow) {
      const message = {
        type: 'GEOJSON_UPLOAD',
        payload: geoJsonData
      };
      
      try {
        mapIframe.contentWindow.postMessage(message, '*');
        console.log('GeoJSON data sent to map via postMessage:', geoJsonData);
      } catch (error) {
        console.error('Error sending GeoJSON to map:', error);
      }
    }
  };

  // Enhanced file upload handler with immediate map visualization
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const geoJsonData = JSON.parse(fileText);
      
      // Validate basic GeoJSON structure
      if (geoJsonData.type === 'FeatureCollection' && geoJsonData.features) {
        // Add validation metadata to features
        const enhancedGeoJSON = {
          ...geoJsonData,
          features: geoJsonData.features.map((feature: any, index: number) => ({
            ...feature,
            properties: {
              ...feature.properties,
              validationStatus: 'processing',
              productionPlaceId: feature.properties?.productionPlaceId || `Uploaded-${Date.now()}-${index}`,
              uploadedAt: new Date().toISOString()
            }
          }))
        };
        
        // Send to map for immediate visualization
        sendGeoJSONToMap(enhancedGeoJSON);
        
        // Also send to backend for persistence
        try {
          const response = await fetch('/api/map-geojson', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(enhancedGeoJSON)
          });
          
          if (response.ok) {
            console.log('GeoJSON data successfully stored via proxy');
          }
        } catch (error) {
          console.error('Error storing GeoJSON via proxy:', error);
        }
      } else {
        console.error('Invalid GeoJSON format');
      }
    } catch (error) {
      console.error('Error processing uploaded file:', error);
    }
  };

  const toggleErrorExpansion = (locationId: string) => {
    setExpandedErrors(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const highlightLocationOnMap = (locationId: string) => {
    setSelectedLocation(locationId);
    
    // Find the selected location data
    const location = validationLocations.find(l => l.id === locationId);
    if (!location || !mapIframe || !mapIframe.contentWindow) return;
    
    // Send validation-specific styling message to map
    const message = {
      type: 'HIGHLIGHT_FEATURE',
      payload: {
        featureId: location.productionPlaceId,
        status: location.status,
        zoomToFeature: true,
        styling: {
          valid: {
            fillColor: '#22c55e',
            fillOpacity: 0.3,
            color: '#16a34a',
            weight: 2,
            dashArray: null
          },
          invalid: {
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            color: '#f97316',
            weight: 2,
            dashArray: '10, 5'
          }
        },
        showForestAreas: true,
        showValidationErrors: location.status === 'invalid',
        errors: location.errors || []
      }
    };
    
    try {
      mapIframe.contentWindow.postMessage(message, '*');
      console.log('Feature highlight sent to map:', message);
    } catch (error) {
      console.error('Error highlighting feature on map:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">GeoJSON Validator – Geometry Check View</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left Panel - List of Locations (30% width) */}
          <div className="w-[30%] border-r bg-white flex flex-col min-h-0">
            {/* Header with Summary Statistics */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Locations (GeoJSON Features)</h3>
              </div>
              
              {/* File Upload Section */}
              <div className="mb-4">
                <label className="block">
                  <input
                    type="file"
                    accept=".geojson,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="geojson-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('geojson-upload')?.click()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Upload GeoJSON File
                  </Button>
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-sm text-blue-600 font-medium">Total Area</div>
                  <div className="text-lg font-bold text-blue-900">{totalArea.toFixed(1)} hectares</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm text-green-600 font-medium">No of Locations</div>
                  <div className="text-lg font-bold text-green-900">{totalLocations}</div>
                </div>
              </div>
            </div>

            {/* Location List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 space-y-3">
                {validationLocations.map((location) => (
                  <Card 
                    key={location.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md border",
                      selectedLocation === location.id && "ring-2 ring-blue-500",
                      location.status === "valid" ? "border-green-200" : "border-red-200"
                    )}
                    onClick={() => highlightLocationOnMap(location.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {location.status === "valid" ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-gray-900 truncate">
                              {location.productionPlaceId}
                            </div>
                            {location.producerName && (
                              <div className="text-xs text-gray-600 truncate">
                                {location.producerName}
                              </div>
                            )}
                            {location.area && (
                              <div className="text-xs text-gray-500">
                                {location.area}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={cn(
                            "text-xs",
                            location.status === "valid" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          )}>
                            {location.status === "valid" ? "Valid" : "Invalid"}
                          </Badge>
                        </div>
                      </div>

                      {/* Error Accordion for Invalid Locations */}
                      {location.status === "invalid" && location.errors && (
                        <Collapsible
                          open={expandedErrors.includes(location.id)}
                          onOpenChange={() => toggleErrorExpansion(location.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-between p-2 h-auto text-red-600 hover:bg-red-50"
                            >
                              <span className="text-xs font-medium">Reasons</span>
                              <ChevronDown className={cn(
                                "h-3 w-3 transition-transform",
                                expandedErrors.includes(location.id) && "rotate-180"
                              )} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="bg-red-50 rounded p-2 space-y-1">
                              {location.errors.map((error, index) => (
                                <div key={index} className="text-xs text-red-700 flex items-start gap-1">
                                  <span className="text-red-400 mt-0.5">•</span>
                                  {error}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Interactive Map (70% width) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Map Area */}
            <div className="flex-1 relative bg-gray-100 min-h-0 overflow-hidden">
              {/* Map Integration via Proxy */}
              <iframe 
                ref={setMapIframe}
                src="/api/map-proxy"
                className="w-full h-full border-0"
                title="Interactive GeoJSON Map"
                style={{ minHeight: '100%' }}
                allow="geolocation"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>

            {/* Validation Errors Summary Panel (Bottom of Map) - Only show for invalid locations */}
            {selectedLocation && (() => {
              const location = validationLocations.find(l => l.id === selectedLocation);
              return location?.status === "invalid" && location?.errors && (
                <div className="border-t bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-2">Geometry Validation Issues</h4>
                      <ul className="space-y-1">
                        {location.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-1">
                            <span className="text-red-400 mt-1">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons (Bottom Right) */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {/* View Deforestation button - only show when an invalid location is selected */}
          {selectedLocation && (() => {
            const selectedLocationData = validationLocations.find(l => l.id === selectedLocation);
            return selectedLocationData?.status === "invalid" && (
              <Button 
                variant="destructive"
                onClick={() => window.open('https://trace-x-technologies.orbify.app/d/report/d28008f2-7824-4010-93a2-d5f18c022a58', '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Deforestation
              </Button>
            );
          })()}
          
          {allValid ? (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onOpenChange(false)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}