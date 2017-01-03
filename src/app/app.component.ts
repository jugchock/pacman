import * as _ from 'lodash';
import { Component, OnInit } from '@angular/core';
import { ConfigService, GeoService, LocationService } from './shared';
import { BeaconService, BeaconLayerService } from './beacon';
declare const mapboxgl;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    map: mapboxgl.Map;
    currentLng: number;
    currentLat: number;
    points: number = 0;
    pointsWeek: number = 0;
    pointsTotal: number = 0;
    message: string;
    visible: boolean;
    displaySidebar: string;
    followMe: boolean = true;
    systemBadges;

    // debug
    timeSinceUpdate: number;
    lastPositionUpdate: number = Date.now();

    constructor(private beaconService: BeaconService,
        private beaconLayerService: BeaconLayerService,
        public configService: ConfigService,
        private geoService: GeoService,
        private locationService: LocationService
    ) {
        this.displaySidebar = 'hide-class';
        this.visible = false;
        this.systemBadges = this.beaconService.systemBadges;
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
            zoom: localStorage.getItem('mapZoom') || this.configService.defaultZoom,
            pitch: this.configService.defaultPitch
        });

        this.map.addControl(new mapboxgl.NavigationControl());

        this.beaconService.getBeacons();
        this.pointsTotal = this.beaconService.calculatePoints();

        var watchID = navigator.geolocation.watchPosition(
            (position) => this.onLocationUpdate(position), null, { enableHighAccuracy: true });

        this.map.on('style.load', () => {
            this.beaconLayerService.addBeaconSource(this.map, this.beaconService.beacons);
            this.locationService.addLocationSource(this.map);
            this.beaconLayerService.addBeaconLayers(this.map);
            this.beaconLayerService.addClusterLayers(this.map);
            this.locationService.addLocationLayer(this.map);
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
        return center && !_.isError(center) ? center : this.configService.defaultCenter;
    }

    configureDebug() {
        setInterval(() => {
            this.timeSinceUpdate = Math.round((Date.now() - this.lastPositionUpdate) * 0.001);
            // local debug
            if (!this.isTouch() && Math.random() > 0.6) {
                var mapCenter = this.map.getCenter();
                this.onLocationUpdate({ coords: { longitude: mapCenter.lng, latitude: mapCenter.lat } });
            }
        }, 1000);
    }

    isTouch() {
        try {
            document.createEvent('TouchEvent');
            return true;
        } catch (e) {
            return false;
        }
    }

    onLocationUpdate(position) {
        let lng = this.currentLng = position.coords.longitude;
        let lat = this.currentLat = position.coords.latitude;
        if (this.followMe) {
            this.map.flyTo({ center: [lng, lat], zoom: this.map.getZoom() });
        }
        this.locationService.updateLocationMarker(this.map, lng, lat);
        this.checkNearbyBeacons(lng, lat);
        this.updateBeaconStatus();

        // debug
        this.lastPositionUpdate = Date.now();
    }

    checkNearbyBeacons(lng, lat) {
        var beacons = this.beaconService.beacons;
        if (!beacons) { return; }
        // TODO: optimize this by narrowing beacons list down to likely candidates before calculating distance
        // or better yet, hard-code min lng and lat differences to filter by
        var nearbyBeacons = _.filter(beacons, (beacon) => {
            let dist = this.geoService.pointsToRadians(beacon.geometry.coordinates[0], beacon.geometry.coordinates[1], lng, lat);
            dist = this.geoService.radiansToMeters(dist);
            return dist <= this.configService.beaconMaxProximity;
        });
        nearbyBeacons.forEach((beacon) => {
            if (beacon.properties.beaconReset <= 0) {
                navigator.vibrate(200);
                beacon.properties.captureTimestamp = Date.now();
                beacon.properties.beaconReset = this.configService.beaconResetSeconds;
                this.beaconService.addCapturedBeacon(beacon);
                this.pointsTotal = this.beaconService.calculatePoints();
            }
        });
    }

    updateBeaconStatus() {
        var beacons = this.beaconService.beacons;
        if (!beacons) { return; }
        beacons.forEach((beacon) => {
            let timeLapsed = Math.round((Date.now() - beacon.properties.captureTimestamp) * 0.001);
            beacon.properties.beaconReset = Math.max(0, this.configService.beaconResetSeconds - timeLapsed);
        });
        let beaconSource = (this.map.getSource('beacons') as mapboxgl.GeoJSONSource);
        if (!beaconSource) { return; }
        beaconSource.setData({
            type: 'FeatureCollection',
            features: beacons
        });
    }

    toggleFollowMe() {
        this.followMe = !this.followMe;
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
        localStorage.setItem('mapZoom', this.map.getZoom().toString());
        localStorage.setItem('mapCenter', JSON.stringify(this.map.getCenter()));
    }
}
