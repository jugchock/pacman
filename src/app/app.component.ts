import * as _ from 'lodash';
import { Component, OnInit } from '@angular/core';
import { BeaconLayerService, GeoService, LocationService } from './shared';
declare const mapboxgl;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    map: mapboxgl.Map;
    defaultZoom: number = 15;
    defaultCenter: number[] = [-90, 45];
    defaultPitch: number = 50;
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
    visible: boolean;
    displaySidebar: string;
    private userControlledPan = false;
    private userControlledZoom = false;

    // debug
    timeSinceUpdate: number;
    lastPositionUpdate: number = Date.now();

    constructor(private mapLayerService: BeaconLayerService,
        private geoService: GeoService,
        private locationService: LocationService)
    {
        this.displaySidebar = 'hide-class';
        this.visible = false;
    }

    toggleSidebar() {
        this.visible = !this.visible;
        this.displaySidebar = this.visible ? 'show-class' : 'hide-class';
    }

    ngOnInit() {
        mapboxgl.accessToken = 'pk.eyJ1IjoicG9sYXJpcy1yaWRlcngiLCJhIjoiWExuREx5ayJ9.qK0_9TwlruP7fRC1hASJAA';
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/outdoors-v9',
            center: this.getSavedMapCenter(),
            zoom: localStorage.getItem('mapZoom') || this.defaultZoom,
            pitch: this.defaultPitch
        });

        this.map.addControl(new mapboxgl.NavigationControl());

        this.beacons = this.getBeacons();

        var watchID = navigator.geolocation.watchPosition((position) => this.updateLocation(position), null, { enableHighAccuracy: true });

        this.map.on('style.load', () => {
            this.mapLayerService.addBeaconSource(this.map, this.beacons);
            this.locationService.addLocationSource(this.map);
            this.mapLayerService.addBeaconLayers(this.map);
            this.mapLayerService.addClusterLayers(this.map);
            this.locationService.addLocationLayer(this.map);
        });
        this.map.on('click', (e) => this.onMapClick(e));
        this.map.on('mousemove', (e) => this.onMouseOver(e));
        this.map.on('moveend', (e) => this.onMapMoveEnd(e));

        this.configureDebug();
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
        return visibleBeacons.concat(hiddenBeacons);
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

    getSavedMapCenter() {
        var center;
        var centerEncoded = localStorage.getItem('mapCenter');
        if (centerEncoded) {
            center = _.attempt(JSON.parse, centerEncoded);
        }
        if (!center || _.isError(center)) {
            center = this.defaultCenter;
        }
        return center;
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
        if (!this.userControlledPan) {
            let zoom = this.userControlledZoom ? this.map.getZoom() : this.defaultZoom;
            this.map.flyTo({ center: [lng, lat], zoom });
        }
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
        if (!feature) { return; }

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
        var zoom = this.map.getZoom();
        localStorage.setItem('mapZoom', zoom.toString());
        localStorage.setItem('mapCenter', JSON.stringify(this.map.getCenter()));
    }
}