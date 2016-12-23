import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { ConfigService, GeoService, LocationService } from './shared';
import { BeaconService, BeaconLayerService } from './beacon';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [BeaconService, BeaconLayerService, ConfigService, GeoService, LocationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
