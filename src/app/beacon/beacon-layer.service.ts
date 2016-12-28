import { Injectable } from '@angular/core';
import { ConfigService } from '../shared';

@Injectable()
export class BeaconLayerService {
    constructor(private configService: ConfigService) { }

    addBeaconSource(map, beacons) {
        map.addSource('beacons', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
            data: {
                type: 'FeatureCollection',
                features: beacons
            }
        });
    }

    addBeaconLayers(map) {
        map.addLayer({
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
                        [0, 'rgba(238, 28, 38, 1)'],
                        [1, 'rgba(238, 28, 38, 0.5)'],
                        [this.configService.beaconResetSeconds, 'rgba(238, 28, 38, 0)']
                    ]
                }
            }
        });

        map.addLayer({
            id: 'beaconLabel',
            source: 'beacons',
            type: 'symbol',
            layout: {
                'text-field': '{beaconReset}',
                'text-size': 10,
                'text-anchor': 'bottom-left',
                'text-offset': [0.5, -0.5]
            },
            paint: {
                'text-halo-color': 'rgba(200, 200, 200, 0.4)',
                'text-halo-width': 1,
                'text-halo-blur': 2
            }
        });
    }

    addClusterLayers(map) {
        // Display the data in three layers, each filtered to a range of
        // count values. Each range gets a different fill color.
        var layers = [
            [150, '#f28cb1'],
            [20, '#fffa00'],
            [0, '#07d300']
        ];

        layers.forEach((layer, i) => {
            map.addLayer({
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
        map.addLayer({
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
}
