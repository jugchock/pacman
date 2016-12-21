import { Injectable } from '@angular/core';

@Injectable()
export class GeoService {
    pointsToRadians(lng1: number, lat1: number, lng2: number, lat2: number) {
        var diffLng: number;
        var diffLat: number;
        var dist: number;

        lat1 = this.degreesToRadians(lat1);
        lng1 = this.degreesToRadians(lng1);
        lat2 = this.degreesToRadians(lat2);
        lng2 = this.degreesToRadians(lng2);

        diffLng = lng2 - lng1;
        diffLat = lat2 - lat1;

        // here's the heavy lifting
        dist = Math.pow(Math.sin(diffLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(diffLng / 2), 2);
        return 2 * Math.atan2(Math.sqrt(dist), Math.sqrt(1 - dist)); // great circle distance in radians
    }

    degreesToRadians(degrees: number) {
        return degrees * Math.PI / 180;
    }
}
