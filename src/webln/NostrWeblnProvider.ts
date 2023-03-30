import {
  nip04,
  relayInit,
  signEvent,
  getEventHash,
  nip19,
  generatePrivateKey,
  getPublicKey,
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
  secret?: string;
}


export class NostrWebLNProvider {
  relay: Relay;
  relayUrl: string;
  secret: string | undefined;
  walletPubkey: string;
  subscribers: Record<string, (payload: any) => void>;

  static parseWalletConnectUrl(walletConnectUrl: string) {
    walletConnectUrl = walletConnectUrl.replace('nostrwalletconnect://', 'http://'); // makes it possible to parse with URL in the different environments (browser/node/...)
    const url = new URL(walletConnectUrl);
    const options = {} as NostrWebLNOptions;
    options.walletPubkey = url.host;
    const secret = url.searchParams.get('secret');
    const relayUrl = url.searchParams.get('relay');
    if (secret) {
      options.secret = secret;
    }
    if (relayUrl) {
      options.relayUrl = relayUrl;
    }
    return options;
  }

  static withNewSecret(options: { relayUrl?: string, secret?: string, walletPubkey?: string, nostrWalletConnectUrl?: string } = {}) {
    options.secret = generatePrivateKey();
    return new NostrWebLNProvider(options);
  }

  constructor(options: { relayUrl?: string, secret?: string, walletPubkey?: string, nostrWalletConnectUrl?: string }) {
    if (options && options.nostrWalletConnectUrl) {
      options = {
        ...NostrWebLNProvider.parseWalletConnectUrl(options.nostrWalletConnectUrl), ...options
      };
    }
    const _options = { ...DEFAULT_OPTIONS, ...options } as NostrWebLNOptions;
    this.relayUrl = _options.relayUrl;
    this.relay = relayInit(this.relayUrl);
    if (_options.secret) {
      this.secret = (_options.secret.toLowerCase().startsWith('nsec') ? nip19.decode(_options.secret).data : _options.secret) as string;
    }
    this.walletPubkey = (_options.walletPubkey.toLowerCase().startsWith('npub') ? nip19.decode(_options.walletPubkey).data : _options.walletPubkey) as string;
    this.subscribers = {};
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

  getNostrWalletConnectUrl(includeSecret = false) {
    let url = `nostrwalletconnect://${this.walletPubkey}?relay=${this.relayUrl}&pubkey=${this.publicKey}`;
    if (includeSecret) {
      url = `${url}&secret=${this.secret}`;
    }
    return url;
  }

  get nostrWalletConnectUrl() {
    return this.getNostrWalletConnectUrl();
  }

  get connected() {
    return this.relay.status === 1;
  }

  get publicKey() {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    return getPublicKey(this.secret);
  }

  signEvent(event: Event) {
    if (!this.secret) {
      throw new Error("Missing secret key");
    }
    return signEvent(event, this.secret)
  }

  getEventHash(event: Event) {
    return getEventHash(event);
  }

  async enable() {
    if (this.connected) {
      return Promise.resolve();
    }
    await this.relay.connect();
  }

  close() {
    return this.relay.close();
  }

  async encrypt(pubkey: string, content: string) {
    let encrypted;
    if (globalThis.nostr && !this.secret) {
      encrypted = await globalThis.nostr.nip04.encrypt(pubkey, content);
    } else if (this.secret) {
      encrypted = await nip04.encrypt(this.secret, pubkey, content);
    } else {
      throw new Error("Missing secret key");
    }
    return encrypted;
  }

  async decrypt(pubkey: string, content: string) {
    let decrypted;
    if (globalThis.nostr && !this.secret) {
      decrypted = await globalThis.nostr.nip04.decrypt(pubkey, content);
    } else if (this.secret) {
      decrypted = await nip04.decrypt(this.secret, pubkey, content);
    } else {
      throw new Error("Missing secret key");
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

      if (globalThis.nostr && !this.secret) {
        event = await globalThis.nostr.signEvent(event);
      } else if (this.secret) {
        event.pubkey = this.publicKey;
        event.id = this.getEventHash(event);
        event.sig = this.signEvent(event);
      } else {
        throw new Error("Missing secret key");
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
