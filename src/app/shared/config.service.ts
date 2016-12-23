import { Injectable } from '@angular/core';

@Injectable()
export class ConfigService {
    defaultZoom: number = 15;
    defaultCenter: number[] = [-90, 45];
    defaultPitch: number = 50;
    beaconMaxProximity: number = 20;
    beaconResetSeconds: number = 600;
}
