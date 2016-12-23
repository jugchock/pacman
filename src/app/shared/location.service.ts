import { Injectable } from '@angular/core';

@Injectable()
export class LocationService {
    addLocationSource(map) {
        var mapCenter = map.getCenter();
        var data: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [mapCenter.lng, mapCenter.lat]
            },
            properties: {}
        };

        map.addSource('location', {
            type: 'geojson',
            data
        });
    }

    addLocationLayer(map) {
        map.addLayer({
            id: 'location',
            type: 'circle',
            source: 'location',
            paint: {
                'circle-radius': 10,
                'circle-color': '#ff9900'
            }
        });
    }

    updateLocationMarker(map, lng, lat) {
        let locationSource: mapboxgl.GeoJSONSource = (map.getSource('location') as mapboxgl.GeoJSONSource);
        if (locationSource) {
            locationSource.setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                properties: {}
            });
        }
    }
}
