import { createLibp2p } from "libp2p"
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import * as cbor from "cbor"
import * as multibase from 'multibase';
import { Connection, Stream } from "@libp2p/interface/connection";
import { Uint8ArrayList } from "uint8arraylist";
import { pipe } from "it-pipe";
import { BaseCode, BaseName } from "multibase";
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import * as smt from "scionic-merkletree"
import { DagLeaf } from "scionic-merkletree"
import { DownloadMessage, DownloadV1, ResponseMessage, UploadMessage } from "./types";
export * from './types'

export const Clients: { [key: string]: any } = {}

export async function Connect(ip: string, port: string, publicKey: string): Promise<{ connection: any, libp2p: any, address: Multiaddr }> {
  const libp2p = await createLibp2p({
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()]
  })

  await libp2p.start()

  const address = multiaddr("/ip4/" + ip + "/tcp/" + port + "/p2p/" + publicKey)

  const connection = await libp2p.dial(address)

  Clients[publicKey] = connection

  return { connection, libp2p, address }
}

export function Disconnect(publicKey: string) {
  const client = GetClient(publicKey)

  if (client != null) {
    client.close()
  }
}

export function GetClient(publicKey: string): Connection {
  if (Clients[publicKey] != null) {
    return Clients[publicKey]
  }

  return null
}

export async function OpenStream(publicKey: string, protocol: string): Promise<Stream> {
  const client = GetClient(publicKey)

  if (client == null) {
    return null
  }

  const stream = client.newStream(protocol)

  return stream
}

export function UploadDag(publicKey: string, dag: any) {

}

export async function DownloadDag(publicKey: string, root: string): Promise<any> {
  const stream = await OpenStream(publicKey, DownloadV1)

  if (stream == null) {
    return null
  }

  const builder = smt.CreateDagBuilder()

  const downloadMessage: DownloadMessage = {
    Root: root, Label: null, Hash: null, Range: null
  }

  await WriteToStream(stream, downloadMessage)

  const message = await ReadFromStream<UploadMessage>(stream)

  const { codeOrName } = DecodeString(message.Root)

  // VerifyRootLeaf

  const parentLeaf = builder.Leafs[message.Parent]

  smt.AddLeaf(builder, message.Leaf, codeOrName, parentLeaf)

  await WriteResponseToStream(stream, true)

  while (true) {
    const message = await ReadFromStream<UploadMessage>(stream)

    if (message == null) {
      break;
    }

    const encodingPrefix = message.Root.charAt(0) as BaseCode

    // VerifyRootLeaf

    const parentLeaf = builder.Leafs[message.Parent]

    if (message.Branch != null) {
      // Verify Branch
    }

    smt.AddLeaf(builder, message.Leaf, encodingPrefix, parentLeaf)

    await WriteResponseToStream(stream, true)
  }

  // Build Dag

  // Verify Dag

  return null
}

function DecodeString(data: string): { decodedData: Uint8Array, codeOrName: BaseCode | BaseName } {
  const codeOrName = data.charAt(0) as BaseCode
  const decodedData = multibase.decode(data)

  const textDecoder = new TextDecoder('utf-8');
  const decodedString = textDecoder.decode(decodedData);

  return { decodedData, codeOrName }
}

export async function WriteToStream(stream: Stream, data: any) {
  const encodedData = cbor.encode(data);

  await pipe(
    [encodedData],
    stream.sink
  );
}

export async function ReadFromStream<T>(stream: Stream): Promise<T> {
  for await (const chunk of stream.source) {
    if (chunk.length == 0) {
      return null
    }

    const uint8ArrayChunk = chunk instanceof Uint8ArrayList ? concatUint8ArrayList(chunk) : chunk;

    try {
      const data = cbor.decode(uint8ArrayChunk) as T;

      return data;
    } catch {
      return null
    }
  }
}

export async function WriteResponseToStream(stream: Stream, response: boolean) {
  const responseMessage: ResponseMessage = { Ok: response }

  await WriteToStream(stream, responseMessage)
}

function concatUint8ArrayList(list: Uint8ArrayList): Uint8Array {
  return list.subarray(0, list.length);
}