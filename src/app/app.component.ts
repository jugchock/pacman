import { Component, OnInit } from '@angular/core';
declare const mapboxgl;

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    ngOnInit() {
        mapboxgl.accessToken = 'pk.eyJ1IjoicG9sYXJpcy1yaWRlcngiLCJhIjoiWExuREx5ayJ9.qK0_9TwlruP7fRC1hASJAA';
        const map: mapboxgl.Map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/outdoors-v9',
            center: [-93.7604785, 44.8958712],
            zoom: 9
        });

        map.addControl(new mapboxgl.NavigationControl());

        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            watchPosition: true
        }));

        var locationWatchStart: number = Date.now();
        var watchID = navigator.geolocation.watchPosition((position) => {
            let time: number = (Date.now() - locationWatchStart) * 0.001;
            console.log(time, position.coords.latitude, position.coords.longitude);
        });

        // debugging
        map.on('mousemove', function (e) {
            document.getElementById('info').innerHTML =
                // e.point is the x, y coordinates of the mousemove event relative
                // to the top-left corner of the map
                JSON.stringify(e.point) + '<br />' +
                // e.lngLat is the longitude, latitude geographical position of the event
                JSON.stringify(e.lngLat);
        });

        map.on('style.load', function () {
            map.addSource('markers', {
                "type": "geojson",
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
                "data": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [-93.602648, 44.783293]
                        },
                        "properties": {
                            "title": "Jug",
                            "marker-symbol": "default_marker"
                        }
                    }, {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [-93.760921, 44.896025]
                        },
                        "properties": {
                            "title": "Troy",
                            "marker-color": "#ff00ff",
                            "marker-symbol": "secondary_marker"
                        }
                    }, {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [-93.406559, 45.058963]
                        },
                        "properties": {
                            "title": "Polaris",
                            "marker-color": "#ff00ff",
                            "marker-symbol": "secondary_marker"
                        }
                    }]
                }
            });

            map.addLayer({
                "id": "markers",
                "source": "markers",
                "type": "circle",
                "paint": {
                    "circle-radius": 10,
                    "circle-color": "#ee1c24"
                }
            });

            map.addLayer({
                "id": "unclustered-points",
                "type": "symbol",
                "source": "markers",
                "filter": ["!has", "point_count"],
                "layout": {
                    "icon-image": "marker-15"
                }
            });

            // Display the data in three layers, each filtered to a range of
            // count values. Each range gets a different fill color.
            var layers = [
                [150, '#f28cb1'],
                [20, '#f1f075'],
                [0, '#39c237']
            ];

            layers.forEach(function (layer, i) {
                map.addLayer({
                    "id": "cluster-" + i,
                    "type": "circle",
                    "source": "markers",
                    "paint": {
                        "circle-color": layer[1],
                        "circle-radius": 12
                    },
                    "filter": i === 0 ?
                        [">=", "point_count", layer[0]] :
                        ["all",
                            [">=", "point_count", layer[0]],
                            ["<", "point_count", layers[i - 1][0]]]
                });
            });

            // Add a layer for the clusters' count labels
            map.addLayer({
                "id": "cluster-count",
                "type": "symbol",
                "source": "markers",
                "layout": {
                    "text-field": "{point_count}",
                    "text-font": [
                        "DIN Offc Pro Medium",
                        "Arial Unicode MS Bold"
                    ],
                    "text-size": 14
                }
            });

        });

        map.on('click', function (e) {
            // Use queryRenderedFeatures to get features at a click event's point
            // Use layer option to avoid getting results from other layers
            var features = map.queryRenderedFeatures(e.point, { layers: ['markers'] });
            // if there are features within the given radius of the click event,
            // fly to the location of the click event
            if (features.length) {
                // Get coordinates from the symbol and center the map on those coordinates
                map.flyTo({center: features[0].geometry.coordinates});
            }
        });


    // Use the same approach as above to indicate that the symbols are clickable
    // by changing the cursor style to 'pointer'.
        map.on('mousemove', function (e) {
            var features = map.queryRenderedFeatures(e.point, { layers: ['markers'] });
            map.getCanvas().style.cursor = features.length ? 'pointer' : '';
        });
    }
}
