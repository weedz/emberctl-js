#!/usr/bin/env node
import { EmberAdapter, EmberDevice } from "./lib/EmberBluetoothAdapter.js";

function usage(command?: string) {
  if (command === "service") {
    process.stdout.write("Usage:\n");
    process.stdout.write("  emberctl service [OPTIONS]\n\n");
    process.stdout.write("Options:\n");
    process.stdout.write("  --sway  Print colors with <span> instead of ANSI escape codes\n");
    process.stdout.write("  --interval Interval in seconds between updates\n");
  } else {
    process.stdout.write("Usage:\n");
    process.stdout.write("  emberctl [OPTIONS] <COMMAND>\n\n");
    process.stdout.write("Commands:\n");
    process.stdout.write("  on       Turn the mug on\n");
    process.stdout.write("  off      Turn the mug off\n");
    process.stdout.write("  status   Display status; battery, temperature, and target temperature\n");
    process.stdout.write("  scan     Scan for devices\n");
    process.stdout.write("  service  Start as a service for eg. waybar\n");
  }
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

export async function main(argv: string[]) {
  // parse CLI. Assume we run node
  const args = argv.slice(2);

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
        // TODO: Refactor color stuff to handle waybar/sway specific coloring (with <span>) in addition to ANSI escape codes
        const tempText = targetTemp > 0 ? `<span color="orange">${temp.toString(10)}</span>` : temp.toString(10);

        const batteryText = battery.isCharging ? `<span color="springgreen">${battery.currentCharge.toString(10)}</span>` : battery.currentCharge.toString(10);

        process.stdout.write(`${tempText}C ${batteryText}%\n`);

        await new Promise((resolve) => setTimeout(resolve, 30_000));
      }
    } else {
      usage();
    }
  } else {
    usage(args[0]);
  }
}
