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
  public flags: [] = [];
  public deltaToSesBest: string = "+0.00";
  public timeLeft: string = "00:00:00";
  public trackTemp: string = "N/A";
  public deployMode: string = "0";
  public carLR: string = "";
  public lap: number = 0;
  public lapTimeArray: number[] = [];

  public estLapTime: number = 0;
  public maxFuel: number = 0;
  public fuelUsageBuffer: number[] = [];
  public fuelLapsRemaining: number = 0;
  public fuelPerLap: string | number = 0;
  public fuelRemaining: string | number = 0;
  public boxboxbox: boolean = false;

  public rpm: number = 0;
  public firstLightRpm: number = 0;
  public lastLightRpm: number = 0;
  public rpmLightArray: number[];

  public gear: string = "N";

  public pad(n: string, width: number, z: any) {
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  public getAvgLap(): number {
    let sum = 0;
    for (let i = 0; i < this.lapTimeArray.length; i++) {
      sum += this.lapTimeArray[i];
    }
    return sum / this.lapTimeArray.length;
  }

  public getAvgFuelPerHour(): number {
    let sum = 0;
    for (let i = 0; i < this.fuelUsageBuffer.length; i++) {
      sum += this.fuelUsageBuffer[i];
    }
    return sum / this.fuelUsageBuffer.length;
  }

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
      that.deployMode = data.values.dcMGUKDeployFixed;
      that.carLR = data.values.CarLeftRight;
      that.trackTemp = data.values.TrackTempCrew.toFixed(2);
      that.fuelRemaining = (Math.round(data.values.FuelLevel * 100) / 100).toFixed(2);

      if (that.fuelUsageBuffer.length <= 3600) {
        if (Math.floor(data.values.Speed) !== 0 && data.values.FuelLevel > 0.2) {
          that.fuelUsageBuffer.push(Math.round(data.values.FuelUsePerHour * 100) / 100);
        }
      }
      else {
        that.fuelUsageBuffer = that.fuelUsageBuffer.splice(1, 3599);
        that.fuelUsageBuffer.push(Math.round(data.values.FuelUsePerHour * 100) / 100);
      }

      if (that.lap !== data.values.Lap) {
        if (that.lap === 0) {
          that.lap = data.values.Lap;
        }
        else {
          that.lap = data.values.Lap;
          const lapTemp = Math.round(data.values.LapLastLapTime * 100) / 100;
          if (lapTemp > 0 && that.lapTimeArray.indexOf(lapTemp) === -1) {
            that.lapTimeArray.push(lapTemp);
          }

          if (that.lapTimeArray.length > 2) {
            that.estLapTime = that.getAvgLap();
          }

          that.fuelLapsRemaining < 2 ? that.boxboxbox = true : that.boxboxbox = false;
        }
      }

      if (that.maxFuel > 0 && that.estLapTime > 0) {
        const lapsPerHour = 3600 / that.estLapTime;
        const fuelPerHour = that.getAvgFuelPerHour();
        const fuelPerLap = fuelPerHour / lapsPerHour;
        that.fuelPerLap = (Math.round(fuelPerLap * 100) / 100).toFixed(2);
        that.fuelLapsRemaining = (((data.values.FuelLevel * 0.75) - 0.2) / fuelPerLap);
        if (that.fuelLapsRemaining > 2) { that.boxboxbox = false; }
      }

      const delta = data.values.LapDeltaToSessionBestLap.toFixed(2);
      that.deltaToSesBest = `${delta > 0 ? "+" : ""}${delta}`;

      const secondsLeft = Math.floor(data.values.SessionTimeRemain);
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft - minutes * 60;
      that.timeLeft = `${that.pad(hours.toString(), 2, 0)}:${that.pad(minutes.toString(), 2, 0)}:${that.pad(seconds.toString(), 2, 0)}`;
      that.rpm = data.values.RPM;
      that.gear = data.values.Gear === 0 ? "N"
      : data.values.Gear === -1 ? "R"
      : data.values.Gear;
    });

    iracing.on("SessionInfo", function (data: any): void {
      that.maxFuel = data.data.DriverInfo.DriverCarFuelMaxLtr * 0.75;

      if (that.estLapTime === 0) { that.estLapTime = data.data.DriverInfo.DriverCarEstLapTime; }

      if (that.firstLightRpm !== data.data.DriverInfo.DriverCarSLFirstRPM) {
        that.firstLightRpm = data.data.DriverInfo.DriverCarSLFirstRPM;
      }
      if (that.lastLightRpm !== data.data.DriverInfo.DriverCarSLLastRPM) {
        that.lastLightRpm = data.data.DriverInfo.DriverCarSLLastRPM;
      }

      if (that.firstLightRpm === data.data.DriverInfo.DriverCarSLFirstRPM &&
        that.lastLightRpm === data.data.DriverInfo.DriverCarSLLastRPM &&
        !that.rpmLightArray) {
          that.rpmLightArray = [];

          const diff = (that.lastLightRpm - that.firstLightRpm) / 10;

          for (let i = 0; i < 10; i++) {
            if (i === 0) { that.rpmLightArray.push(that.firstLightRpm); }
            else { that.rpmLightArray.push(that.rpmLightArray[i - 1] + diff); }
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
