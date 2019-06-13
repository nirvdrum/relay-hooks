import { useEffect, useState, useRef, useContext } from "react";
import * as mapObject from 'fbjs/lib/mapObject';
import * as areEqual from 'fbjs/lib/areEqual';
import { RelayFeatureFlags, getFragment } from 'relay-runtime';
import { ReactRelayContext } from 'react-relay';
import { RelayContext } from 'relay-runtime/lib/RelayStoreTypes';

import { ContainerResult } from './RelayHooksType';
import {
  Disposable,
  IEnvironment,
  GraphQLTaggedNode,
  Observable,
  Observer,
  Variables,
  getFragmentOwners
} from 'relay-runtime';
import FragmentRefetch from "./FragmentRefetch";
import FragmentPagination, { ConnectionConfig } from "./FragmentPagination";

export type RefetchOptions = {
  force?: boolean,
  fetchPolicy?: 'store-or-network' | 'network-only',
};

interface FragmentResult {
  [key: string]: any,
  refetch: (taggedNode: any, refetchVariables: any, renderVariables: any, observerOrCallback: any, options: RefetchOptions) => {
      dispose(): void;
  };
  loadMore: (connectionConfig: ConnectionConfig, pageSize: number, observerOrCallback: any, options: RefetchOptions) => any;
  hasMore: () => boolean;
  isLoading: () => boolean;
  refetchConnection: (connectionConfig: ConnectionConfig, totalCount: number, callback: any, refetchVariables: any) => any;
}
export type ObserverOrCallback = Observer<void> | ((error: Error) => any);

const usePrevious = function usePrevious(value): any {
  const ref = useRef();
  if (ref.current === null || ref.current === undefined) {
    const c: any = {
      fragmentRefetch: new FragmentRefetch(),
      fragmentPagination: new FragmentPagination()
    };
    ref.current = c;
  }
  useEffect(() => {
    value.fragmentRefetch = (ref.current as any).fragmentRefetch;
    value.fragmentPagination = (ref.current as any).fragmentPagination;
    ref.current = value;
  });
  return ref.current;
}


const useFragment = function (fragmentDef, fragmentRef: any, ):FragmentResult {
  const { environment }: RelayContext = useContext(ReactRelayContext);
  const prev = usePrevious({ environment, fragmentRef });
  const [fragments, setFragments] = useState<any>(() => {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    const { getFragment: getFragmentFromTag } = environment.unstable_internal;
    return getFragmentFromTag(fragmentDef);
  });


  const [result, setResult] = useState<{ [key: string]: any }>(() => {
    return newResolver();
  });

  const { resolver } = result;

  function newResolver() {
    const {
      createFragmentSpecResolver,
    } = environment.unstable_internal;
    const res = createFragmentSpecResolver(
      {environment},
      'useFragment',
      {frag: fragments},
      {frag: fragmentRef},
    )
    res.setCallback(() => {
      const newData = resolver.resolve();
      if (result.data !== newData) {
        setResult({ resolver: resolver, data: newData })
      }
    });
    return { resolver: res, data: res.resolve() };
  }

  useEffect(() => {
    return () => {
      resolver.dispose();
      prev && prev.fragmentRefetch.dispose();
      prev && prev.fragmentPagination.dispose();
    };
  }, []);

  useEffect(() => {
    if (prev && prev.fragmentRef) {
      const { getDataIDsFromObject } = environment.unstable_internal;
      const prevIDs = getDataIDsFromObject(fragments, prev.fragmentRef);
      const nextIDs = getDataIDsFromObject(fragments, fragmentRef);
      if (prev.environment !== environment ||
        !areEqual(prevIDs, nextIDs)) {
        resolver.dispose();
        setResult(newResolver());
      } /*else {
                resolver.setProps(others);
                setResult({resolver, data: resolver.resolve()})
            }*/

    }
  }, [environment, fragmentRef]);



  return result.data && result.data.frag ? {...result.data.frag} : {};
}

export default useFragment;

/**
 * use case?
      // Otherwise, for convenience short-circuit if all non-Relay props
      // are scalar and equal
      const keys = Object.keys(nextProps);
      for (let ii = 0; ii < keys.length; ii++) {
        const key = keys[ii];
        if (key === '__relayContext') {
          if (
            nextState.prevPropsContext.environment !==
              this.state.prevPropsContext.environment ||
            nextState.prevPropsContext.variables !==
              this.state.prevPropsContext.variables
          ) {
            return true;
          }
        } else {
          if (
            !fragments.hasOwnProperty(key) &&
            !isScalarAndEqual(nextProps[key], this.props[key])
          ) {
            return true;
          }
        }
      }
 */