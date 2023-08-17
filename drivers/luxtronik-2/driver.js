'use strict';

const { Driver } = require('homey');
const net  = require("net");

class MyDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
  
    this.log('MyDriver has been initialized');
  }



  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    this.log(discoveryResults);
    const devices = Object.values(discoveryResults).map(discoveryResult => {
      return {
        name: discoveryResult.address,
        settings: {
          id: discoveryResult.address,
        },
      };
    });

    return devices;
  }

  async onPair(session) {
    session.setHandler("my_event", async function (data) {
      // data is { 'foo': 'bar' }
      this.log("HANDLER");
      return "Hello!";
    });

    // Show a specific view by ID
    await session.showView("enter_ip");

    // Show the next view
    //await session.nextView();

    // Show the previous view
    //await session.prevView();

    // Close the pair session
    //await session.done();

    // Received when a view has changed
    session.setHandler("showView", async function (viewId) {
      console.log("View: " + viewId);
    });
    session.setHandler('device_input', async (data) => {
      this.log('device_input', data);
      this.log('device_IP', data.ip_address);
      if (!data.devicename) {
        throw new Error(this.homey.__('pair.configuration.invalid_device_name'));
      } else if (!data.ip_address) {
        throw new Error(this.homey.__('pair.configuration.missing_ip_address'));
      } else if (!net.isIP(data.ip_address)) {
        throw new Error(this.homey.__('pair.configuration.invalid_ip_address'));
      }
    });
  }

}

module.exports = MyDriver;
