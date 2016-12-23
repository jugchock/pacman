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
    beaconMaxProximity: number = 20;
    beaconResetSeconds: number = 600;
    currentLng: number;
    currentLat: number;
    points: number = 0;
    pointsWeek: number = 0;
    pointsTotal: number = 0;
    beacons: GeoJSON.Feature<GeoJSON.Point>[];
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
            center: this.getSavedMapCenter(),
            zoom: localStorage.getItem('mapZoom') || 9,
            pitch: 50
        });

        this.map.addControl(new mapboxgl.NavigationControl());

        var watchID = navigator.geolocation.watchPosition((position) => this.updateLocation(position), null, { enableHighAccuracy: true });

        this.map.on('style.load', () => {
            this.addBeaconSource();
            this.addLocationSource();
            this.addBeaconLayers();
            this.addClusterLayers();
            this.addLocationLayer();
        });
        this.map.on('click', (e) => this.onMapClick(e));
        this.map.on('mousemove', (e) => this.onMouseOver(e));
        this.map.on('moveend', (e) => this.onMapMoveEnd(e));

        this.configureDebug();
    }

    getSavedMapCenter() {
        var center;
        var centerEncoded = localStorage.getItem('mapCenter');
        if (centerEncoded) {
            center = _.attempt(JSON.parse, centerEncoded);
        }
        if (!center || _.isError(center)) {
            center = [-90, 45];
        }
        return center;
    }

    addBeaconSource() {
        this.map.addSource('beacons', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
            data: {
                type: 'FeatureCollection',
                features: this.getBeacons()
            }
        });
    }

    getBeacons(): GeoJSON.Feature<GeoJSON.Point>[] {
        var troyVisibleBeacons = require('./troy-visible-beacons.json');
        var jugVisibleBeacons = require('./jug-visible-beacons.json');
        var polarisShortVisibleBeacons = require('./polaris-shortpath-visible-beacons.json');
        var polarisLongVisibleBeacons = require('./polaris-longpath-visible-beacons.json');
        var visibleBeacons = troyVisibleBeacons.concat(jugVisibleBeacons, polarisShortVisibleBeacons, polarisLongVisibleBeacons)
            .map((coords) => this.createVisibleBeacon(coords));
        var troyHiddenBeacons = require('./troy-hidden-beacons.json');
        var jugHiddenBeacons = require('./jug-hidden-beacons.json');
        var polarisShortHiddenBeacons = require('./polaris-shortpath-hidden-beacons.json');
        var polarisLongHiddenBeacons = require('./polaris-longpath-hidden-beacons.json');
        var hiddenBeacons = troyHiddenBeacons.concat(jugHiddenBeacons, polarisShortHiddenBeacons, polarisLongHiddenBeacons)
            .map((coords) => this.createHiddenBeacon(coords));
        this.beacons = visibleBeacons.concat(hiddenBeacons);
        return this.beacons;
    }

    createVisibleBeacon(coords): GeoJSON.Feature<GeoJSON.Point> {
        var beaconReset = Math.max(
            0,
            Math.round(this.beaconResetSeconds - Math.random() * this.beaconResetSeconds * 2));
        return {
            // id: `${coords[0]}|${coords[1]}`,
            id: coords[0] + '|' + coords[1],
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coords
            },
            properties: {
                markerSymbol: 'default_marker',
                type: 'visible',
                captureTimestamp: Date.now() - (this.beaconResetSeconds - beaconReset) * 1000,
                beaconReset,
                value: 1
            }
        };
    }

    createHiddenBeacon(coords): GeoJSON.Feature<GeoJSON.Point> {
        var beaconReset = Math.max(
            0,
            Math.round(this.beaconResetSeconds - Math.random() * this.beaconResetSeconds * 2));
        return {
            // id: `${coords[0]}|${coords[1]}`,
            id: coords[0] + '|' + coords[1],
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coords
            },
            properties: {
                markerSymbol: 'default_marker',
                type: 'hidden',
                captureTimestamp: Date.now() - (this.beaconResetSeconds - beaconReset) * 1000,
                beaconReset,
                value: 1
            }
        };
    }

    addLocationSource() {
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

    addBeaconLayers() {
        this.map.addLayer({
            id: 'beacons',
            source: 'beacons',
            type: 'circle',
            paint: {
                'circle-radius': {
                    property: 'type',
                    type: 'categorical',
                    stops: [
                        ['visible', 10],
                        ['hidden', 5]
                    ]
                },
                'circle-color': {
                    property: 'beaconReset',
                    type: 'exponential',
                    colorSpace: 'hcl',
                    stops: [
                        [0, '#ee1c24'],
                        [1, '#990008'],
                        [3600, '#969696']
                    ]
                }
            }
        });
    }

    addClusterLayers() {
        this.map.addLayer({
            id: 'unclustered-points',
            type: 'symbol',
            source: 'beacons',
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
                source: 'beacons',
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
            source: 'beacons',
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

    addLocationLayer() {
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

    configureDebug() {
        setInterval(() => {
            this.timeSinceUpdate = Math.round((Date.now() - this.lastPositionUpdate) * 0.001);
            // local debug
            if (!window.ontouchstart && Math.random() > 0.6) {
                var mapCenter = this.map.getCenter();
                this.updateLocation({ coords: { longitude: mapCenter.lng, latitude: mapCenter.lat } });
            }
        }, 1000);
    }

    updateLocation(position) {
        let lng = this.currentLng = position.coords.longitude;
        let lat = this.currentLat = position.coords.latitude;
        this.map.flyTo({ center: [lng, lat] });
        this.updateLocationMarker(lng, lat);
        this.checkNearbyBeacons(lng, lat);
        this.updateBeaconStatus();

        // debug
        this.lastPositionUpdate = Date.now();
    }

    updateLocationMarker(lng, lat) {
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

    checkNearbyBeacons(lng, lat) {
        if (!this.beacons) { return; }
        // TODO: optimize this by narrowing beacons list down to likely candidates before calculating distance
        // or better yet, hard-code min lng and lat differences to filter by
        var nearbyBeacons = _.filter(this.beacons, (beacon) => {
            let dist = this.geoService.pointsToRadians(beacon.geometry.coordinates[0], beacon.geometry.coordinates[1], lng, lat);
            dist = this.geoService.radiansToMeters(dist);
            return dist <= this.beaconMaxProximity;
        });
        nearbyBeacons.forEach((beacon) => {
            if (beacon.properties.beaconReset <= 0) {
                navigator.vibrate(200);
                this.pointsTotal += beacon.properties.value;
                beacon.properties.captureTimestamp = Date.now();
                beacon.properties.beaconReset = this.beaconResetSeconds;
                this.beaconsCaptured.push(_.clone(beacon));
            }
        });
    }

    updateBeaconStatus() {
        if (!this.beacons) { return; }
        this.beacons.forEach((beacon) => {
            let timeLapsed = Math.round((Date.now() - beacon.properties.captureTimestamp) * 0.001);
            beacon.properties.beaconReset = Math.max(0, this.beaconResetSeconds - timeLapsed);
        });
        let beaconSource = (this.map.getSource('beacons') as mapboxgl.GeoJSONSource);
        beaconSource.setData({
            type: 'FeatureCollection',
            features: this.beacons
        });
    }

    onMapClick(e) {
        // Use queryRenderedFeatures to get features at a click event's point
        // Use layer option to avoid getting results from other layers
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['beacons'] });

        var feature = features[0];

        // Populate the popup and set its coordinates
        // based on the feature found.
        var popup: mapboxgl.Popup = new mapboxgl.Popup()
            .setLngLat(feature.geometry.coordinates)
            .setHTML(JSON.stringify(feature.properties))
            .addTo(this.map);
    }

    onMouseOver(e) {
        // Use the same approach as above to indicate that the symbols are clickable
        // by changing the cursor style to 'pointer'.
        if (!this.map.loaded()) { return; }
        var features = this.map.queryRenderedFeatures(e.point, { layers: ['beacons'] });
        this.map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    }

    onMapMoveEnd(e) {
        localStorage.setItem('mapZoom', this.map.getZoom().toString());
        localStorage.setItem('mapCenter', JSON.stringify(this.map.getCenter()));
    }
}
