import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { Component, OnInit } from "@angular/core";
const irsdk: any = require("node-irsdk");
@Component({
  selector: "App",
  templateUrl: "views/components/app/index.html"
})
export class AppComponent implements OnInit {
  public soc: number = 0;
  public deploy: number = 0;
  public flags: [];
  public deltaToSesBest: number;
  public lapsLeft: number;
  public timeLeft: number;
  public trackTemp: string;

  public rpm: number;
  public firstLightRpm: number;
  public lastLightRpm: number;

  public ngOnInit(): void {
    console.log("component initialized");

    const that = this;

    irsdk.init({
      telemetryUpdateInterval: 16, // 60 ticks per second
      sessionInfoUpdateInterval: 1000 // 1 tick per second
    });

    const iracing: any = irsdk.getInstance();

    console.log("waiting for iRacing...");

    iracing.on("Connected", function (): void {
      console.log("connected to iRacing..");
    });

    iracing.on("Disconnected", function (): void {
      console.log("iRacing shut down, exiting.\n");
      // process.exit();
    });

    iracing.on("Telemetry", function (data: any): void {
      that.soc = Math.floor(data.values.EnergyERSBatteryPct *  100);
      that.deploy = Math.floor(data.values.EnergyMGU_KLapDeployPct * 100);
      that.flags = data.values.SessionFlags;
      that.deltaToSesBest = data.values.LapDeltaToSessionBestLap.toFixed(2);
      that.lapsLeft = data.values.SessionLapsRemainEx.toFixed(2);
      that.timeLeft = data.values.SessionTimeRemain.toFixed(2);
    });

    iracing.on("SessionInfo", function (data: any): void {
      that.trackTemp = data.WeekendInfo.TrackSurfaceTemp;
    });
  }
}

@NgModule({
  imports: [BrowserModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
