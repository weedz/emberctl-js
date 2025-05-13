import { EmberAdapter, EmberDevice } from "./lib/EmberBluetoothAdapter.js";
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

using adapter = new EmberAdapter();
await adapter.init();

console.log("[bt] Scanning...");
const devices = await adapter.scan(3000);
for (const device of devices) {
  const uuid = await device.getAddress();
  const name = await device.getName();
  const alias = await device.getAlias();
  console.log(uuid);
  console.log("  name: %s (%s)", name, alias);
}

// const device = await adapter.connectDevice("D0:E5:89:19:16:90");
const device = await adapter.connectDevice(devices[0].device);
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
