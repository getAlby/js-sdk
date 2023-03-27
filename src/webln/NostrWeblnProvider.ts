import {
  nip04,
  relayInit,
  signEvent,
  getEventHash,
  getPublicKey,
  nip19,
  Relay,
  Event,
  UnsignedEvent
} from 'nostr-tools';

const DEFAULT_OPTIONS = {
  relayUrl: 'wss://relay.damus.io',
  walletPubkey: '69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9' // Alby
};

interface Nostr {
  signEvent: (event: UnsignedEvent) => Promise<Event>;
  nip04: {
    decrypt: (pubkey: string, content: string) => Promise<string>;
    encrypt: (pubkey: string, content: string) => Promise<string>;
  };
}
declare global {
  var nostr: Nostr | undefined;
}

interface NostrWebLNOptions {
  relayUrl: string;
  walletPubkey: string;
  privateKey?: string;
}


export class NostrWebLNProvider {
  relay: Relay;
  relayUrl: string;
  privateKey: string | undefined;
  walletPubkey: string;
  subscribers: Record<string, (payload: any) => void>;
  connected: boolean;

  static parseWalletConnectUrl(walletConnectUrl: string) {
    walletConnectUrl = walletConnectUrl.replace('nostrwalletconnect://', 'http://'); // makes it possible to parse with URL in the different environments (browser/node/...)
    const url = new URL(walletConnectUrl);
    const options = {} as NostrWebLNOptions;
    options.walletPubkey = url.host;
    const privateKey = url.searchParams.get('secret');
    const relayUrl = url.searchParams.get('relay');
    if (privateKey) {
      options.privateKey = privateKey;
    }
    if (relayUrl) {
      options.relayUrl = relayUrl;
    }
    return options;
  }
  constructor(options: { relayUrl?: string, privateKey?: string, walletPubkey?: string, nostrWalletConnectUrl?: string }) {
    if (options.nostrWalletConnectUrl) {
      options = {
        ...NostrWebLNProvider.parseWalletConnectUrl(options.nostrWalletConnectUrl), ...options
      };
    }
    const _options = { ...DEFAULT_OPTIONS, ...options } as NostrWebLNOptions;
    this.relayUrl = _options.relayUrl;
    this.relay = relayInit(this.relayUrl);
    if (_options.privateKey) {
      this.privateKey = (_options.privateKey.toLowerCase().startsWith('nsec') ? nip19.decode(_options.privateKey).data : _options.privateKey) as string;
    }
    this.walletPubkey = (_options.walletPubkey.toLowerCase().startsWith('npub') ? nip19.decode(_options.walletPubkey).data : _options.walletPubkey) as string;
    this.subscribers = {};
    this.connected = false;
  }

  on(name: string, callback: () => void) {
    this.subscribers[name] = callback;
  }

  notify(name: string, payload?: any) {
    const callback = this.subscribers[name];
    if (callback) {
      callback(payload);
    }
  }

  async enable() {
    if (this.connected) {
      return Promise.resolve();
    }
    this.relay.on('connect', () => {
      //console.debug(`connected to ${this.relay.url}`);
      this.connected = true;
    })
    await this.relay.connect();
  }

  async encrypt(pubkey: string, content: string) {
    let encrypted;
    if (globalThis.nostr && !this.privateKey) {
      encrypted = await globalThis.nostr.nip04.encrypt(pubkey, content);
    } else if (this.privateKey) {
      encrypted = await nip04.encrypt(this.privateKey, pubkey, content);
    } else {
      throw new Error("Missing private key");
    }
    return encrypted;
  }

  async decrypt(pubkey: string, content: string) {
    let decrypted;
    if (globalThis.nostr && !this.privateKey) {
      decrypted = await globalThis.nostr.nip04.decrypt(pubkey, content);
    } else if (this.privateKey) {
      decrypted = await nip04.decrypt(this.privateKey, pubkey, content);
    } else {
      throw new Error("Missing private key");
    }
    return decrypted;
  }

  sendPayment(invoice: string) {
    return new Promise(async (resolve, reject) => {
      const encryptedInvoice = await this.encrypt(this.walletPubkey, invoice);
      let event: any = {
        kind: 23194,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', this.walletPubkey]],
        content: encryptedInvoice,
      };

      if (globalThis.nostr && !this.privateKey) {
        event = await globalThis.nostr.signEvent(event);
      } else if (this.privateKey) {
        event.pubkey = getPublicKey(this.privateKey)
        event.id = getEventHash(event)
        event.sig = signEvent(event, this.privateKey)
      } else {
        throw new Error("Missing private key");
      }

      let pub = this.relay.publish(event);

      function publishTimeout() {
        //console.error(`Publish timeout: event ${event.id}`);
        reject('Publish timeout');
      }
      let publishTimeoutCheck = setTimeout(publishTimeout, 3000);

      // @ts-ignore
      pub.on('failed', (reason) => {
        //console.debug(`failed to publish to ${this.relay.url}: ${reason}`)
        clearTimeout(publishTimeoutCheck)
        reject(`Failed to publish request: ${reason}`);
      });

      pub.on('ok', () => {
        //console.debug(`Event ${event.id} for ${invoice} published`);
        clearTimeout(publishTimeoutCheck);

        function replyTimeout() {
          //console.error(`Reply timeout: event ${event.id} `);
          reject('reply timeout');
        }
        let replyTimeoutCheck = setTimeout(replyTimeout, 60000);

        if (!this.relay) { return; } // mainly for TS
        let sub = this.relay.sub([
          {
            kinds: [23195, 23196],
            authors: [this.walletPubkey],
            "#e": [event.id],
          }
        ]);
        sub.on('event', async (event) => {
          //console.log(`Received reply event: `, event);
          clearTimeout(replyTimeoutCheck);
          sub.unsub();
          const decryptedContent = await this.decrypt(this.walletPubkey, event.content);
          // @ts-ignore // event is still unknown in nostr-tools
          if (event.kind == 23195) {
            resolve({ preimage: decryptedContent });
            this.notify('sendPayment', event.content);
          } else {
            reject({ error: decryptedContent });
          }
        });
      });
    });
  }
}
