import * as _ from 'lodash';
import { Component, OnInit } from '@angular/core';
import { GeoService } from './shared';
declare const mapboxgl;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    map: mapboxgl.Map;
    beaconMaxProximity: number = 100;
    beaconResetSeconds: number = 3600;
    currentLng: number;
    currentLat: number;
    points: number = 0;
    pointsWeek: number = 0;
    pointsTotal: number = 0;
    visibleBeacons: GeoJSON.Feature<GeoJSON.Point>[];
    hiddenBeacons: GeoJSON.Feature<GeoJSON.Point>[];
    beaconsCaptured = [];
    message: string;

    // debug
    timeSinceUpdate: number;
    lastPositionUpdate: number = Date.now();

    constructor(private geoService: GeoService) {}

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
            this.addBeaconSource();
            this.addLocationSource();
            this.addBeaconLayers();
            this.addClusterLayers();
            this.addLocationLayer();
        });

        this.map.on('click', this.onMapClick);
        this.map.on('mousemove', this.onMouseOver);

        this.configureDebug();
    }

    addBeaconSource = () => {
        this.map.addSource('visibleBeacons', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
            data: {
                type: 'FeatureCollection',
                features: this.mapVisibleBeacons()
            }
        });

        this.map.addSource('hiddenBeacons', {
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
        this.visibleBeacons = troyVisibleBeacons.concat(jugVisibleBeacons, polarisShortVisibleBeacons, polarisLongVisibleBeacons)
            .map(this.createVisibleBeacon);
        return this.visibleBeacons;
    }

    createVisibleBeacon = (coords): GeoJSON.Feature<GeoJSON.Point> => {
        return {
            id: `${coords[0]}|${coords[1]}`,
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
        this.hiddenBeacons = troyHiddenBeacons.concat(jugHiddenBeacons, polarisShortHiddenBeacons, polarisLongHiddenBeacons)
            .map(this.createHiddenBeacon);
        return this.hiddenBeacons;
    }

    createHiddenBeacon = (coords): GeoJSON.Feature<GeoJSON.Point> => {
        return {
            id: `${coords[0]}|${coords[1]}`,
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
        var mapCenter = this.map.getCenter();
        var data: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [mapCenter.lng, mapCenter.lat]
            },
            properties: {}
        };

        this.map.addSource('location', {
            type: 'geojson',
            data
        });
    }

    addBeaconLayers = () => {
        this.map.addLayer({
            id: 'visibleBeacons',
            source: 'visibleBeacons',
            type: 'circle',
            paint: {
                'circle-radius': 10,
                'circle-color': '#ee1c24'
            }
        });

        this.map.addLayer({
            id: 'hiddenBeacons',
            source: 'hiddenBeacons',
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
            source: 'visibleBeacons',
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
                source: 'visibleBeacons',
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
            source: 'visibleBeacons',
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
    }

    updateLocation = (position) => {
        let lng = this.currentLng = position.coords.longitude;
        let lat = this.currentLat = position.coords.latitude;
        this.map.flyTo({ center: [lng, lat] });
        this.updateLocationMarker(lng, lat);
        this.checkNearbyBeacons(lng, lat);

        // debug
        this.lastPositionUpdate = Date.now();
    }

    updateLocationMarker = (lng, lat) => {
        let locationSource: mapboxgl.GeoJSONSource = (this.map.getSource('location') as mapboxgl.GeoJSONSource);
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

    checkNearbyBeacons = (lng, lat) => {
        if (!this.visibleBeacons) { return; }
        var nearestBeacon = null;
        // TODO: optimize this by narrowing beacons list down to likely candidates before calculating distance
        // or better yet, hard-code min lng and lat diffirences to filter by
        this.visibleBeacons.forEach((beacon, index) => {
            let dist = this.geoService.pointsToRadians(beacon.geometry.coordinates[0], beacon.geometry.coordinates[1], lng, lat);
            dist = this.geoService.radiansToMeters(dist);
            if (nearestBeacon === null || dist < nearestBeacon.dist) {
                nearestBeacon = { beacon, dist };
            }
        });
        if (nearestBeacon && nearestBeacon.dist <= this.beaconMaxProximity) {
            let oldBeacon = _.find(this.beaconsCaptured, { 'beacon.id': nearestBeacon.id });
            if (!oldBeacon) {
                this.pointsTotal++;
                this.beaconsCaptured.push({
                    beacon: nearestBeacon,
                    time: Date.now()
                });
            } else if (oldBeacon.time < Date.now() - this.beaconResetSeconds * 1000) {
                this.pointsTotal++;
                oldBeacon.time = Date.now();
            } else {
                this.message = 'You already captured this beacon';
            }
        }
    }

    onMapClick = (e) => {
        // Use queryRenderedFeatures to get features at a click event's point
        // Use layer option to avoid getting results from other layers
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['visibleBeacons'] });
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
        if (!this.map.loaded()) { return; }
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['visibleBeacons'] });
        this.map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    }
}
