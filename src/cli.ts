#!/usr/bin/env node
import { EmberAdapter, EmberDevice } from "./lib/EmberBluetoothAdapter.js";

function usage() {
  process.stdout.write("Usage:\n");
  process.stdout.write("  emberctl <command>\n\n");
  process.stdout.write("Commands:\n");
  process.stdout.write("  on      Turn the mug on\n");
  process.stdout.write("  off     Turn the mug off\n");
  process.stdout.write("  status  Display status; battery, temperature, and target temperature\n");
  process.stdout.write("  scan    Scan for devices\n");
}

const OUR_DEVICE_ID = "D0:E5:89:19:16:90";

async function initDevice(uuid: string) {
  process.stdout.write("Connecting to device...\n");
  const adapter = new EmberAdapter();
  await adapter.init();

  const device = await adapter.connectDeviceUuid(uuid);
  if (!device) {
    throw new Error("could not connect to device");
  }
  const ember = new EmberDevice(device);
  await ember.init();

  return { adapter, ember };
}

export async function main() {

  // parse CLI. Assume we run node
  const args = process.argv.slice(2);

  if (args.length === 1) {
    if (args[0] === "on") {
      const device = await initDevice(OUR_DEVICE_ID);
      using _adapter = device.adapter;
      const ember = device.ember;

      await ember.setTargetTemperature(56);
      const { 0: currentTemp, 1: targetTemp } = await Promise.all([
        ember.getCurrentTemperature(),
        ember.getTargetTemperature(),
      ]);
      process.stdout.write(`device: ${OUR_DEVICE_ID}\n`);
      process.stdout.write(`  Current temperature: ${currentTemp}\n`);
      process.stdout.write(`  Target temperature: ${targetTemp}\n`);
    } else if (args[0] === "off") {
      const device = await initDevice(OUR_DEVICE_ID);
      using _adapter = device.adapter;
      const ember = device.ember;

      await ember.setTargetTemperature(0);
      const { 0: currentTemp, 1: targetTemp } = await Promise.all([
        ember.getCurrentTemperature(),
        ember.getTargetTemperature(),
      ]);
      process.stdout.write(`device: ${OUR_DEVICE_ID}\n`);
      process.stdout.write(`  Current temperature: ${currentTemp}\n`);
      process.stdout.write(`  Target temperature: ${targetTemp}\n`);
    } else if (args[0] === "status") {
      const device = await initDevice(OUR_DEVICE_ID);
      using _adapter = device.adapter;
      const ember = device.ember;

      const {
        0: battery,
        1: led,
        2: currentTemp,
        3: targetTemp,
      } = await Promise.all([
        ember.getCurrentBattery(),
        ember.currentLedColor(),
        ember.getCurrentTemperature(),
        ember.getTargetTemperature(),
      ]);

      process.stdout.write(`device: ${OUR_DEVICE_ID}\n`);
      process.stdout.write(`  Battery: ${battery.currentCharge}%${battery.isCharging ? " charging" : ""}\n`);
      process.stdout.write(`  LED color: r:${led.r} g:${led.g} b:${led.b} a:${led.a}\n`);
      process.stdout.write(`  Current temperature: ${currentTemp}\n`);
      process.stdout.write(`  Target temperature: ${targetTemp}\n`);
    } else if (args[0] === "scan") {
      using adapter = new EmberAdapter();
      await adapter.init();

      process.stdout.write("Scanning...\n");
      const devices = await adapter.scan(3000);
      for (const device of devices) {
        const name = await device.getName().then(name => name instanceof Error ? "unknown name" : name);
        const paired = await device.device.isPaired();
        const rssi = await device.getRSSI().then(rssi => rssi instanceof Error ? "no RSSI available" : rssi);
        const address = await device.getAddress();
        process.stdout.write(`${address} - ${name} (${rssi}) Paired: ${paired}\n`);
      }
    } else if (args[0] === "service") {
      const device = await initDevice(OUR_DEVICE_ID);
      using _adapter = device.adapter;
      const ember = device.ember;

      while (true) {
        const {
          0: battery,
          1: currentTemp,
          2: targetTemp,
        } = await Promise.all([
          ember.getCurrentBattery(),
          ember.getCurrentTemperature(),
          ember.getTargetTemperature(),
        ]);

        const temp = Math.round(currentTemp / 10) / 10;
        const tempText = targetTemp > 0 ? `\x1b[93m${temp.toString(10)}\x1b[0m` : temp.toString(10);

        const batteryText = battery.isCharging ? `\x1b[92m${battery.currentCharge.toString(10)}\x1b[0m` : battery.currentCharge.toString(10);

        process.stdout.write(`${tempText}C ${batteryText}%\n`);

        await new Promise((resolve) => setTimeout(resolve, 30_000));
      }
    } else {
      usage();
    }
  } else {
    usage();
  }
}
