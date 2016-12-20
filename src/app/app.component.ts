import { Component, OnInit } from '@angular/core';
declare var mapboxgl;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit() {
    mapboxgl.accessToken = 'pk.eyJ1IjoicG9sYXJpcy1yaWRlcngiLCJhIjoiWExuREx5ayJ9.qK0_9TwlruP7fRC1hASJAA';
      var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v9', //stylesheet location
        center: [-93.7604785, 44.8958712], // starting position
        zoom: 9 // starting zoom
    });

      map.addControl(new mapboxgl.GeolocateControl());
      map.addControl(new mapboxgl.NavigationControl());

      map.on('style.load', function (e) {
          console.log(e.style.sprite);
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
                          "coordinates": [-93.406794, 45.058967]
                      },
                      "properties": {
                          "title": "Kyle",
                          "marker-symbol": "default_marker"
                      }
                  }, {
                      "type": "Feature",
                      "geometry": {
                          "type": "Point",
                          "coordinates": [-93.406559, 45.058963]
                      },
                      "properties": {
                          "title": "Troy",
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

          // Display the earthquake data in three layers, each filtered to a range of
          // count values. Each range gets a different fill color.
          var layers = [
              [150, '#f28cb1'],
              [20, '#f1f075'],
              [0, '#51bbd6']
          ];

          layers.forEach(function (layer, i) {
              map.addLayer({
                  "id": "cluster-" + i,
                  "type": "circle",
                  "source": "markers",
                  "paint": {
                      "circle-color": layer[1],
                      "circle-radius": 18
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
                  "text-size": 12
              }
          });

      });
  }
}
