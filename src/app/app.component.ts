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
        var data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-93.602648, 44.783293]
                },
                properties: {
                    title: 'Jug',
                    'marker-symbol': 'default_marker',
                    'beacon-hides': false,
                    'beacon-proximity': 8,
                    'beacon-is-visible': true,
                    'beacon-value': 1
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-93.760921, 44.896025]
                },
                properties: {
                    title: 'Troy',
                    'marker-color': '#ff00ff',
                    'marker-symbol': 'secondary_marker',
                    'beacon-hides': false,
                    'beacon-proximity': 5,
                    'beacon-is-visible': true,
                    'beacon-value': 5
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-93.406559, 45.058963]
                },
                properties: {
                    title: 'Polaris',
                    'marker-color': '#ffbc38',
                    'marker-symbol': 'secondary_marker',
                    'beacon-hides': true,
                    'beacon-proximity': 1,
                    'beacon-is-visible': true,
                    'beacon-value': 8
                }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-93.406861, 45.059064]
                },
                properties: {
                    title: 'Polaris 2',
                    'marker-color': '#ffbc38',
                    'marker-symbol': 'secondary_marker',
                    'beacon-hides': true,
                    'beacon-proximity': 1,
                    'beacon-is-visible': true,
                    'beacon-value': 8
                }
            }]
        };

        this.map.addSource('markers', {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
            data
        });
    }

    addLocationSource = () => {
        var data: GeoJSON.Feature<GeoJSON.Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-93.54917076, 44.91671739]
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
