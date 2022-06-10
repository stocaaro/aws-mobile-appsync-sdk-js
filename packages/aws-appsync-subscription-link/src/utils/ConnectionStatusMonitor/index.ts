import { ReachabilityMonitor } from "../ReachabilityMonitor";
import { Observable } from "@apollo/client/core";

type ConnectivityState = "connected" | "disconnected";

export type ConnectionState = {
  networkStatus: ConnectivityState;
  socketStatus: ConnectivityState | "connecting";
  intendedSocketStatus: ConnectivityState;
};

export class ConnectionStatusMonitor {
  // Socket Status is status information about the network, socket and intended socket Status
  socketStatus: ConnectionState;
  connectionStatusObservable: Observable<ConnectionState>;
  private connectionStatusObserver: ZenObservable.SubscriptionObserver<ConnectionState>;

  private subscription: ZenObservable.Subscription;
  private timeout: ReturnType<typeof setTimeout>;

  constructor() {
    this.socketStatus = {
      networkStatus: "connected",
      socketStatus: "disconnected",
      intendedSocketStatus: "disconnected",
    };

    this.connectionStatusObservable = new Observable(
      (
        socketStatusObserver: ZenObservable.SubscriptionObserver<ConnectionState>
      ) => {
        this.connectionStatusObserver = socketStatusObserver;
      }
    );

    this.subscription = ReachabilityMonitor.subscribe(({ online }) => {
      // Maintain the socket status
      this.updateSocketStatus({
        networkStatus: online ? "connected" : "disconnected",
      });
    });
  }

  unsubscribe() {
    if (this.subscription) {
      clearTimeout(this.timeout);
      this.subscription.unsubscribe();
    }
  }

  disconnected() {
    this.updateSocketStatus({ socketStatus: "disconnected" });
  }

  openingSocket() {
    this.updateSocketStatus({
      intendedSocketStatus: "connected",
      socketStatus: "connecting",
    });
  }

  disconnecting() {
    this.updateSocketStatus({
      intendedSocketStatus: "disconnected",
    });
  }

  connectionEstablished() {
    this.updateSocketStatus({
      socketStatus: "connected",
    });
  }

  private updateSocketStatus(statusUpdates: Partial<ConnectionState>) {
    // Maintain the socket status
    const newSocketStatus = { ...this.socketStatus, ...statusUpdates };
    this.socketStatus = { ...this.socketStatus, ...statusUpdates };
    if (
      newSocketStatus !== this.socketStatus &&
      this.connectionStatusObserver
    ) {
      this.connectionStatusObserver.next({ ...this.socketStatus });
    }
  }
}
