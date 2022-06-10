import { ReachabilityMonitor } from "../ReachabilityMonitor";
import { Observable } from "@apollo/client/core";

type ConnectivityState = "connected" | "disconnected";

export type ConnectionState = {
  networkState: ConnectivityState;
  connectionState: ConnectivityState | "connecting";
  intendedConnectionState: ConnectivityState;
};

export class ConnectionStatusMonitor {
  // Socket Status is status information about the network, socket and intended socket Status
  connectionState: ConnectionState;
  private _connectionStatusObservable: Observable<ConnectionState>;
  private connectionStateObserver: ZenObservable.SubscriptionObserver<ConnectionState>;

  private subscription: ZenObservable.Subscription;
  private timeout: ReturnType<typeof setTimeout>;

  constructor() {
    this.connectionState = {
      networkState: "connected",
      connectionState: "disconnected",
      intendedConnectionState: "disconnected",
    };

    this._connectionStatusObservable = new Observable(
      (
        connectionStateObserver: ZenObservable.SubscriptionObserver<ConnectionState>
      ) => {
        connectionStateObserver.next(this.connectionState);
        this.connectionStateObserver = connectionStateObserver;
      }
    );

    this.subscription = ReachabilityMonitor.subscribe(({ online }) => {
      // Maintain the socket status
      this.updateConnectionState({
        networkState: online ? "connected" : "disconnected",
      });
    });
  }

  public get connectionStatusObservable(): Observable<ConnectionState> {
    return this._connectionStatusObservable;
  }

  private get currentConnectionStateObservable(): Observable<ConnectionState> {
    return new Observable(
      (observer: ZenObservable.SubscriptionObserver<ConnectionState>) => {
        observer.complete();
      }
    );
  }

  unsubscribe() {
    if (this.subscription) {
      clearTimeout(this.timeout);
      this.subscription.unsubscribe();
    }
  }

  disconnected() {
    this.updateConnectionState({ connectionState: "disconnected" });
  }

  openingSocket() {
    this.updateConnectionState({
      intendedConnectionState: "connected",
      connectionState: "connecting",
    });
  }

  disconnecting() {
    this.updateConnectionState({
      intendedConnectionState: "disconnected",
    });
  }

  connectionEstablished() {
    this.updateConnectionState({
      connectionState: "connected",
    });
  }

  private updateConnectionState(statusUpdates: Partial<ConnectionState>) {
    // Maintain the socket status
    const newSocketStatus = { ...this.connectionState, ...statusUpdates };
    if (
      newSocketStatus != this.connectionState &&
      this.connectionStateObserver
    ) {
      this.connectionState = { ...newSocketStatus };

      this.connectionStateObserver.next({ ...this.connectionState });
    }
  }
}
