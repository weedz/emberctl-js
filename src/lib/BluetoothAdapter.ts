import NodeBle, { createBluetooth } from "node-ble";
import type { IBluetoothAdapter, IBluetoothDevice } from "./types.js";

const _S_name = Symbol("device name");
const _S_address = Symbol("device address");

export class BluetoothDevice implements IBluetoothDevice {
  device: NodeBle.Device;
  gatt: NodeBle.GattServer | null = null;

  [_S_name]: null | string = null;
  [_S_address]: null | string = null;

  constructor(device: NodeBle.Device) {
    this.device = device;
  }

  async init() {
    this.gatt = await this.device.gatt();
  }
  async disconnect() {
    await this.device.disconnect();
  }

  async getName(): Promise<string | Error> {
    if (!this[_S_name]) {
      try {
        this[_S_name] = await this.device.getName();
      } catch (err) {
        if (err instanceof Error) {
          return err;
        }
        return new Error("[device.getName()] unknown error");
      }
    }
    return this[_S_name];
  }
  async getAlias(): Promise<string | Error> {
    try {
      return await this.device.getAlias();
    } catch (err) {
      if (err instanceof Error) {
        return err;
      }
      return new Error("[device.getAlias()] unknown error");
    }
  }
  async getAddress() {
    if (!this[_S_address]) {
      this[_S_address] = await this.device.getAddress();
    }
    return this[_S_address];
  }

  async readChar(serviceUuid: string, charUuid: string) {
    if (!this.gatt) {
      throw new Error("gatt server must be initialized with 'device.init()' before 'readChar()'");
    }
    const service = await this.gatt.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(charUuid);

    const value = await char.readValue();
    return value;
  }
  async writeChar(serviceUuid: string, charUuid: string, buf: Buffer) {
    if (!this.gatt) {
      throw new Error("gatt server must be initialized with 'device.init()' before 'writeChar()'");
    }
    const service = await this.gatt.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(charUuid);
    await char.writeValueWithoutResponse(buf);
  }
}

export class BluetoothAdapter implements IBluetoothAdapter<NodeBle.Device, BluetoothDevice[]> {
  #bt: {
    destroy: () => void;
    bluetooth: NodeBle.Bluetooth;
  };
  adapter: NodeBle.Adapter | null = null;

  constructor() {
    this.#bt = createBluetooth();
  }
  [Symbol.dispose]() {
    console.log("[bluetooth] dispose");
    this.#bt.destroy();
  }
  async init() {
    this.adapter = await this.#bt.bluetooth.defaultAdapter();
  }

  async scan(timeout: number = 0) {
    if (!this.adapter) {
      throw new Error("adapter must be initialized with 'adapter.init()'");
    }
    if (!await this.adapter.isDiscovering()) {
      await this.adapter.startDiscovery();
    }

    await new Promise((resolve) => setTimeout(resolve, timeout));

    const uuids = await this.adapter.devices();
    return await Promise.all(uuids.map(async uuid => new BluetoothDevice(await this.adapter!.waitDevice(uuid))));
  }

  async connectDeviceUuid(uuid: string) {
    if (!this.adapter) {
      throw new Error("adapter must be initialized with 'adapter.init()'");
    }
    const device = await this.adapter.waitDevice(uuid);
    if (!device) {
      return null;
    }
    await device.connect();
    return device;
  }
  async connectDevice(device: NodeBle.Device) {
    await device.connect();
    return device;
  }
}
