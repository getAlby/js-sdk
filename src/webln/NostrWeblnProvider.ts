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

const NWCs: Record<string,NostrWebLNOptions> = {
  alby: {
    connectUrl: "https://nwc.getalby.com/apps/new",
    relayUrl: "wss://relay.getalby.com/v1",
    walletPubkey: '69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9'
  }
};

interface NostrWebLNOptions {
  connectUrl?: string; // the URL to the NWC interface for the user to confirm the session
  relayUrl: string;
  walletPubkey: string;
  secret?: string;
};

export class NostrWebLNProvider {
  relay: Relay;
  relayUrl: string;
  secret: string | undefined;
  walletPubkey: string;
  options: NostrWebLNOptions;
  subscribers: Record<string, (payload: any) => void>;

  static parseWalletConnectUrl(walletConnectUrl: string) {
    walletConnectUrl = walletConnectUrl.replace('nostr+walletconnect://', 'http://'); // makes it possible to parse with URL in the different environments (browser/node/...)
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

  static withNewSecret(options?: ConstructorParameters<typeof NostrWebLNProvider>[0]) {
    options = options || {};
    options.secret = generatePrivateKey();
    return new NostrWebLNProvider(options);
  }

  constructor(options?: { providerName?: string, connectUrl?: string, relayUrl?: string, secret?: string, walletPubkey?: string, nostrWalletConnectUrl?: string }) {
    if (options && options.nostrWalletConnectUrl) {
      options = {
        ...NostrWebLNProvider.parseWalletConnectUrl(options.nostrWalletConnectUrl), ...options
      };
    }
    const providerOptions = NWCs[options?.providerName || 'alby'] as NostrWebLNOptions;
    this.options = { ...providerOptions, ...(options || {}) } as NostrWebLNOptions;
    this.relayUrl = this.options.relayUrl;
    this.relay = relayInit(this.relayUrl);
    if (this.options.secret) {
      this.secret = (this.options.secret.toLowerCase().startsWith('nsec') ? nip19.decode(this.options.secret).data : this.options.secret) as string;
    }
    this.walletPubkey = (this.options.walletPubkey.toLowerCase().startsWith('npub') ? nip19.decode(this.options.walletPubkey).data : this.options.walletPubkey) as string;
    this.subscribers = {};

    // @ts-ignore
    if(globalThis.WebSocket === undefined) {
      console.error("WebSocket is undefined. Make sure to `import websocket-polyfill` for nodejs environments");
    }
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
    let url = `nostr+walletconnect://${this.walletPubkey}?relay=${this.relayUrl}&pubkey=${this.publicKey}`;
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
    if (!this.secret) {
      throw new Error('Missing secret');
    }
    const encrypted = await nip04.encrypt(this.secret, pubkey, content);
    return encrypted;
  }

  async decrypt(pubkey: string, content: string) {
    if (!this.secret) {
      throw new Error('Missing secret');
    }
    const decrypted = await nip04.decrypt(this.secret, pubkey, content);
    return decrypted;
  }

  sendPayment(invoice: string) {
    this.checkConnected();

    return new Promise(async (resolve, reject) => {
      const command = {
        "method": "pay_invoice",
        "params": {
          "invoice": invoice
        }
      };
      const encryptedCommand = await this.encrypt(this.walletPubkey, JSON.stringify(command));
      let event: any = {
        kind: 23194,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', this.walletPubkey]],
        content: encryptedCommand,
      };

      event.pubkey = this.publicKey;
      event.id = this.getEventHash(event);
      event.sig = this.signEvent(event);

      // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
      // that reference the request event (NIP_47_REQUEST_KIND)
      let sub = this.relay.sub([
        {
          kinds: [23195, 23196],
          authors: [this.walletPubkey],
          "#e": [event.id],
        }
      ]);

      function replyTimeout() {
        sub.unsub();
        //console.error(`Reply timeout: event ${event.id} `);
        reject(`reply timeout: event ${event.id}`);
      }

      let replyTimeoutCheck = setTimeout(replyTimeout, 60000);

      sub.on('event', async (event) => {
        //console.log(`Received reply event: `, event);
        clearTimeout(replyTimeoutCheck);
        sub.unsub();
        const decryptedContent = await this.decrypt(this.walletPubkey, event.content);
        const response = JSON.parse(decryptedContent);
        // @ts-ignore // event is still unknown in nostr-tools
        if (event.kind == 23195 && response.result?.preimage) {
          resolve({ preimage: response.result.preimage });
          this.notify('sendPayment', event.content);
        } else {
          reject({ error: response.error?.message });
        }
      });

      let pub = this.relay.publish(event);

      function publishTimeout() {
        //console.error(`Publish timeout: event ${event.id}`);
        reject({ error: `Publish timeout: event ${event.id}` });
      }
      let publishTimeoutCheck = setTimeout(publishTimeout, 5000);

      pub.on('failed', (reason: unknown) => {
        //console.debug(`failed to publish to ${this.relay.url}: ${reason}`)
        clearTimeout(publishTimeoutCheck)
        reject({ error: `Failed to publish request: ${reason}` });
      });

      pub.on('ok', () => {
        //console.debug(`Event ${event.id} for ${invoice} published`);
        clearTimeout(publishTimeoutCheck);
      });
    });
  }

  getConnectUrl(options: { name?: string, returnTo?: string }) {
    if (!this.options.connectUrl) {
      throw new Error("Missing connectUrl option");
    }
    const url = new URL(this.options.connectUrl);
    if (options?.name) {
      url.searchParams.set('c', options?.name);
    }
    url.searchParams.set('pubkey', this.publicKey);
    if (options?.returnTo) {
      url.searchParams.set('returnTo', options.returnTo);
    }
    return url;
  }

  initNWC(options: { name?: string, returnTo?: string } = {}) {
    // here we assume an browser context and window/document is available
    // we set the location.host as a default name if none is given
    if (!options.name) {
      options.name = document.location.host;
    }
    const url = this.getConnectUrl(options);
    const height = 600;
    const width = 400;
    const top = window.outerHeight / 2 + window.screenY - height / 2;
    const left = window.outerWidth / 2 + window.screenX - width / 2;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        url.toString(),
        `${document.title} - Wallet Connect`,
        `height=${height},width=${width},top=${top},left=${left}`
      );
      if (!popup) { reject(); return; } // only for TS?

      const checkForPopup = () => {
        if (popup && popup.closed) {
          reject();
          clearInterval(popupChecker);
          window.removeEventListener('message', onMessage);
        }
      };

      const onMessage = (message: { data: any, origin: string }) => {
        const data = message.data;
        if (data && data.type === 'nwc:success' && message.origin === `${url.protocol}//${url.host}`) {
          resolve(data);
          clearInterval(popupChecker);
          window.removeEventListener('message', onMessage);
          if (popup) {
            popup.close(); // close the popup
          }
        }
      };
      const popupChecker = setInterval(checkForPopup, 500);
      window.addEventListener('message', onMessage);
    });
  }

  private checkConnected() {
    if (!this.connected) {
      throw new Error("please call enable() and await the promise before calling this function")
    }
  }
}
