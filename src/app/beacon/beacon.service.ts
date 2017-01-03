import * as _ from 'lodash';
import { Injectable } from '@angular/core';
import { ConfigService } from '../shared';

@Injectable()
export class BeaconService {
    beacons: GeoJSON.Feature<GeoJSON.Point>[];
    beaconsCaptured;
    beaconSystems = {};

    constructor(private configService: ConfigService) {
        this.getStoredBeaconsCaptured();
    }

    getStoredBeaconsCaptured() {
        var beacons;
        var beaconsEncoded = localStorage.getItem('beaconsCaptured');
        if (beaconsEncoded) {
            beacons = _.attempt(JSON.parse, beaconsEncoded);
        }
        this.beaconsCaptured = beacons && !_.isError(beacons) ? beacons : [];
    }

    getBeacons() {
        var troyVisibleBeacons = require('./troy-visible-beacons.json')
            .map((coords) => this.createVisibleBeacon(coords, 'troy'));
        var jugVisibleBeacons = require('./jug-visible-beacons.json')
            .map((coords) => this.createVisibleBeacon(coords, 'jug'));
        var polarisShortVisibleBeacons = require('./polaris-shortpath-visible-beacons.json')
            .map((coords) => this.createVisibleBeacon(coords, 'polarisShort'));
        var polarisLongVisibleBeacons = require('./polaris-longpath-visible-beacons.json')
            .map((coords) => this.createVisibleBeacon(coords, 'polarisLong'));
        var visibleBeacons = troyVisibleBeacons.concat(
            jugVisibleBeacons, polarisShortVisibleBeacons, polarisLongVisibleBeacons);
        var troyHiddenBeacons = require('./troy-hidden-beacons.json');
        var jugHiddenBeacons = require('./jug-hidden-beacons.json');
        var polarisShortHiddenBeacons = require('./polaris-shortpath-hidden-beacons.json');
        var polarisLongHiddenBeacons = require('./polaris-longpath-hidden-beacons.json');
        var hiddenBeacons = troyHiddenBeacons.concat(
            jugHiddenBeacons, polarisShortHiddenBeacons, polarisLongHiddenBeacons)
            .map((coords) => this.createHiddenBeacon(coords));
        this.beacons = visibleBeacons.concat(hiddenBeacons);
    }

    createVisibleBeacon(coords, systemName): GeoJSON.Feature<GeoJSON.Point> {
        // var beaconId = `${coords[0]}|${coords[1]}`;  // preferred syntax but screws with chrome debugger
        var beaconId = coords[0] + '|' + coords[1];
        var beaconReset = Math.max(
            0,
            Math.round(this.configService.beaconResetSeconds - Math.random() * this.configService.beaconResetSeconds * 4));
        return {
            id: beaconId,
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coords
            },
            properties: {
                markerSymbol: 'default_marker',
                type: 'visible',
                captureTimestamp: Date.now() - (this.configService.beaconResetSeconds - beaconReset) * 1000,
                beaconReset,
                value: 1,
                system: systemName,
                userCaptured: this.userHasCapturedBeacon(beaconId)
            }
        };
    }

    userHasCapturedBeacon(id) {
        return !!_.find(this.beaconsCaptured, { id });
    }

    createHiddenBeacon(coords): GeoJSON.Feature<GeoJSON.Point> {
        var beaconReset = Math.max(
            0,
            Math.round(this.configService.beaconResetSeconds - Math.random() * this.configService.beaconResetSeconds * 2));
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
                captureTimestamp: Date.now() - (this.configService.beaconResetSeconds - beaconReset) * 1000,
                beaconReset,
                value: 1
            }
        };
    }

    addCapturedBeacon(beacon) {
        this.beaconsCaptured.push({
            id: beacon.id,
            timestamp: Date.now(),
            value: beacon.properties.value
        });
        localStorage.setItem('beaconsCaptured', JSON.stringify(this.beaconsCaptured));
    }

    calculatePoints() {
        var points = 0;
        this.beaconsCaptured.forEach((beacon) => {
            points += beacon.value;
        });
        return points;
    }
}
