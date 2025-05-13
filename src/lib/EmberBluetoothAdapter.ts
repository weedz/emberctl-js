import { BluetoothDevice } from "./BluetoothAdapter.js";

// ble?
// const SERVICE_BLE_UUID = "00001800-0000-1000-8000-00805f9b34fb";
// const BT_DEVICE_NAME_UUID = "00002a00-0000-1000-8000-00805f9b34fb"; // is this correct?

// ember specific characteristics
const SERVICE_EMBER_UUID = "fc543622-236c-4c94-8fa9-944a3e5353fa";
// characteristics
const TEMPERATURE_TARGET_UUID = "fc540003-236c-4c94-8fa9-944a3e5353fa";
const TEMPERATURE_CURRENT_UUID = "fc540002-236c-4c94-8fa9-944a3e5353fa";
const LED_COLOR_UUID = "fc540014-236c-4c94-8fa9-944a3e5353fa";
const BATTERY_CURRENT_UUID = "fc540007-236c-4c94-8fa9-944a3e5353fa";

export class EmberDevice extends BluetoothDevice {
  async setLEDColor(color: { r: number; g: number; b: number; a?: number }) {
    const buf = Buffer.alloc(4);
    buf.writeUInt8(color.r, 0); // r
    buf.writeUInt8(color.g, 1); // g
    buf.writeUInt8(color.b, 2); // b
    buf.writeUInt8(color.a ?? 255, 3); // "brightness"/alpha

    await this.writeChar(SERVICE_EMBER_UUID, LED_COLOR_UUID, buf);
  }

  async currentLedColor() {
    const value = await this.readChar(SERVICE_EMBER_UUID, LED_COLOR_UUID);
    // console.log("[led] len=%d, value='%d', buf=", buf.byteLength, currentCharge, buf);

    // parse color from buffer
    const r = value.readUint8(0);
    const g = value.readUint8(1);
    const b = value.readUint8(2);
    const a = value.readUint8(3);
    return { r, g, b, a };
  }

  async getCurrentBattery() {
    const buf = await this.readChar(SERVICE_EMBER_UUID, BATTERY_CURRENT_UUID);
    const currentCharge = buf.readUint8(0);
    const isCharging = buf.readUint8(1) === 1;
    // console.log("[battery] len=%d, value='%d', buf=", buf.byteLength, currentCharge, buf);
    return { currentCharge, isCharging };
  }

  async getCurrentTemperature() {
    const buf = await this.readChar(SERVICE_EMBER_UUID, TEMPERATURE_CURRENT_UUID);
    const value = buf.readUint16LE();
    // console.log("[current_temp] len=%d, value='%d', buf=", buf.byteLength, value, buf);
    return value;
  }

  async getTargetTemperature() {
    const buf = await this.readChar(SERVICE_EMBER_UUID, TEMPERATURE_TARGET_UUID);
    const value = buf.readUint16LE();
    // console.log("[target_temp] len=%d, value='%d', buf=", buf.byteLength, value, buf);
    return value;
  }

  async setTargetTemperature(temp: number) {
    if (temp > 80) {
      return null;
    }
    if (temp < 0) {
      temp = 0;
    }
    const convertedTemp = temp * 100;

    const buf = Buffer.alloc(2);
    buf.writeUint16LE(convertedTemp);

    await this.writeChar(SERVICE_EMBER_UUID, TEMPERATURE_TARGET_UUID, buf);
  }
}
