import { BluetoothAdapter } from "./lib/BluetoothAdapter.js";
import { EmberDevice } from "./lib/EmberBluetoothAdapter.js";
import NodeBle from "node-ble";

async function enumGattServices(gatt: NodeBle.GattServer) {
  const services = await gatt.services();
  console.log("Services:", services);
  for (const serviceUuid of services) {
    const service = await gatt.getPrimaryService(serviceUuid);
    console.log("service:", await service.getUUID());

    const characteristics = await service.characteristics();
    for (const charUuid of characteristics) {
      const characteristic = await service.getCharacteristic(charUuid);
      console.log("  char:", charUuid);
      console.log("    flags:", await characteristic.getFlags());

      try {
        const value = await characteristic.readValue();
        console.log("    value: len=%d, buffer='%s'", value.byteLength, Buffer.from(value).toString("utf8"));
      } catch (err) {
        console.log("NOT PERMITTED TO READ VALUE");
      }
    }
  }
}

async function scan(adapter: NodeBle.Adapter) {
  if (!await adapter.isDiscovering()) {
    await adapter.startDiscovery();
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const devices = await adapter.devices();
  console.log("Devices:", devices);

  for (const uuid of devices) {
    console.log("UUID:", uuid);
    const device = await adapter.waitDevice(uuid);

    try {
      // const name = await getName(device);
      // const name = "unknown";
      // const alias = await getAlias(device);
      // console.log("  name: %s (%s)", name, alias);

      // const srvcData = await device.getServiceData();
      // console.log("  service data:", srvcData);
      // const adData = await device.getAdvertisingData();
      // console.log("  ad data:", adData);

      await device.connect();
      // await device.pair();

      const gatt = await device.gatt();
      console.log("gatt:", gatt);
      const services = await gatt.services();
      console.log("  services:", services);

      for (const serviceUuid of services) {
        console.log("  service:", serviceUuid);
        const service = await gatt.getPrimaryService(serviceUuid);
        const characteristics = await service.characteristics();
        console.log("    characteristics:", characteristics);
      }
    } catch (err) {
      console.error("ERROR:", err);
    }

    const isConnected = await device.isConnected();
    console.log("  isConnected?", isConnected);
    if (isConnected) {
      await device.disconnect();
    }
  }
}

using bluetooth = new BluetoothAdapter();
await bluetooth.init();

const device = await bluetooth.connectDevice("D0:E5:89:19:16:90");
if (!device) {
  throw new Error("could not connect to device");
}
const ember = new EmberDevice(device);
await ember.init();

console.log("Current battery:", await ember.getCurrentBattery());
console.log("LED color:", await ember.currentLedColor());
await ember.setLEDColor({ r: 200, g: 50, b: 120 }); // pink-ish

await ember.setTargetTemperature(0);
console.log("Current temperature:", await ember.getCurrentTemperature());
console.log("Target temperature:", await ember.getTargetTemperature());
