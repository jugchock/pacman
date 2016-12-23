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
}
