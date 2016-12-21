import { Component, OnInit } from '@angular/core';
declare const mapboxgl;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    map: mapboxgl.Map;
    lng: number;
    lat: number;
    points: number;
    // debug
    mapLng: number = 0;
    mapLat: number = 0;
    timeSinceUpdate: number;
    lastPositionUpdate: number = Date.now();

    ngOnInit() {
        mapboxgl.accessToken = 'pk.eyJ1IjoicG9sYXJpcy1yaWRlcngiLCJhIjoiWExuREx5ayJ9.qK0_9TwlruP7fRC1hASJAA';
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/outdoors-v9',
            center: [-93.7604785, 44.8958712],
            zoom: 9
        });

        this.map.addControl(new mapboxgl.NavigationControl());

        var watchID = navigator.geolocation.watchPosition(this.updateLocation, null, { enableHighAccuracy: true });

        this.map.on('style.load', () => {
            this.addMarkerSource();
            this.addLocationSource();
            this.addMarkerLayers();
            this.addClusterLayers();
            this.addLocationLayer();
        });

        this.map.on('click', this.onMapClick);
        this.map.on('mousemove', this.onMouseOver);

        this.configureDebug();
    }

    addMarkerSource = () => {
        this.map.addSource('markers', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
            data: {
                type: 'FeatureCollection',
                features: this.mapVisibleBeacons()
            }
        });

        this.map.addSource('hiddenMarkers', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
            data: {
                type: 'FeatureCollection',
                features: this.mapHiddenBeacons()
            }
        });
    }

    mapVisibleBeacons = (): GeoJSON.Feature<GeoJSON.Point>[] => {
        var troyVisibleBeacons = require('./troy-visible-beacons.json');
        var jugVisibleBeacons = require('./jug-visible-beacons.json');
        var polarisShortVisibleBeacons = require('./polaris-shortpath-visible-beacons.json');
        var polarisLongVisibleBeacons = require('./polaris-longpath-visible-beacons.json');
        var visibleBeacons = troyVisibleBeacons.concat(jugVisibleBeacons, polarisShortVisibleBeacons, polarisLongVisibleBeacons);
        return visibleBeacons.map(this.visibleBeacon);
    }

    visibleBeacon = (coords): GeoJSON.Feature<GeoJSON.Point> => {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coords
            },
            properties: {
                markerSymbol: 'default_marker',
                isVisible: true,
                value: 1
            }
        };
    }

    mapHiddenBeacons = (): GeoJSON.Feature<GeoJSON.Point>[] => {
        var troyHiddenBeacons = require('./troy-hidden-beacons.json');
        var jugHiddenBeacons = require('./jug-hidden-beacons.json');
        var polarisShortHiddenBeacons = require('./polaris-shortpath-hidden-beacons.json');
        var polarisLongHiddenBeacons = require('./polaris-longpath-hidden-beacons.json');
        var hiddenBeacons = troyHiddenBeacons.concat(jugHiddenBeacons, polarisShortHiddenBeacons, polarisLongHiddenBeacons);
        return hiddenBeacons.map(this.hiddenBeacon);
    }

    hiddenBeacon = (coords): GeoJSON.Feature<GeoJSON.Point> => {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coords
            },
            properties: {
                markerSymbol: 'default_marker',
                isVisible: false,
                value: 1
            }
        };
    }

    addLocationSource = () => {
        var data: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: []
            },
            properties: {}
        };

        this.map.addSource('location', {
            type: 'geojson',
            data
        });
    }

    addMarkerLayers = () => {
        this.map.addLayer({
            id: 'markers',
            source: 'markers',
            type: 'circle',
            paint: {
                'circle-radius': 10,
                'circle-color': '#ee1c24'
            }
        });

        this.map.addLayer({
            id: 'hiddenMarkers',
            source: 'hiddenMarkers',
            type: 'circle',
            paint: {
                'circle-radius': 10,
                'circle-color': '#241cee'
            }
        });
    }

    addClusterLayers = () => {
        this.map.addLayer({
            id: 'unclustered-points',
            type: 'symbol',
            source: 'markers',
            filter: ['!has', 'point_count'],
            layout: {
                'icon-image': 'marker-15'
            }
        });

        // Display the data in three layers, each filtered to a range of
        // count values. Each range gets a different fill color.
        var layers = [
            [150, '#f28cb1'],
            [20, '#f1f075'],
            [0, '#39c237']
        ];

        layers.forEach((layer, i) => {
            this.map.addLayer({
                id: 'cluster-' + i,
                type: 'circle',
                source: 'markers',
                paint: {
                    'circle-color': layer[1],
                    'circle-radius': 12
                },
                filter: i === 0 ?
                    ['>=', 'point_count', layer[0]] :
                    ['all',
                        ['>=', 'point_count', layer[0]],
                        ['<', 'point_count', layers[i - 1][0]]]
            });
        });

        // Add a layer for the clusters' count labels
        this.map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'markers',
            layout: {
                'text-field': '{point_count}',
                'text-font': [
                    'DIN Offc Pro Medium',
                    'Arial Unicode MS Bold'
                ],
                'text-size': 14
            }
        });
    }

    addLocationLayer = () => {
        this.map.addLayer({
            id: 'location',
            type: 'circle',
            source: 'location',
            paint: {
                'circle-radius': 10,
                'circle-color': '#ff9900'
            }
        });
    }

    configureDebug = () => {
        setInterval(() => {
            this.timeSinceUpdate = Math.round((Date.now() - this.lastPositionUpdate) * 0.001);
        }, 1000);

        // debugging
        this.map.on('moveend', () => {
            var center = this.map.getCenter();
            this.mapLng = center.lng;
            this.mapLat = center.lat;
        });
    }

    updateLocation = (position) => {
        let lng = position.coords.longitude;
        let lat = position.coords.latitude;
        this.lng = lng;
        this.lat = lat;
        this.map.flyTo({ center: [lng, lat] });
        let locationSource: mapboxgl.GeoJSONSource = (this.map.getSource('location') as mapboxgl.GeoJSONSource);
        locationSource.setData({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            properties: {}
        });

        // debug
        this.lastPositionUpdate = Date.now();
    }

    onMapClick = (e) => {
        // Use queryRenderedFeatures to get features at a click event's point
        // Use layer option to avoid getting results from other layers
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['markers'] });
        // if there are features within the given radius of the click event,
        // fly to the location of the click event
        if (features.length) {
            // Get coordinates from the symbol and center the map on those coordinates
            this.map.flyTo({center: features[0].geometry.coordinates});
        }

        var feature = features[0];

        // Populate the popup and set its coordinates
        // based on the feature found.
        var popup: mapboxgl.Popup = new mapboxgl.Popup()
            .setLngLat(feature.geometry.coordinates)
            .setHTML(feature.properties.title)
            .addTo(this.map);
    }

    onMouseOver = (e) => {
        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['markers'] });
        this.map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    }
}
