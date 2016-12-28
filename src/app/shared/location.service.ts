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

        var framesPerSecond = 15;
        var initialOpacity = 1;
        var opacity = initialOpacity;
        var initialRadius = 8;
        var radius = initialRadius;
        var maxRadius = 18;

        map.addLayer({
            id: 'location',
            "source": "location",
            "type": "circle",
            "paint": {
                "circle-radius": initialRadius,
                "circle-radius-transition": {duration: 0},
                "circle-opacity-transition": {duration: 0},
                "circle-color": "#0D287F"
            }
        });

        map.addLayer({
            id: 'location1',
            "source": "location",
            "type": "circle",
            "paint": {
                "circle-radius": initialRadius,
                "circle-radius-transition": {duration: 0},
                "circle-opacity-transition": {duration: 0},
                "circle-color": "#0D287F"
            }
        });

        function animateMarker(timestamp) {

            setTimeout(function(){
                requestAnimationFrame(animateMarker);

                radius += (maxRadius - radius) / framesPerSecond;
                opacity -= ( .9 / framesPerSecond );

                map.setPaintProperty('location', 'circle-radius', radius);
                map.setPaintProperty('location', 'circle-opacity', opacity);

                if (opacity <= 0.1) {
                    radius = initialRadius;
                    opacity = initialOpacity;
                }

            }, 1000 / framesPerSecond);

        }

        // Start the animation.
        animateMarker(0);
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
