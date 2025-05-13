import NodeBle, { createBluetooth } from "node-ble";

export class BluetoothDevice {
  #device: NodeBle.Device;
  #gatt: NodeBle.GattServer | null = null;
  constructor(device: NodeBle.Device) {
    this.#device = device;
  }

  async init() {
    this.#gatt = await this.#device.gatt();
  }
  async disconnect() {
    await this.#device.disconnect();
  }

  async getName(): Promise<string | Error> {
    try {
      return this.#device.getName();
    } catch (err) {
      if (err instanceof Error) {
        return err;
      }
      return new Error("[device.getName()] unknown error");
    }
  }
  async getAlias(): Promise<string | Error> {
    try {
      return this.#device.getAlias();
    } catch (err) {
      if (err instanceof Error) {
        return err;
      }
      return new Error("[device.getAlias()] unknown error");
    }
  }

  async readChar(serviceUuid: string, charUuid: string) {
    if (!this.#gatt) {
      throw new Error("gatt server must be initialized with 'device.init()'");
    }
    const service = await this.#gatt.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(charUuid);

    const value = await char.readValue();
    return value;
  }
  async writeChar(serviceUuid: string, charUuid: string, buf: Buffer) {
    if (!this.#gatt) {
      throw new Error("gatt server must be initialized with 'device.init()'");
    }
    const service = await this.#gatt.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(charUuid);
    await char.writeValueWithoutResponse(buf);
  }
}

export class BluetoothAdapter {
  #bt: {
    destroy: () => void;
    bluetooth: NodeBle.Bluetooth;
  };
  #adapter: NodeBle.Adapter | null = null;

  constructor() {
    this.#bt = createBluetooth();
  }
  [Symbol.dispose]() {
    console.log("[bluetooth] dispose");
    this.#bt.destroy();
  }
  async init() {
    this.#adapter = await this.#bt.bluetooth.defaultAdapter();
  }

  async scan() { }

  async connectDevice(uuid: string) {
    if (!this.#adapter) {
      throw new Error("adapter must be initialized with 'adapter.init()'");
    }
    const device = await this.#adapter.waitDevice(uuid);
    if (!device) {
      return null;
    }
    await device.connect();
    return device;
  }
}
