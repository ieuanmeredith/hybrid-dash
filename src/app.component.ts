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
  public deltaToSesBest: string = "+0.00";
  public lapsLeft: number = 0;
  public timeLeft: string = "00:00:00";
  public trackTemp: string = "N/A";

  public rpm: number = 0;
  public firstLightRpm: number = 0;
  public lastLightRpm: number = 0;
  public rpmLightArray: number[];

  public gear: string = "N";

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

      const delta = data.values.LapDeltaToSessionBestLap.toFixed(2);
      that.deltaToSesBest = `${delta > 0 ? "+" : ""}${delta}`;

      that.lapsLeft = data.values.SessionLapsRemainEx.toFixed(2);

      const secondsLeft = Math.floor(data.values.SessionTimeRemain);
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft - minutes * 60;
      that.timeLeft = `${hours}:${minutes}:${seconds}`;
      that.rpm = data.values.RPM;
      that.gear = data.values.Gear === 0 ? "N"
      : data.values.Gear === -1 ? "R"
      : data.values.Gear;
    });

    iracing.on("SessionInfo", function (data: any): void {
      that.trackTemp = data.WeekendInfo.TrackSurfaceTemp;

      if (that.firstLightRpm !== data.DriverInfo.DriverCarSLFirstRPM) {
        that.firstLightRpm = data.DriverInfo.DriverCarSLFirstRPM;
      }
      if (that.lastLightRpm !== data.DrtiverInfo.DriverCarSLLastRPM) {
        that.lapsLeft = data.DrtiverInfo.DriverCarSLLastRPM;
      }

      if (that.firstLightRpm === data.DriverInfo.DriverCarSLFirstRPM &&
          that.lastLightRpm === data.DrtiverInfo.DriverCarSLLastRPM &&
          !that.rpmLightArray) {
            that.rpmLightArray = [];

            const diff = (that.lastLightRpm - that.firstLightRpm) / 10;

            for (let i = 0; i < 10; i++) {
              if (i === 0) { that.rpmLightArray.push(that.firstLightRpm); }
              else { that.rpmLightArray.push(that.firstLightRpm + diff); }
            }
          }

    });
  }
}

@NgModule({
  imports: [BrowserModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
