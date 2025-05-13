export interface IBluetoothAdapter<TDevice = unknown, TScanItem = unknown> {
  init: () => Promise<void>;
  scan: () => Promise<TScanItem>;
  connectDevice: (uuid: string) => Promise<null | TDevice>;
}

export interface IBluetoothDevice {
  init: () => Promise<void>;
  disconnect: () => Promise<void>;
  getName: () => Promise<Error | string>;
  getAlias: () => Promise<Error | string>;
  getAddress: () => Promise<string>;

  readChar: (serviceUuid: string, charUuid: string) => Promise<Buffer>;
  writeChar: (serviceUuid: string, charUuid: string, buf: Buffer) => Promise<void>;
}
