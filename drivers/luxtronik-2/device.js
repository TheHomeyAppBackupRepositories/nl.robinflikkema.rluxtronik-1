'use strict';

const { Device } = require('homey');
const net = require("net");
const LuxtronikOperationMode = require("../../includes/luxtronik_operationmode");



class LuxtronikDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('LuxtronikDevice has been initialized');

    this.energyTotal = null;
    this.energyHeat = null;
    this.energyWater = null;
    this.energyPool = null;

    this.temperatureHotGas = null;
    this.temperatureOutdoor = null;
    this.temperatureRoomCurrent = null;
    this.temperatureRoomTarget = null;
    this.temperatureWaterCurrent = null;
    this.temperatureWaterTarget = null;
    this.temperatureSourceIn = null;
    this.temperatureSourceOut = null;
    this.temperatureHeatingSupply = null;
    this.temperatureHeatingFeedback = null;

    this.water = null;

    this.operationMode = new LuxtronikOperationMode();

    this.scan();

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('LuxtronikDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('LuxtronikDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('LuxtronikDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('LuxtronikDevice has been deleted');
  }

  clearScanTimer() {
    if (this.scanTimer) {
      this.homey.clearTimeout(this.scanTimer);
      this.scanTimer = undefined;
    }
  }

  scheduleScans(interval) {
    if (this._deleted) {
      return;
    }
    this.clearScanTimer();
    this.scanTimer = this.homey.setTimeout(this.scan.bind(this), interval);
  }

  getHost() {
    return this.getSettings().host;
  }

  /**
   * 
   */
  async scan() {
    const host = this.getHost();
    const port = "8889";
    const interval = 36000;
    const timeout = 36000;
    this.log(host, port, interval, timeout)
    try {
      this.scanDevice(host, port, timeout);

      this.log("Triggering setCapabilityValue")
      
      if (this.energyTotal !== null) await this.setCapabilityValue('meter_power.total', this.energyTotal / 10).catch(this.error);
      if (this.energyHeat !== null) await this.setCapabilityValue('meter_power.heat', this.energyHeat / 10).catch(this.error);
      if (this.energyWater !== null) await this.setCapabilityValue('meter_power.water', this.energyWater / 10).catch(this.error);
      if (this.energyPool !== null) await this.setCapabilityValue('meter_power.pool', this.energyPool / 10).catch(this.error);

      if (this.temperatureOutdoor !== null) await this.setCapabilityValue('measure_temperature.outdoor', this.temperatureOutdoor / 10).catch(this.error);
      if (this.temperatureHotGas !== null) await this.setCapabilityValue('measure_temperature.hotgas', this.temperatureHotGas / 10).catch(this.error);
      if (this.temperatureRoomCurrent !== null) await this.setCapabilityValue('measure_temperature.room', this.temperatureRoomCurrent / 10).catch(this.error);
      if (this.temperatureRoomTarget !== null) await this.setCapabilityValue('measure_temperature.room_target', this.temperatureRoomTarget / 10).catch(this.error);
      if (this.temperatureWaterCurrent !== null) await this.setCapabilityValue('measure_temperature.water', this.temperatureWaterCurrent / 10).catch(this.error);
      if (this.temperatureWaterTarget !== null) await this.setCapabilityValue('measure_temperature.water_target', this.temperatureWaterTarget / 10).catch(this.error);
      if (this.temperatureSourceIn !== null) await this.setCapabilityValue('measure_temperature.source_in', this.temperatureSourceIn / 10).catch(this.error);
      if (this.temperatureSourceOut !== null) await this.setCapabilityValue('measure_temperature.source_out', this.temperatureSourceOut / 10).catch(this.error);
      if (this.temperatureHeatingSupply !== null) await this.setCapabilityValue('measure_temperature.heating_supply', this.temperatureHeatingSupply / 10).catch(this.error);
      if (this.temperatureHeatingFeedback !== null) await this.setCapabilityValue('measure_temperature.heating_feedback', this.temperatureHeatingFeedback / 10).catch(this.error);

      if (this.water !== null) await this.setCapabilityValue('measure_water', this.water).catch(this.error);

      if (this.operationMode.getOperationMode() !== null) await this.setCapabilityValue('luxtronik_operationmode', this.operationMode.getOperationMode()).catch(this.error);

    } finally {
      this.scheduleScans(interval);
    }


  }

  destroyClient() {
    if (this.client) {
      this.client.destroy();
      this.client = undefined;
    }
    if (this.cancelCheck) {
      this.homey.clearTimeout(this.cancelCheck);
      this.cancelCheck = undefined;
    }
  }

  sendRequest(request, callback) {
    const header = Buffer.alloc(4);
    header.writeInt32LE(request.length, 0);
    this.client.write(Buffer.concat([header, request]));
    this.receivedData = Buffer.alloc(0);

    const onData = data => {
      this.receivedData = Buffer.concat([this.receivedData, data]);
      while (this.receivedData.length >= 4) {
        const messageLength = this.receivedData.readInt32LE(0);
        if (this.receivedData.length >= messageLength + 4) {
          const message = this.receivedData.slice(4, messageLength + 4);
          callback(message);
          this.receivedData = this.receivedData.slice(messageLength + 4);
        } else {
          break;
        }
      }
    };

    this.client.on('data', onData);

    const onceEndOrError = () => {
      this.client.off('data', onData);
      this.client.off('end', onceEndOrError);
      this.client.off('error', onceEndOrError);
    };

    this.client.once('end', onceEndOrError);
    this.client.once('error', onceEndOrError);
  }

  scanDevice(host, port, timeout) {
    const array_calculated = [];
    this.destroyClient();
    this.client = new net.Socket();

    this.cancelCheck = this.homey.setTimeout(() => {
      this.destroyClient();
      this.log("???");
    }, timeout);

    this.client.on('error', (err) => {
      //this.destroyClient();
      if (err && (err.errno === "ECONNREFUSED" || err.code === "ECONNREFUSED")) {
        this.log("Error on Socket")
      } else {
        this.log("No Error on Socket")
      }
    });

    try {
      this.log("Trying to connect...");
      this.client.connect(port, host, () => {
        this.log("Connected!");
        const buffer = Buffer.alloc(4);
        buffer.writeInt32BE(3004);
        this.client.write(buffer);

        buffer.writeInt32BE(0);
        this.client.write(buffer);
        this.log("Data sent!");
      });
    } catch (error) {
      console.error(`Error: connection failed ${error}`);
      this.destroyClient();
    }

    try {

      let receivedData = Buffer.alloc(0);
      this.client.on('data', (data) => {
        receivedData = Buffer.concat([receivedData, data]);
        if (receivedData.length >= 12) {
          const reqCalculatedCmd = receivedData.readInt32BE(0);
          if (reqCalculatedCmd !== 3004) {
            this.log('Error: REQ_CALCULATED CMD');
          }
          const stat = receivedData.readInt32BE(4);
          const len = receivedData.readInt32BE(8);


          let offset = 12;
          for (let i = 0; i < len; i++) {
            array_calculated.push(receivedData.readInt32BE(offset));
            offset += 4;
          }

          this.energyHeat = (array_calculated[151]);
          this.energyWater = (array_calculated[152]);
          this.energyPool = (array_calculated[153]);
          this.energyTotal = (array_calculated[154]);

          this.temperatureOutdoor = (array_calculated[15]);
          this.temperatureHotGas = (array_calculated[14]);
          this.temperatureRoomCurrent = (array_calculated[227]);
          this.temperatureRoomTarget = (array_calculated[228]);
          this.temperatureWaterCurrent = (array_calculated[17]);
          this.temperatureWaterTarget = (array_calculated[18]);
          this.temperatureSourceIn = (array_calculated[19]);
          this.temperatureSourceOut = (array_calculated[20]);
          this.temperatureHeatingSupply = (array_calculated[10]);
          this.temperatureHeatingFeedback = (array_calculated[11]);

          this.water = (array_calculated[173]);

          
          this.operationMode.setOperationMode(array_calculated[80]);

          this.destroyClient();
        }
      });
    } catch (err) {
      this.destroyClient();
      this.log("Some error in sending request", err)
    }
  }
}

module.exports = LuxtronikDevice;
