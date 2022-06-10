import {
  SubscriptionHandshakeLink,
  CONTROL_EVENTS_KEY,
} from "./subscription-handshake-link";
import { ApolloLink, Observable } from "@apollo/client/core";
import { createHttpLink } from "@apollo/client/link/http";
import { getMainDefinition } from "@apollo/client/utilities";
import { NonTerminatingLink } from "./non-terminating-link";
import type { OperationDefinitionNode } from "graphql";

import { AppSyncRealTimeSubscriptionHandshakeLink } from "./realtime-subscription-handshake-link";
import { UrlInfo } from "./types";
import { ConnectionState } from "./utils/ConnectionStatusMonitor";

type ApolloLinkWithConnectionStatus = {
  apolloLink: ApolloLink;
  connectionStatus: Observable<ConnectionState>;
};

function createSubscriptionHandshakeLinkWithConnectionState(
  args: UrlInfo
): ApolloLinkWithConnectionStatus {
  return createSubscriptionHandshakeLink(args, null, true);
}

function createSubscriptionHandshakeLink(
  args: UrlInfo,
  resultsFetcherLink: ApolloLink,
  includeConnectionStatus: true
): ApolloLinkWithConnectionStatus;
function createSubscriptionHandshakeLink(
  args: UrlInfo,
  resultsFetcherLink?: ApolloLink,
  includeConnectionStatus?: false
): ApolloLink;
function createSubscriptionHandshakeLink(
  url: string,
  resultsFetcherLink?: ApolloLink,
  includeConnectionStatus?: boolean
): ApolloLink;
function createSubscriptionHandshakeLink(
  infoOrUrl: UrlInfo | string,
  theResultsFetcherLink?: ApolloLink,
  includeConnectionStatus?: boolean
) {
  let resultsFetcherLink: ApolloLink, subscriptionLinks: ApolloLink;
  let connectionStatus: Observable<ConnectionState>;

  if (typeof infoOrUrl === "string") {
    resultsFetcherLink =
      theResultsFetcherLink || createHttpLink({ uri: infoOrUrl });
    subscriptionLinks = ApolloLink.from([
      new NonTerminatingLink("controlMessages", {
        link: new ApolloLink(
          (operation, _forward) =>
            new Observable<any>((observer) => {
              const {
                variables: {
                  [CONTROL_EVENTS_KEY]: controlEvents,
                  ...variables
                },
              } = operation;

              if (typeof controlEvents !== "undefined") {
                operation.variables = variables;
              }

              observer.next({ [CONTROL_EVENTS_KEY]: controlEvents });

              return () => {};
            })
        ),
      }),
      new NonTerminatingLink("subsInfo", { link: resultsFetcherLink }),
      new SubscriptionHandshakeLink("subsInfo"),
    ]);
  } else {
    const { url } = infoOrUrl;
    resultsFetcherLink = theResultsFetcherLink || createHttpLink({ uri: url });
    const appSyncLink = new AppSyncRealTimeSubscriptionHandshakeLink(infoOrUrl);
    subscriptionLinks = appSyncLink;
    connectionStatus = appSyncLink.connectionStatus;
  }

  const apolloLink = ApolloLink.split(
    (operation) => {
      const { query } = operation;
      const { kind, operation: graphqlOperation } = getMainDefinition(
        query
      ) as OperationDefinitionNode;
      const isSubscription =
        kind === "OperationDefinition" && graphqlOperation === "subscription";

      return isSubscription;
    },
    subscriptionLinks,
    resultsFetcherLink
  );
  if (includeConnectionStatus && connectionStatus) {
    return {
      apolloLink: apolloLink,
      connectionStatus: connectionStatus,
    };
  } else {
    return apolloLink;
  }
}

export {
  CONTROL_EVENTS_KEY,
  createSubscriptionHandshakeLink,
  createSubscriptionHandshakeLinkWithConnectionState,
};
