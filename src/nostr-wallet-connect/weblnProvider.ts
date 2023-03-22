import {
  nip04,
  relayInit,
  signEvent,
  getEventHash,
  getPublicKey,
  nip19,
  Relay,
} from 'nostr-tools';

export class WebLNProvider {
  relay: Relay;
  relayUrl: string;
  privateKey: string | undefined;
  walletPubkey: string;
  subscribers: Record<string, (payload: any) => void>;

  constructor(options: { relay: string, privateKey?: string, walletPubkey: string }) {
    this.relayUrl = options.relay;
    this.relay = relayInit(this.relayUrl);
    if (options.privateKey) {
      this.privateKey = nip19.decode(options.privateKey).data as string;
    }
    this.walletPubkey = nip19.decode(options.walletPubkey).data as string;
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

  async enable() {
    this.relay.on('connect', () => {
      console.log(`connected to ${this.relay.url}`)
    })
    await this.relay.connect();
  }

  async encrypt(pubkey: string, content: string) {
    let encrypted;
    // @ts-ignore
    if (globalThis.nostr as unknown && !this.privateKey) {
      // @ts-ignore
      encrypted = await globalThis.nostr.nip04.encrypt(pubkey, content);
    } else if (this.privateKey) {
      encrypted = await nip04.encrypt(this.privateKey, pubkey, content);
    }
    return encrypted;
  }

  async decrypt(pubkey: string, content: string) {
    let decrypted;
    // @ts-ignore
    if (globalThis.nostr as unknown && !this.privateKey) {
      // @ts-ignore
      decrypted = await globalThis.nostr.nip04.decrypt(pubkey, content);
    } else if (this.privateKey) {
      decrypted = await nip04.decrypt(this.privateKey, pubkey, content);
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

      // @ts-ignore
      if (globalThis.nostr && !this.privateKey) {
        // @ts-ignore
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
        console.error(`publish timeout: event ${event.id}`);
        reject('publish timeout');
      }
      let publishTimeoutCheck = setTimeout(publishTimeout, 2000);

      pub.on('failed', reason => {
        console.debug(`failed to publish to ${this.relay.url}: ${reason}`)
        clearTimeout(publishTimeoutCheck)
        reject("Failed to publish");
      });

      pub.on('ok', () => {
        console.debug(`event ${event.id} for ${invoice} published`);
        clearTimeout(publishTimeoutCheck);

        function replyTimeout() {
          console.error(`reply timeout: event ${event.id}`);
          reject('reply timeout');
        }
        let replyTimeoutCheck = setTimeout(replyTimeout, 60000);

        if (!this.relay) { return; } //fuck you TS
        let sub = this.relay.sub([
          {
            kinds: [23195, 23196],
            authors: [this.walletPubkey],
            "#e": [event.id],
          }
        ]);
        sub.on('event', event => {
          console.log(`received event: `, event);
          clearTimeout(replyTimeoutCheck);
          sub.unsub();
          const decryptedContent = this.decrypt(this.walletPubkey, event.content);
          // @ts-ignore
          if (event.kind == 23195) {
            resolve(decryptedContent);
            this.notify('sendPayment', event.content);
          } else {
            reject(decryptedContent);
          }
        });
      });
    });
  }
}
