import NodeBle, { createBluetooth } from "node-ble";

// ble?
const SERVICE_BLE_UUID = "00001800-0000-1000-8000-00805f9b34fb";
const BT_DEVICE_NAME_UUID = "00002a00-0000-1000-8000-00805f9b34fb"; // is this correct?

// ember specific characteristics
const SERVICE_EMBER_UUID = "fc543622-236c-4c94-8fa9-944a3e5353fa";
// characteristics
const TEMPERATURE_TARGET_UUID = "fc540003-236c-4c94-8fa9-944a3e5353fa";
const TEMPERATURE_CURRENT_UUID = "fc540002-236c-4c94-8fa9-944a3e5353fa";
const LED_COLOR_UUID = "fc540014-236c-4c94-8fa9-944a3e5353fa";
const BATTERY_CURRENT_UUID = "fc540007-236c-4c94-8fa9-944a3e5353fa";

async function setBTDeviceName(gatt: NodeBle.GattServer, name: string) {
  const service = await gatt.getPrimaryService(SERVICE_BLE_UUID);
  const char = await service.getCharacteristic(BT_DEVICE_NAME_UUID);

  const currentValue = await char.readValue();
  console.log("Current name:", currentValue.toString("utf8"));

  await char.writeValueWithoutResponse(Buffer.from(name));
}

async function currentLEDColor(gatt: NodeBle.GattServer) {
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const ledChar = await service.getCharacteristic(LED_COLOR_UUID);

  const value = await ledChar.readValue();
  console.log("Current LED color: len=%d, buffer='%s'", value.byteLength, Buffer.from(value).toString("utf8"));

  // parse color from buffer
  const r = value.readUint8(0);
  const g = value.readUint8(1);
  const b = value.readUint8(2);
  const z = value.readUint8(3);

  console.log("  color(?): r='%d', g='%d', b='%d', z='%d'", r, g, b, z);
}
async function setLEDColor(gatt: NodeBle.GattServer, color: { r: number; g: number; b: number; a?: number }) {
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const ledChar = await service.getCharacteristic(LED_COLOR_UUID);

  // change color
  const buf = Buffer.alloc(4);
  buf.writeUInt8(color.r, 0); // r
  buf.writeUInt8(color.g, 1); // g
  buf.writeUInt8(color.b, 2); // b
  buf.writeUInt8(color.a ?? 255, 3); // "brightness"/alpha

  await ledChar.writeValueWithoutResponse(buf);
}

async function getCurrentBattery(gatt: NodeBle.GattServer) {
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const char = await service.getCharacteristic(BATTERY_CURRENT_UUID);

  const buf = await char.readValue();
  const currentCharge = buf.readUint8(0);
  const isCharging = buf.readUint8(1) === 1;
  console.log("len=%d, value='%d', buf=", buf.byteLength, currentCharge, buf);
  return { currentCharge, isCharging };
}


async function getCurrentTemperature(gatt: NodeBle.GattServer) {
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const char = await service.getCharacteristic(TEMPERATURE_CURRENT_UUID);

  const buf = await char.readValue();
  const value = buf.readUint16LE();
  console.log("len=%d, value='%d', buf=", buf.byteLength, value, buf);
  return value;
}
async function getTargetTemperature(gatt: NodeBle.GattServer) {
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const char = await service.getCharacteristic(TEMPERATURE_TARGET_UUID);

  const buf = await char.readValue();
  const value = buf.readUint16LE();
  console.log("len=%d, value='%d', buf=", buf.byteLength, value, buf);
  return value;
}
/**
  * Set temperature in celsius
  * @param temp Must be between 40-63
  */
async function setTargetTemperature(gatt: NodeBle.GattServer, temp: number) {
  if (temp > 80) {
    return null;
  }
  if (temp < 0) {
    temp = 0;
  }
  const convertedTemp = temp * 100;
  const service = await gatt.getPrimaryService(SERVICE_EMBER_UUID);
  const char = await service.getCharacteristic(TEMPERATURE_TARGET_UUID);

  const buf = Buffer.alloc(2);

  buf.writeUint16LE(convertedTemp);
  await char.writeValueWithoutResponse(buf);
}

async function getName(device: NodeBle.Device) {
  try {
    return device.getName();
  } catch (err) {
    console.log("could not get name.");
    return null;
  }
}
async function getAlias(device: NodeBle.Device) {
  try {
    return device.getAlias();
  } catch (err) {
    console.log("could not get alias.");
    return null;
  }
}

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

        if (charUuid === LED_COLOR_UUID) {
          console.log("parsing LED color...");
          // parse color from buffer
          const r = value.readUint8(0);
          const g = value.readUint8(1);
          const b = value.readUint8(2);
          const z = value.readUint8(3);

          console.log("    color(?): r='%d', g='%d', b='%d', z='%d'", r, g, b, z);
        }
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
      const name = "unknown";
      const alias = await getAlias(device);
      console.log("  name: %s (%s)", name, alias);

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

const { bluetooth, destroy } = createBluetooth();
const adapter = await bluetooth.defaultAdapter();

const device = await adapter.waitDevice("D0:E5:89:19:16:90");
await device.connect();

console.log("Connected?", await device.isConnected());

// const manData = await device.getManufacturerData();
// console.log("  man data:", manData);
// // console.log("Buf as utf8:", Buffer.from(manData[961]).toString("utf8"));
//
// const adData = await device.getAdvertisingData();
// console.log("  ad data:", adData);

const gatt = await device.gatt();

console.log("Current battery:", await getCurrentBattery(gatt));

await currentLEDColor(gatt);
await setLEDColor(gatt, { r: 200, g: 50, b: 120 }); // pink-ish
// await setLEDColor(gatt, { r: 20, g: 250, b: 20 }); // green?
// await setLEDColor(gatt, { r: 255, g: 255, b: 255 }); // white

// await scan(adapter);
// await setBTDeviceName(gatt, "I'm a teapot");
// await enumGattServices(gatt);

await setTargetTemperature(gatt, 0);

console.log("Current temperature:", await getCurrentTemperature(gatt));
console.log("Target temperature:", await getTargetTemperature(gatt));

// await device.disconnect();

destroy();
